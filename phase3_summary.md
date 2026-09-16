# Phase 3 Implementation Summary
**State Machine, Escalation Alarms & WebSockets**
*Completed: 2026-09-16 | Service: `services/ingestion/`*

---

## Files Changed

| File | Change | Purpose |
|---|---|---|
| `src/services/stateMachine.js` | Created | Enforces 6-stage lifecycle, writes audit log |
| `src/workers/escalationWorker.js` | Created | 30 s background poller, CAS escalation guard |
| `src/index.js` | Updated | Socket.IO auth + rooms, RabbitMQ consumers, shutdown |
| `src/routes/candidates.js` | Updated | Wired `Reported → Validated` through state machine |
| `src/routes/incidents.js` | Updated | Wired `Validated → Dispatched`, `Dispatched → Active`, `Active → Resolved` |
| `migrations/003_phase3_state_machine_escalation.sql` | Created | Idempotent schema migration |
| `scripts/verify_phase3.js` | Created | End-to-end verification suite |

---

## 1. State Machine (`stateMachine.js`)

### Transition Table

```
Reported   ──► Validated
Validated  ──► Dispatched
Dispatched ──► Active
Active     ──► Resolved
Resolved   ──► Closed
Closed     ──► (terminal — no exits)
```

Skipping states and reversals are both blocked. Any invalid move throws `InvalidStateTransitionError` before touching the database.

### `InvalidStateTransitionError`

```js
err.name         // 'InvalidStateTransitionError'
err.message      // Human-readable description
err.incidentId   // UUID of the incident
err.currentState // State the incident is actually in
err.targetState  // State that was requested
```

HTTP routes catch this and return **422 Unprocessable Entity** with `currentState` and `targetState` in the response body.

### `transition(incidentId, targetState, changedBy, { client })`

Runs inside a database transaction. Steps per call:

