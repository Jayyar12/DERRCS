/**
 * DERRCS Incidents Routes
 * POST   /api/v1/incidents/:id/assign            — Assign a unit to an incident (Dispatcher)
 * PATCH  /api/v1/assignments/:id/status          — Toggle assignment to OnScene (ResponseUnit)
 * POST   /api/v1/incidents/:id/field-assessment  — Submit pre-hospital care report (ResponseUnit)
 */

const express = require('express');
const { query, pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const stateMachine = require('../services/stateMachine');

const router = express.Router();

/**
 * @route  GET /api/v1/incidents
 * @desc   Lists incidents for dispatcher/admin dashboard bootstrap.
 * @access Dispatcher, Admin
 */
router.get('/', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  const status = req.query.status;
  const allowedStatuses = ['Reported', 'Validated', 'Dispatched', 'Active', 'Resolved', 'Closed'];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid incident status filter.' }
    });
  }

  try {
    const result = await query(
      `SELECT i.id, i.incident_code, i.emergency_type, i.severity, i.status,
              i.escalation_level, i.created_at, i.validated_at, i.dispatched_at,
              i.resolved_at, i.closed_at, ST_AsGeoJSON(i.location)::json AS location,
              ic.cluster_label, ic.report_count
       FROM incidents i
       LEFT JOIN incident_candidates ic ON ic.id = i.candidate_id
       WHERE ($1::text IS NULL OR i.status = $1)
       ORDER BY i.created_at DESC`,
      [status || null]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Incidents] List error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch incidents.' }
    });
  }
});

/**
 * @route  GET /api/v1/incidents/:incidentId
 * @desc   Fetches incident details, assignments, reports, assessment, and latest handover.
 * @access Dispatcher, Admin
 */
router.get('/:incidentId', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  const { incidentId } = req.params;
  try {
    const [incidentResult, assignmentsResult, reportsResult, assessmentsResult] = await Promise.all([
      query(
        `SELECT i.*, ST_AsGeoJSON(i.location)::json AS location_geojson,
                s.content AS handover_summary, s.is_fallback AS handover_is_fallback
         FROM incidents i
         LEFT JOIN LATERAL (
           SELECT content, is_fallback FROM summaries
           WHERE incident_id = i.id AND summary_type = 'HandoverDebrief'
           ORDER BY version DESC LIMIT 1
         ) s ON true
         WHERE i.id = $1`,
        [incidentId]
      ),
      query(
        `SELECT a.*, ru.unit_code, ru.unit_type, ru.current_status, u.full_name AS responder_name
         FROM assignments a
         JOIN response_units ru ON ru.id = a.unit_id
         LEFT JOIN users u ON u.id = ru.user_id
         WHERE a.incident_id = $1 ORDER BY a.assigned_at DESC`,
        [incidentId]
      ),
      query(
        `SELECT id, description, photo_url, standardized_answers, created_at
         FROM reports WHERE incident_id = $1 ORDER BY created_at ASC`,
        [incidentId]
      ),
      query(
        `SELECT * FROM field_assessments WHERE incident_id = $1 ORDER BY created_at DESC`,
        [incidentId]
      )
    ]);

    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident not found.' } });
    }
    return res.status(200).json({
      success: true,
      data: {
        ...incidentResult.rows[0],
        assignments: assignmentsResult.rows,
        reports: reportsResult.rows,
        assessments: assessmentsResult.rows
      }
    });
  } catch (err) {
    console.error('[Incidents] Detail error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch incident details.' } });
  }
});

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


    // Transition Validated -> Dispatched via state machine (writes activity_log atomically)
    await stateMachine.transition(incidentId, 'Dispatched', req.user.userId, { client });

    // Mark unit as Assigned
    await client.query(
      `UPDATE response_units SET current_status = 'Assigned', updated_at = NOW() WHERE id = $1`,
      [responseUnitId]
    );

    await client.query('COMMIT');

    // Publish unit.assigned event for the real-time responder dispatch alert
    const { publishEvent } = require('../config/rabbitmq');
    publishEvent('unit.assigned', {
      assignmentId: assignmentResult.rows[0].id,
      incidentId,
      unitId: responseUnitId,
      assignedBy: req.user.userId,
      assignedAt: assignmentResult.rows[0].assigned_at,
      notes: notes || null
    });

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
    if (err.name === 'InvalidStateTransitionError') {
      return res.status(422).json({
        success: false,
        error: {
          code:         'INVALID_STATE_TRANSITION',
          message:      err.message,
          currentState: err.currentState,
          targetState:  err.targetState,
        }
      });
    }
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

    // Validate that this response unit owns the assignment for this incident.
    const assignmentResult = await client.query(
      `SELECT a.id, a.status FROM assignments a
       JOIN response_units ru ON ru.id = a.unit_id
       WHERE a.id = $1 AND a.incident_id = $2 AND ru.user_id = $3 FOR UPDATE`,
      [assignmentId, incidentId, req.user.userId]
    );
    if (assignmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found for this response unit and incident.' }
      });
    }

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


    // Transition Active -> Resolved via state machine.
    // field_assessment row is already inserted above — satisfies CONTEXT.md §4 requirement.
    await stateMachine.transition(incidentId, 'Resolved', req.user.userId, { client });

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
    if (err.name === 'InvalidStateTransitionError') {
      return res.status(422).json({
        success: false,
        error: {
          code:         'INVALID_STATE_TRANSITION',
          message:      err.message,
          currentState: err.currentState,
          targetState:  err.targetState,
        }
      });
    }
    console.error('[FieldAssessment] Submit error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to submit field assessment.' }
    });
  } finally {
    client.release();
  }
});

/**
 * @route  POST /api/v1/incidents/:incidentId/close
 * @desc   Closes a Resolved incident after dispatcher/admin review.
 * @access Dispatcher, Admin
 */
router.post('/:incidentId/close', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  const { incidentId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const incidentResult = await client.query('SELECT id FROM incidents WHERE id = $1 FOR UPDATE', [incidentId]);
    if (incidentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident not found.' } });
    }
    const incident = await stateMachine.transition(incidentId, 'Closed', req.user.userId, { client });
    await client.query('COMMIT');
    return res.status(200).json({ success: true, data: { incidentId: incident.id, status: incident.status, closedAt: incident.closed_at } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.name === 'InvalidStateTransitionError') {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_STATE_TRANSITION', message: err.message, currentState: err.currentState, targetState: err.targetState }
      });
    }
    console.error('[Incidents] Close error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to close incident.' } });
  } finally {
    client.release();
  }
});

module.exports = router;
