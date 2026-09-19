/**
 * DERRCS Incident Candidates Routes
 * GET    /api/v1/candidates          — List active pending candidates (Dispatcher/Admin)
 * POST   /api/v1/candidates/:id/confirm — Confirm candidate, create incident (Dispatcher)
 */

const express = require('express');
const { query, pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const stateMachine = require('../services/stateMachine');

const router = express.Router();

/**
 * @route  GET /api/v1/candidates
 * @desc   Returns all Pending incident candidates with report count and latest AI summary.
 * @access Dispatcher, Admin
 */
router.get('/', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT
         ic.id,
         ic.cluster_label,
         ic.emergency_type,
         ic.status,
         ic.report_count,
         ST_AsGeoJSON(ic.center_location)::json AS center_location,
         ic.created_at,
         ic.updated_at,
         s.content AS latest_summary,
         s.is_fallback AS summary_is_fallback
       FROM incident_candidates ic
       LEFT JOIN LATERAL (
         SELECT content, is_fallback
         FROM summaries
         WHERE candidate_id = ic.id AND summary_type = 'ClusterIntake'
         ORDER BY version DESC
         LIMIT 1
       ) s ON true
       WHERE ic.status = 'Pending'
       ORDER BY ic.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('[Candidates] List error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch candidates.' }
    });
  }
});

/**
 * @route  POST /api/v1/candidates/:candidateId/confirm
 * @desc   Confirms a Pending candidate. Creates the incident at Reported then transitions
 *         to Validated — preserving the 6-stage lifecycle inside a single transaction.
 * @access Dispatcher
 */
router.get('/:candidateId', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  const { candidateId } = req.params;

  try {
    const [candidateResult, reportsResult] = await Promise.all([
      query(
        `SELECT ic.id, ic.cluster_label, ic.emergency_type, ic.status, ic.report_count,
                ST_AsGeoJSON(ic.center_location)::json AS center_location,
                ic.created_at, ic.updated_at,
                i.id AS incident_id, i.incident_code, i.status AS incident_status,
                i.severity, i.escalation_level,
                s.content AS latest_summary, s.is_fallback AS summary_is_fallback
         FROM incident_candidates ic
         LEFT JOIN incidents i ON i.candidate_id = ic.id
         LEFT JOIN LATERAL (
           SELECT content, is_fallback FROM summaries
           WHERE candidate_id = ic.id AND summary_type = 'ClusterIntake'
           ORDER BY version DESC LIMIT 1
         ) s ON true
         WHERE ic.id = $1`,
        [candidateId]
      ),
      query(
        `SELECT id, session_id, description, photo_url, standardized_answers,
                ST_AsGeoJSON(reporter_location)::json AS reporter_location,
                ST_AsGeoJSON(emergency_location)::json AS emergency_location, created_at
         FROM reports WHERE candidate_id = $1 ORDER BY created_at ASC`,
        [candidateId]
      )
    ]);

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Candidate not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: { ...candidateResult.rows[0], reports: reportsResult.rows }
    });
  } catch (err) {
    console.error('[Candidates] Detail error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch candidate details.' }
    });
  }
});

router.post('/:candidateId/confirm', authenticate, authorize('Dispatcher'), async (req, res) => {
  const { candidateId } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and fetch the candidate
    const candidateResult = await client.query(
      `SELECT * FROM incident_candidates WHERE id = $1 FOR UPDATE`,
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Candidate not found.' }
      });
    }

    const candidate = candidateResult.rows[0];

    if (candidate.status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `Candidate is already ${candidate.status}. Cannot confirm again.`
        }
      });
    }

    // 2. DBSCAN created this incident with status Reported. Confirm that exact
    // row instead of creating a second incident for the same candidate.
    const incidentResult = await client.query(
      `SELECT id, incident_code, status FROM incidents
       WHERE candidate_id = $1 FOR UPDATE`,
      [candidateId]
    );

    if (incidentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'CANDIDATE_INCIDENT_MISSING',
          message: 'The candidate has no linked Reported incident to validate.'
        }
      });
    }

    const incident = incidentResult.rows[0];

    // 3. Transition Reported -> Validated via state machine (writes activity_log atomically)
    await stateMachine.transition(incident.id, 'Validated', req.user.userId, { client });

    // 4. Mark the candidate as Confirmed
    await client.query(
      `UPDATE incident_candidates SET status = 'Confirmed', updated_at = NOW() WHERE id = $1`,
      [candidateId]
    );

    await client.query('COMMIT');

    // Publish incident.validated domain event for the allocation worker
    const { publishEvent } = require('../config/rabbitmq');
    await publishEvent('incident.validated', {
      incidentId: incident.id,
      incidentCode: incident.incident_code,
      candidateId,
      emergencyType: candidate.emergency_type,
      validatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: {
        incidentId: incident.id,
        incidentCode: incident.incident_code,
        status: 'Validated',
        confirmedAt: new Date().toISOString()
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
    console.error('[Candidates] Confirm error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to confirm candidate.' }
    });
  } finally {
    client.release();
  }
});

module.exports = router;