1. `SELECT ... FOR UPDATE` — row-level lock prevents concurrent double-transitions.
2. Validates `currentState → targetState` against the transition table.
3. `UPDATE incidents SET status = $targetState, <timestamp_col> = NOW()`.
4. `INSERT INTO activity_logs` — action `STATE_TRANSITION`, details include `previousState`, `newState`, `changedBy`, `timestamp`.
5. Commit (or delegate to the caller's transaction when `{ client }` is passed).

The `{ client }` option lets routes pass their own `pool.connect()` client so the state transition, business logic inserts, and other updates all commit atomically as one transaction.

---

## 2. Escalation Worker (`escalationWorker.js`)

### Thresholds (from CONTEXT.md §4)

| Status | Threshold | Escalation trigger |
|---|---|---|
| `Reported` | > 5 minutes with no dispatcher review | Level incremented |
| `Validated` | > 10 minutes with no unit assigned | Level incremented |

### Poll cycle

Runs every **30 seconds**. On each cycle:

1. Queries `incidents` for rows where `(status = 'Reported' AND created_at < cutoff) OR (status = 'Validated' AND validated_at < cutoff)`.
2. For each breach, runs a compare-and-swap `UPDATE`:
   ```sql
   UPDATE incidents
      SET escalation_level = $nextLevel
    WHERE id = $id
      AND escalation_level = $currentLevel   -- CAS guard
      AND status = $status                   -- state guard
   ```
3. If `rowCount = 0`, another worker already escalated — skips log and emit.
4. If `rowCount = 1`, inserts `activity_logs` row (action `ESCALATION`) and emits `dispatcher:incident:escalated` to the `dispatchers` Socket.IO room.

### Crash recovery

No in-memory state. On restart, the DB query finds all still-overdue incidents immediately. The CAS guard prevents re-escalating an already-advanced level.

### API

```js
escalationWorker.start(io)  // called on server startup
escalationWorker.stop()     // called on SIGTERM / SIGINT
```

---

## 3. Socket.IO Wiring (`index.js`)

### Authentication middleware

Every socket connection must present a valid JWT:

```js
// Via socket.handshake.auth.token
// OR Authorization header (Bearer ...)
```

Invalid or expired tokens are rejected at connection time with `SOCKET_UNAUTHORIZED`.

### Room assignment

| Role | Room(s) joined |
|---|---|
| `Dispatcher` | `dispatchers`, `user:<userId>` |
| `Admin` | `dispatchers`, `user:<userId>` |
| `ResponseUnit` | `unit:<unitId>`, `user:<userId>` |

`unitId` is read from the JWT payload. If missing, the unit room is skipped with a logged warning.

### RabbitMQ consumers

All three consumers use `prefetch(1)` and **ack only after successful emit**.

| Queue | Routing key | Socket.IO event | Target room |
|---|---|---|---|
| `ingestion.cluster.completed` | `cluster.completed` | `dispatcher:candidate:new` | `dispatchers` |
| `ingestion.unit.assigned` | `unit.assigned` | `unit:dispatch:alert` | `unit:<unitId>` |
| `ingestion.field.assessment.completed` | `field.assessment.completed` | `dispatcher:field:resolved` | `dispatchers` |

Malformed JSON messages receive `nack(msg, false, false)` — dropped without requeue to prevent poison-pill loops.

Empty rooms log a warning but do not block the ack. The dispatcher UI bootstraps current state via REST on initial load; real-time events are live updates only, not guaranteed delivery to late-joining clients.

---

## 4. Route Integration

All four raw `UPDATE incidents SET status = ...` calls replaced:

| Route | Transition | Error response |
|---|---|---|
| `POST /candidates/:id/confirm` | `Reported → Validated` | 422 if wrong state |
| `POST /incidents/:id/assign` | `Validated → Dispatched` | 422 if wrong state |
| `PATCH /assignments/:id/status` | `Dispatched → Active` | 422 if wrong state |
| `POST /incidents/:id/field-assessment` | `Active → Resolved` | 422 if wrong state |

For `Active → Resolved`: the `field_assessments` row is inserted before `stateMachine.transition()` is called. If the state machine rejects (incident is not `Active`), the whole transaction rolls back and the assessment row is never persisted.

---

## 5. Database Migration (`003_phase3_state_machine_escalation.sql`)

Idempotent — safe to re-run.

**Columns confirmed/added:**
- `incidents.escalation_level INT DEFAULT 0` — already in baseline schema, validated present.
- `incidents.updated_at TIMESTAMPTZ` — added if missing.

**Status CHECK constraint** — validated to include all 6 states; recreated if outdated.

**New indexes:**

| Index | Table | Purpose |
|---|---|---|
| `idx_incidents_status_escalation` | `incidents` | Partial index on `(status, created_at, validated_at)` for the worker's 30 s poll |
| `idx_incidents_escalation_level` | `incidents` | Escalation level lookups |
| `idx_activity_logs_entity` | `activity_logs` | Audit trail by incident |
| `idx_activity_logs_action` | `activity_logs` | Filter by action type |
| `idx_activity_logs_created_at` | `activity_logs` | Chronological log feed |

**New view:**

```sql
SELECT * FROM incident_audit_trail
WHERE incident_id = '<uuid>'
ORDER BY occurred_at DESC;
```

Returns `previous_state`, `new_state`, `changed_by_name`, `occurred_at` for every `STATE_TRANSITION` and `ESCALATION` event on any incident.

---

## 6. Verification

```bash
# Set required env vars then run:
export VERIFY_DISPATCHER_JWT="<token>"
export VERIFY_UNIT_JWT="<token>"
export VERIFY_UNIT_ID="<uuid>"
export VERIFY_INCIDENT_ID="<uuid in Reported state>"

node scripts/verify_phase3.js
```

| Test | What it proves |
|---|---|
| Test 1 | `stateMachine.transition(id, 'Active')` on a `Reported` incident throws `InvalidStateTransitionError` with correct fields |
| Test 2 | Dispatcher socket receives `dispatcher:incident:escalated` within the next poll cycle |
| Test 3 | Publishing `cluster.completed` to RabbitMQ reaches a connected dispatcher socket as `dispatcher:candidate:new` within 5 s |

---

## Run order for deployment

```bash
# 1. Apply migration
psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -f migrations/003_phase3_state_machine_escalation.sql

# 2. Restart the ingestion service
npm run dev   # or: npm start
```

No new npm dependencies required.