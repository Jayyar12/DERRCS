/**
 * DERRCS Incident State Machine
 *
 * Enforces the 6-stage incident lifecycle:
 *   Reported -> Validated -> Dispatched -> Active -> Resolved -> Closed
 *
 * Key rules (from CONTEXT.md §4):
 *  - No state may be skipped.
 *  - No transition is reversible.
 *  - Active -> Resolved requires a valid field_assessments record (enforced by callers).
 *  - All transitions are executed inside a DB transaction and produce an activity_log row.
 */

'use strict';

const { pool } = require('../config/db');

// ---------------------------------------------------------------------------
// Allowed transitions: maps current state -> set of valid next states
// ---------------------------------------------------------------------------
const TRANSITIONS = {
  Reported:   ['Validated'],
  Validated:  ['Dispatched'],
  Dispatched: ['Active'],
  Active:     ['Resolved'],
  Resolved:   ['Closed'],
  Closed:     [],
};

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------
class InvalidStateTransitionError extends Error {
  /**
   * @param {string} incidentId    - UUID of the incident.
   * @param {string} currentState  - The state the incident is currently in.
   * @param {string} targetState   - The state that was requested.
   */
  constructor(incidentId, currentState, targetState) {
    super(
      `Invalid state transition for incident ${incidentId}: ` +
      `"${currentState}" -> "${targetState}" is not allowed.`
    );
    this.name = 'InvalidStateTransitionError';
    this.incidentId   = incidentId;
    this.currentState = currentState;
    this.targetState  = targetState;
    // Keep stack trace pointing at the caller, not this constructor.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidStateTransitionError);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure validation helper (no DB access, safe to call from anywhere)
// ---------------------------------------------------------------------------
/**
 * Returns true when transitioning from currentState to targetState is valid.
 * @param {string} currentState
 * @param {string} targetState
 * @returns {boolean}
 */
function isValidTransition(currentState, targetState) {
  const allowed = TRANSITIONS[currentState];
  return Array.isArray(allowed) && allowed.includes(targetState);
}

// ---------------------------------------------------------------------------
// Transactional execution wrapper
// ---------------------------------------------------------------------------
/**
 * Transitions an incident to targetState inside a database transaction.
 *
 * Steps:
 *  1. Acquire a client and BEGIN.
 *  2. Lock the incidents row with FOR UPDATE to prevent concurrent transitions.
 *  3. Validate the proposed transition against TRANSITIONS.
 *  4. UPDATE incidents.status (and the matching timestamp column).
 *  5. INSERT an audit row into activity_logs.
 *  6. COMMIT and return the updated incident row.
 *
 * Throws InvalidStateTransitionError for illegal moves.
 * Throws Error for database or not-found failures (rolls back automatically).
 *
 * @param {string} incidentId  - UUID of the incident to transition.
 * @param {string} targetState - The desired new state.
 * @param {string|null} changedBy - UUID of the user (or null for system actions).
 * @param {object} [options]
 * @param {import('pg').PoolClient} [options.client] - Reuse an existing
 *   transaction client. When provided, this function will NOT commit/rollback —
 *   the caller owns the transaction boundary. Useful when the state transition
 *   is one step inside a larger operation (e.g. the assign route).
 * @returns {Promise<object>} The updated incident row.
 */
async function transition(incidentId, targetState, changedBy = null, options = {}) {
  const externalClient = options.client || null;
  const client = externalClient || await pool.connect();

  try {
    if (!externalClient) await client.query('BEGIN');

    // 1. Lock the incident row
    const { rows } = await client.query(
      `SELECT id, status FROM incidents WHERE id = $1 FOR UPDATE`,
      [incidentId]
    );

    if (rows.length === 0) {
      if (!externalClient) await client.query('ROLLBACK');
      const err = new Error(`Incident ${incidentId} not found.`);
      err.code = 'INCIDENT_NOT_FOUND';
      throw err;
    }

    const currentState = rows[0].status;

    // 2. Validate transition
    if (!isValidTransition(currentState, targetState)) {
      if (!externalClient) await client.query('ROLLBACK');
      throw new InvalidStateTransitionError(incidentId, currentState, targetState);
    }

    // 3. Build the UPDATE — each state has a matching timestamp column
    const timestampColumn = {
      Validated:  'validated_at',
      Dispatched: 'dispatched_at',
      Active:     null,           // no dedicated column in schema
      Resolved:   'resolved_at',
      Closed:     'closed_at',
    }[targetState];

    const updateSQL = timestampColumn
      ? `UPDATE incidents SET status = $1, ${timestampColumn} = NOW() WHERE id = $2 RETURNING *`
      : `UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *`;

    const { rows: updatedRows } = await client.query(updateSQL, [targetState, incidentId]);

    // 4. Insert audit log row using the existing activity_logs schema
    await client.query(
      `INSERT INTO activity_logs
         (user_id, action, entity_name, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        changedBy,
        'STATE_TRANSITION',
        'incidents',
        incidentId,
        JSON.stringify({
          previousState: currentState,
          newState:      targetState,
          changedBy:     changedBy || 'system',
          timestamp:     new Date().toISOString(),
        }),
      ]
    );

    if (!externalClient) await client.query('COMMIT');

    console.log(
      `[StateMachine] Incident ${incidentId}: ${currentState} -> ${targetState}` +
      ` (by ${changedBy || 'system'})`
    );

    return updatedRows[0];
  } catch (err) {
    if (!externalClient) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    throw err;
  } finally {
    if (!externalClient) client.release();
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  TRANSITIONS,
  InvalidStateTransitionError,
  isValidTransition,
  transition,
};
