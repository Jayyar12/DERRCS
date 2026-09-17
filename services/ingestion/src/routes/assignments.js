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
 * @route  PATCH /api/v1/assignments/:assignmentId/status
 * @desc   Responder toggles assignment to OnScene. Transitions incident to Active.
 * @access ResponseUnit
 */
router.patch('/:assignmentId/status', authenticate, authorize('ResponseUnit'), async (req, res) => {
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

    // Transition Dispatched -> Active via state machine (writes activity_log atomically)
    await stateMachine.transition(assignment.incident_id, 'Active', req.user.userId, { client });

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

module.exports = router;
