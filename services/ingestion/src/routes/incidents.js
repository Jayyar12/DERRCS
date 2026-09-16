/**
 * DERRCS Incidents Routes
 * POST   /api/v1/incidents/:id/assign            — Assign a unit to an incident (Dispatcher)
 * PATCH  /api/v1/assignments/:id/status          — Toggle assignment to OnScene (ResponseUnit)
 * POST   /api/v1/incidents/:id/field-assessment  — Submit pre-hospital care report (ResponseUnit)
 */

const express = require('express');
const { query, pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route  POST /api/v1/incidents/:incidentId/assign
 * @desc   Assigns an available response unit to a Validated incident. Transitions to Dispatched.
 * @access Dispatcher
 */
router.post('/:incidentId/assign', authenticate, authorize('Dispatcher'), async (req, res) => {
  const { incidentId } = req.params;
  const { responseUnitId, notes } = req.body;

  if (!responseUnitId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'responseUnitId is required.' }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate incident state
    const incidentResult = await client.query(
      `SELECT id, status FROM incidents WHERE id = $1 FOR UPDATE`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found.' }
      });
    }

    if (incidentResult.rows[0].status !== 'Validated') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Incident must be in Validated state to assign units. Current: ${incidentResult.rows[0].status}.`
        }
      });
    }

    // Validate unit availability
    const unitResult = await client.query(
      `SELECT id, current_status FROM response_units WHERE id = $1 FOR UPDATE`,
      [responseUnitId]
    );

    if (unitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Response unit not found.' }
      });
    }

    if (unitResult.rows[0].current_status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'UNIT_UNAVAILABLE',
          message: `Unit is not available. Current status: ${unitResult.rows[0].current_status}.`
        }
      });
    }

    // Insert assignment record
    const assignmentResult = await client.query(
      `INSERT INTO assignments (incident_id, unit_id, assigned_by, status)
       VALUES ($1, $2, $3, 'Dispatched')
       RETURNING id, assigned_at`,
      [incidentId, responseUnitId, req.user.userId]
    );

    // Transition incident to Dispatched
    await client.query(
      `UPDATE incidents SET status = 'Dispatched', dispatched_at = NOW() WHERE id = $1`,
      [incidentId]
    );

    // Mark unit as Assigned
    await client.query(
      `UPDATE response_units SET current_status = 'Assigned', updated_at = NOW() WHERE id = $1`,
      [responseUnitId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        assignmentId: assignmentResult.rows[0].id,
        incidentId,
        responseUnitId,
        status: 'Dispatched',
        assignedAt: assignmentResult.rows[0].assigned_at,
        notes: notes || null
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Incidents] Assign error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign unit.' }
    });
  } finally {
    client.release();
  }
});

/**
 * @route  PATCH /api/v1/assignments/:assignmentId/status
 * @desc   Responder toggles assignment to OnScene. Transitions incident to Active.
 * @access ResponseUnit
 */
router.patch('/assignments/:assignmentId/status', authenticate, authorize('ResponseUnit'), async (req, res) => {
  const { assignmentId } = req.params;
  const { status } = req.body;

  if (status !== 'OnScene') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Only "OnScene" status is accepted here.' }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignResult = await client.query(
      `SELECT a.id, a.incident_id, a.status FROM assignments a WHERE a.id = $1 FOR UPDATE`,
      [assignmentId]
    );

    if (assignResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found.' }
      });
    }

    const assignment = assignResult.rows[0];

    if (assignment.status !== 'Dispatched' && assignment.status !== 'Acknowledged') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot set OnScene from current status: ${assignment.status}.`
        }
      });
    }

    // Update assignment status and arrival time
    await client.query(
      `UPDATE assignments SET status = 'OnScene', arrived_at = NOW() WHERE id = $1`,
      [assignmentId]
    );

    // Transition incident to Active
    await client.query(
      `UPDATE incidents SET status = 'Active' WHERE id = $1`,
      [assignment.incident_id]
    );

    // Update unit status to OnScene
    await client.query(
      `UPDATE response_units SET current_status = 'OnScene', updated_at = NOW()
       WHERE id = (SELECT unit_id FROM assignments WHERE id = $1)`,
      [assignmentId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        assignmentId,
        status: 'OnScene',
        arrivedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Assignments] Status update error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update assignment status.' }
    });
  } finally {
    client.release();
  }
});

/**
 * @route  POST /api/v1/incidents/:incidentId/field-assessment
 * @desc   Stores the pre-hospital care report. Requires incident to be Active.
 *         Transitions incident to Resolved after saving the assessment.
 * @access ResponseUnit
 */
router.post('/:incidentId/field-assessment', authenticate, authorize('ResponseUnit'), async (req, res) => {
  const { incidentId } = req.params;
  const {
    assignmentId,
    patientName,
    approximateAge,
    gender,
    consciousnessLevel,
    injuriesObserved,
    interventionsRendered,
    disposition,
    destinationFacility,
    notes
  } = req.body;

  if (!assignmentId || !disposition) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'assignmentId and disposition are required.' }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate incident is Active
    const incidentResult = await client.query(
      `SELECT id, status FROM incidents WHERE id = $1 FOR UPDATE`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found.' }
      });
    }

    if (incidentResult.rows[0].status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Incident must be Active to submit a field assessment. Current: ${incidentResult.rows[0].status}.`
        }
      });
    }

    // Insert field assessment record
    const assessmentResult = await client.query(
      `INSERT INTO field_assessments
         (incident_id, assignment_id, responder_id, patient_name, approximate_age, gender,
          consciousness_level, injuries_observed, interventions_rendered, disposition,
          destination_facility, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, created_at`,
      [
        incidentId,
        assignmentId,
        req.user.userId,
        patientName || null,
        approximateAge || null,
        gender || null,
        consciousnessLevel || null,
        injuriesObserved || null,
        interventionsRendered || null,
        disposition,
        destinationFacility || null,
        notes || null
      ]
    );

    // Transition incident to Resolved (requires valid field_assessment — enforced above)
    await client.query(
      `UPDATE incidents SET status = 'Resolved', resolved_at = NOW() WHERE id = $1`,
      [incidentId]
    );

    // Mark assignment as Completed and unit back to Available
    await client.query(
      `UPDATE assignments SET status = 'Completed', completed_at = NOW() WHERE id = $1`,
      [assignmentId]
    );

    await client.query(
      `UPDATE response_units SET current_status = 'Available', updated_at = NOW()
       WHERE id = (SELECT unit_id FROM assignments WHERE id = $1)`,
      [assignmentId]
    );

    await client.query('COMMIT');

    // Publish field.assessment.submitted event for the summarizer worker
    const { publishEvent } = require('../config/rabbitmq');
    publishEvent('field.assessment.submitted', {
      assessmentId: assessmentResult.rows[0].id,
      incidentId,
      assignmentId,
      responderId: req.user.userId,
      disposition,
      submittedAt: assessmentResult.rows[0].created_at,
    });

    return res.status(201).json({
      success: true,
      data: {
        assessmentId: assessmentResult.rows[0].id,
        incidentId,
        incidentStatus: 'Resolved',
        createdAt: assessmentResult.rows[0].created_at
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FieldAssessment] Submit error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to submit field assessment.' }
    });
  } finally {
    client.release();
  }
});

module.exports = router;
