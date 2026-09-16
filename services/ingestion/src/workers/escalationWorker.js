/**
 * DERRCS Escalation Worker
 *
 * Background worker that polls every 30 seconds for incidents that have
 * exceeded their SLA thresholds without progressing:
 *
 *   • "Reported"  > 5 min  without dispatcher review  → Escalation 1
 *   • "Validated" > 10 min without assigned units      → Escalation 2
 *
 * On each breach:
 *   1. Increments escalation_level in incidents (guarded with a WHERE clause
 *      to prevent double-increments from concurrent workers / restarts).
 *   2. Inserts an audit row in activity_logs.
 *   3. Emits dispatcher:incident:escalated via Socket.IO to the "dispatchers" room.
 *
 * Race condition protection:
 *   The UPDATE uses:
 *     WHERE id = $1 AND escalation_level = $2
 *   This is a compare-and-swap pattern. If two workers race, only one succeeds
 *   (the other gets 0 rows updated and skips the log + emit).
 *
 * Crash recovery:
 *   On restart the worker re-queries the DB for still-overdue incidents, so
 *   no in-memory timer state is lost. The compare-and-swap guard prevents
 *   re-emitting an already-escalated level.
 */

'use strict';

const { pool } = require('../config/db');

// Threshold constants (milliseconds)
const REPORTED_THRESHOLD_MS   = 5  * 60 * 1000; //  5 minutes
const VALIDATED_THRESHOLD_MS  = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS        = 30 * 1000;       // 30 seconds

let _intervalHandle = null;
let _io             = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Processes a single overdue incident inside its own DB client/transaction.
 * Uses compare-and-swap on escalation_level to prevent double-escalation.
 *
 * @param {object} incident - Row from the overdue query.
 * @param {number} nextLevel - escalation_level value to advance to.
 */
async function _escalateIncident(incident, nextLevel) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // CAS update: only advance if no other worker beat us to this level
    const { rowCount } = await client.query(
      `UPDATE incidents
          SET escalation_level = $1, updated_at = NOW()
        WHERE id = $2
          AND escalation_level = $3
          AND status = $4`,
      [nextLevel, incident.id, incident.escalation_level, incident.status]
    );

    if (rowCount === 0) {
      // Another process already escalated this incident, skip quietly.
      await client.query('ROLLBACK');
      return;
    }

    // Audit log
    await client.query(
      `INSERT INTO activity_logs
         (user_id, action, entity_name, entity_id, details, created_at)
       VALUES (NULL, $1, $2, $3, $4, NOW())`,
      [
        'ESCALATION',
        'incidents',
        incident.id,
        JSON.stringify({
          previousLevel: incident.escalation_level,
          newLevel:      nextLevel,
          status:        incident.status,
          incidentCode:  incident.incident_code,
          emergencyType: incident.emergency_type,
          ageMinutes:    Math.round(incident.age_ms / 60000),
          triggeredAt:   new Date().toISOString(),
        }),
      ]
    );

    await client.query('COMMIT');

    // Emit real-time alert to all connected dispatchers
    const payload = {
      incidentId:     incident.id,
      incidentCode:   incident.incident_code,
      emergencyType:  incident.emergency_type,
      status:         incident.status,
      escalationLevel: nextLevel,
      ageMinutes:     Math.round(incident.age_ms / 60000),
      escalatedAt:    new Date().toISOString(),
    };

    if (_io) {
      const room = _io.to('dispatchers');
      room.emit('dispatcher:incident:escalated', payload);
      console.log(
        `[EscalationWorker] Escalated ${incident.incident_code} to level ${nextLevel}` +
        ` (${incident.status}, ${Math.round(incident.age_ms / 60000)} min old)`
      );
    } else {
      console.warn('[EscalationWorker] Socket.IO not attached; skipped emit for', incident.incident_code);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[EscalationWorker] Error escalating incident', incident.id, err.message);
  } finally {
    client.release();
  }
}

/**
 * Runs a single poll cycle: queries for overdue incidents in both
 * Reported and Validated states, then escalates each one found.
 */
async function _runPollCycle() {
  try {
    const now = new Date();

    // Reported threshold cutoff
    const reportedCutoff  = new Date(now.getTime() - REPORTED_THRESHOLD_MS).toISOString();
    // Validated threshold cutoff
    const validatedCutoff = new Date(now.getTime() - VALIDATED_THRESHOLD_MS).toISOString();

    const { rows } = await pool.query(
      `SELECT
         id,
         incident_code,
         emergency_type,
         status,
         escalation_level,
         created_at,
         validated_at,
         EXTRACT(EPOCH FROM (NOW() - CASE
           WHEN status = 'Reported'  THEN created_at
           WHEN status = 'Validated' THEN validated_at
         END)) * 1000 AS age_ms
       FROM incidents
       WHERE
         (status = 'Reported'  AND created_at  < $1)
         OR
         (status = 'Validated' AND validated_at < $2)
       ORDER BY created_at ASC`,
      [reportedCutoff, validatedCutoff]
    );

    if (rows.length === 0) return;

    console.log(`[EscalationWorker] Found ${rows.length} overdue incident(s).`);

    for (const incident of rows) {
      const nextLevel = incident.escalation_level + 1;
      await _escalateIncident(incident, nextLevel);
    }
  } catch (err) {
    // Don't crash the process; log and wait for next cycle
    console.error('[EscalationWorker] Poll cycle error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the escalation background worker.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 */
function start(io) {
  if (_intervalHandle) {
    console.warn('[EscalationWorker] Already running. Call stop() before start().');
    return;
  }

  _io = io;

  // Run immediately on startup, then every POLL_INTERVAL_MS
  _runPollCycle();
  _intervalHandle = setInterval(_runPollCycle, POLL_INTERVAL_MS);

  console.log(
    `[EscalationWorker] Started. Poll interval: ${POLL_INTERVAL_MS / 1000}s. ` +
    `Thresholds — Reported: ${REPORTED_THRESHOLD_MS / 60000} min, ` +
    `Validated: ${VALIDATED_THRESHOLD_MS / 60000} min.`
  );
}

/**
 * Stops the escalation background worker gracefully.
 * Safe to call even if the worker was never started.
 */
function stop() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    console.log('[EscalationWorker] Stopped.');
  }
  _io = null;
}

module.exports = { start, stop };
