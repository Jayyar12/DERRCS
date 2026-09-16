/**
 * DERRCS Incident Candidates Routes
 * GET    /api/v1/candidates          — List active pending candidates (Dispatcher/Admin)
 * POST   /api/v1/candidates/:id/confirm — Confirm candidate, create incident (Dispatcher)
 */

const express = require('express');
const { query, pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

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

    // 2. Generate incident code: INC-YYYY-NNNN
    const year = new Date().getFullYear();
    const countResult = await client.query(
      `SELECT COUNT(*) FROM incidents WHERE incident_code LIKE $1`,
      [`INC-${year}-%`]
    );
    const seq = String(parseInt(countResult.rows[0].count, 10) + 1).padStart(4, '0');
    const incidentCode = `INC-${year}-${seq}`;

    // 3. Create incident at 'Reported' first (preserves 6-stage lifecycle)
    const incidentResult = await client.query(
      `INSERT INTO incidents
         (candidate_id, incident_code, emergency_type, severity, status, location)
       VALUES
         ($1, $2, $3, 'Moderate', 'Reported', (SELECT center_location FROM incident_candidates WHERE id = $1))
       RETURNING id, incident_code, created_at`,
      [candidateId, incidentCode, candidate.emergency_type]
    );

    const incident = incidentResult.rows[0];

    // 4. Immediately transition to Validated (dispatcher confirmed it)
    await client.query(
      `UPDATE incidents SET status = 'Validated', validated_at = NOW() WHERE id = $1`,
      [incident.id]
    );

    // 5. Mark the candidate as Confirmed
    await client.query(
      `UPDATE incident_candidates SET status = 'Confirmed', updated_at = NOW() WHERE id = $1`,
      [candidateId]
    );

    await client.query('COMMIT');

    // Publish incident.validated domain event for the allocation worker
    const { publishEvent } = require('../config/rabbitmq');
    publishEvent('incident.validated', {
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
