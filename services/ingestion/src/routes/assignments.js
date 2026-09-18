/**
 * DERRCS Assignments Route
 * PATCH /api/v1/assignments/:assignmentId/status — Responder toggles assignment to OnScene (Transitions incident to Active)
 */

const express = require('express');
const { pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const stateMachine = require('../services/stateMachine');

const router = express.Router();

/**
 * @route  GET /api/v1/assignments/current
 * @desc   Returns the caller's current dispatch with incident information.
 * @access ResponseUnit
 */
router.get('/current', authenticate, authorize('ResponseUnit'), async (req, res) => {
  const { query } = require('../config/db');
  try {
    const result = await query(
      `SELECT a.id AS assignment_id, a.status AS assignment_status, a.assigned_at,
              a.acknowledged_at, a.arrived_at, i.id AS incident_id, i.incident_code,
              i.emergency_type, i.severity, i.status AS incident_status,
              ST_AsGeoJSON(i.location)::json AS location,
              s.content AS handover_summary,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.description), NULL) AS caller_notes
       FROM assignments a
       JOIN response_units ru ON ru.id = a.unit_id
       JOIN incidents i ON i.id = a.incident_id
       LEFT JOIN reports r ON r.incident_id = i.id
       LEFT JOIN LATERAL (
         SELECT content FROM summaries
         WHERE incident_id = i.id AND summary_type = 'HandoverDebrief'
         ORDER BY version DESC LIMIT 1
       ) s ON true
       WHERE ru.user_id = $1
         AND a.status IN ('Dispatched', 'Acknowledged', 'EnRoute', 'OnScene')
       GROUP BY a.id, i.id, s.content
       ORDER BY a.assigned_at DESC
       LIMIT 1`,
      [req.user.userId]
    );
    return res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('[Assignments] Current assignment error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch the current assignment.' }
    });
  }
});

/**
 * @route  PATCH /api/v1/assignments/:assignmentId/status
 * @desc   Responder marks an owned assignment EnRoute or OnScene. OnScene transitions incident to Active.
 * @access ResponseUnit
 */
router.patch('/:assignmentId/status', authenticate, authorize('ResponseUnit'), async (req, res) => {
  const { assignmentId } = req.params;
  const { status } = req.body;

  if (!['EnRoute', 'OnScene'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'status must be "EnRoute" or "OnScene".' }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignResult = await client.query(
      `SELECT a.id, a.incident_id, a.status
       FROM assignments a
       JOIN response_units ru ON ru.id = a.unit_id
       WHERE a.id = $1 AND ru.user_id = $2 FOR UPDATE`,
      [assignmentId, req.user.userId]
    );

    if (assignResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found for this response unit.' }
      });
    }

    const assignment = assignResult.rows[0];

    if (status === 'EnRoute' && !['Dispatched', 'Acknowledged'].includes(assignment.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot set EnRoute from current status: ${assignment.status}.`
        }
      });
    }

    if (status === 'OnScene' && !['Dispatched', 'Acknowledged', 'EnRoute'].includes(assignment.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot set OnScene from current status: ${assignment.status}.`
        }
      });
    }

    // Update assignment status. Arrival time is recorded only on scene arrival.
    await client.query(
      `UPDATE assignments
       SET status = $1, acknowledged_at = CASE WHEN $1 = 'EnRoute' THEN COALESCE(acknowledged_at, NOW()) ELSE acknowledged_at END,
           arrived_at = CASE WHEN $1 = 'OnScene' THEN NOW() ELSE arrived_at END
       WHERE id = $2`,
      [status, assignmentId]
    );

    if (status === 'OnScene') {
      // Transition Dispatched -> Active via state machine (writes activity_log atomically)
      await stateMachine.transition(assignment.incident_id, 'Active', req.user.userId, { client });
    }

    // Update the response unit operational status to match the field update.
    await client.query(
      `UPDATE response_units SET current_status = $1, updated_at = NOW()
       WHERE id = (SELECT unit_id FROM assignments WHERE id = $2)`,
      [status, assignmentId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        assignmentId,
        status,
        occurredAt: new Date().toISOString()
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

module.exports = router;
