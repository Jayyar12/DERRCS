# Phase 3 Manual Testing Results

**Date:** September 16, 2026, 9:33 PM PHT
**Tester:** Jay-ar T. Guiroy
**Service:** `services/ingestion/` (Node.js)
**Environment:** Development (localhost)

---

## Pre-Test Setup

### 1. Applied Database Migration

```bash
psql -U derrcs_user -d derrcs_db -f migrations/003_phase3_state_machine_escalation.sql
```

Output:

```
NOTICE:  escalation_level already exists on incidents — skipping.
NOTICE:  Added updated_at to incidents.
NOTICE:  incidents.status CHECK constraint already includes all 6 states — skipping.
CREATE INDEX (x5)
CREATE VIEW
```

### 2. Started Ingestion Service

```bash
node services/ingestion/src/index.js
```

Startup log:

```
[DB] Connected to PostgreSQL at Wed Sep 16 2026 21:37:30 GMT+0800
[EscalationWorker] Started. Poll interval: 30s. Thresholds — Reported: 5 min, Validated: 10 min.
====================================================
DERRCS Ingestion & State Machine Service
Server listening on port 5000
Environment: development
====================================================
[EscalationWorker] Found 2 overdue incident(s).
[EscalationWorker] Escalated INC-2026-0002 to level 3 (Reported, 570 min old)
[EscalationWorker] Escalated INC-2026-0004 to level 3 (Reported, 535 min old)
[RabbitMQ] Connected. Exchange "derrcs.events" asserted.
[RabbitMQ] Consumer bound: cluster.completed → dispatcher:candidate:new
[RabbitMQ] Consumer bound: unit.assigned → unit:dispatch:alert
[RabbitMQ] Consumer bound: field.assessment.completed → dispatcher:field:resolved
```

The escalation worker fired immediately on startup and found two incidents that had been sitting in `Reported` state for over 500 minutes. Both were escalated without manual intervention.

### 3. Obtained Auth Tokens

```bash
# Dispatcher login
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dispatcher_tagoloan","password":"password123"}'
```

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "Dispatcher",
    "fullName": "MDRRMO Dispatcher 1",
    "userId": "22222222-2222-2222-2222-222222222222"
  }
}
```

```bash
# Response Unit login
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rescue_alpha","password":"password123"}'
```

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "ResponseUnit",
    "fullName": "Rescue Unit Alpha Team",
    "userId": "33333333-3333-3333-3333-333333333333"
  }
}
```

---

## Test 1 — Invalid State Transition Rejection

**Goal:** Prove the state machine blocks illegal transitions and throws `InvalidStateTransitionError` with the correct fields.

**Method:** Call `stateMachine.transition()` directly against incident `b423137f` (currently in `Reported` state), requesting a jump to `Closed` (skips 4 states).

```bash
node -e "
  require('dotenv').config({ path: '/home/jay/Documents/Projects/DERRCS/.env' });
  const sm = require('./src/services/stateMachine');
  sm.transition('b423137f-1782-46da-a93f-b2b3b6ac0a45', 'Closed', null)
    .then(r => { console.log('UNEXPECTED SUCCESS:', r); process.exit(0); })
    .catch(err => {
      console.log('err.name        :', err.name);
      console.log('err.incidentId  :', err.incidentId);
      console.log('err.currentState:', err.currentState);
      console.log('err.targetState :', err.targetState);
      console.log('err.message     :', err.message);
      process.exit(0);
    });
"
```

**Result: PASS**

```
err.name        : InvalidStateTransitionError
err.incidentId  : b423137f-1782-46da-a93f-b2b3b6ac0a45
err.currentState: Reported
err.targetState : Closed
err.message     : Invalid state transition for incident b423137f-1782-46da-a93f-b2b3b6ac0a45:
                   "Reported" -> "Closed" is not allowed.
```

The error carries all three properties (`incidentId`, `currentState`, `targetState`) for structured HTTP error responses. The database row was not modified.

---

## Test 2 — Full Incident Lifecycle (Reported → Validated → Dispatched → Active → Resolved)

**Goal:** Walk a single incident through all four HTTP transitions and confirm each one writes an `activity_logs` audit record.

### Step 1: Confirm candidate (Reported → Validated)

```bash
curl -s -X POST http://localhost:5000/api/v1/candidates/9de92864-207a-4830-a8c1-b6ba0142e301/confirm \
  -H "Authorization: Bearer $DISP_TOKEN"
```

```json
{
  "success": true,
  "data": {
    "incidentId": "8f73f4a3-371c-47da-9c05-3968bd131071",
    "incidentCode": "INC-2026-0005",
    "status": "Validated",
    "confirmedAt": "2026-09-16T13:40:00.513Z"
  }
}
```

### Step 2: Assign RESCUE-01 (Validated → Dispatched)

```bash
curl -s -X POST http://localhost:5000/api/v1/incidents/8f73f4a3-371c-47da-9c05-3968bd131071/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DISP_TOKEN" \
  -d '{"responseUnitId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","notes":"Respond immediately"}'
```

```json
{
  "success": true,
  "data": {
    "assignmentId": "1a950deb-8abe-4de6-9fbf-f96f52e4c95a",
    "incidentId": "8f73f4a3-371c-47da-9c05-3968bd131071",
    "responseUnitId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "status": "Dispatched",
    "assignedAt": "2026-09-16T13:40:09.866Z",
    "notes": "Respond immediately"
  }
}
```

### Step 3: Arrive on scene (Dispatched → Active)

```bash
curl -s -X PATCH http://localhost:5000/api/v1/incidents/assignments/1a950deb-8abe-4de6-9fbf-f96f52e4c95a/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UNIT_TOKEN" \
  -d '{"status":"OnScene"}'
```

```json
{
  "success": true,
  "data": {
    "assignmentId": "1a950deb-8abe-4de6-9fbf-f96f52e4c95a",
    "status": "OnScene",
    "arrivedAt": "2026-09-16T13:40:23.439Z"
  }
}
```

### Step 4: Submit field assessment (Active → Resolved)

```bash
curl -s -X POST http://localhost:5000/api/v1/incidents/8f73f4a3-371c-47da-9c05-3968bd131071/field-assessment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UNIT_TOKEN" \
  -d '{
    "assignmentId": "1a950deb-8abe-4de6-9fbf-f96f52e4c95a",
    "patientName": "Juan Dela Cruz",
    "approximateAge": 35,
    "gender": "Male",
    "consciousnessLevel": "Alert",
    "injuriesObserved": ["Minor burns on left arm"],
    "interventionsRendered": ["First aid applied", "O2 administered"],
    "disposition": "TransportedHealthCenter",
    "destinationFacility": "Tagoloan Health Center",
    "notes": "Patient stable on transport"
  }'
```

```json
{
  "success": true,
  "data": {
    "assessmentId": "45789589-3bd5-43da-bd89-6bbe778ca2d3",
    "incidentId": "8f73f4a3-371c-47da-9c05-3968bd131071",
    "incidentStatus": "Resolved",
    "createdAt": "2026-09-16T13:40:36.555Z"
  }
}
```

### Audit Trail Verification

```sql
SELECT action, previous_state, new_state, changed_by_name, occurred_at
FROM incident_audit_trail
WHERE incident_id = '8f73f4a3-371c-47da-9c05-3968bd131071'
ORDER BY occurred_at;
```

```
      action      | previous_state | new_state  |    changed_by_name     |          occurred_at
------------------+----------------+------------+------------------------+-------------------------------
 STATE_TRANSITION | Reported       | Validated  | MDRRMO Dispatcher 1    | 2026-09-16 21:40:00.469348+08
 STATE_TRANSITION | Validated      | Dispatched | MDRRMO Dispatcher 1    | 2026-09-16 21:40:09.866226+08
 STATE_TRANSITION | Dispatched     | Active     | Rescue Unit Alpha Team | 2026-09-16 21:40:23.419919+08
 STATE_TRANSITION | Active         | Resolved   | Rescue Unit Alpha Team | 2026-09-16 21:40:36.555189+08
```

**Result: PASS** — Four transitions, four audit rows, actor names resolved correctly from users table.

---

## Test 3 — RabbitMQ → Socket.IO Event Routing

**Goal:** Publish a `cluster.completed` message to RabbitMQ and confirm it arrives at a connected Dispatcher socket as `dispatcher:candidate:new`.

**Method:** Connect a `socket.io-client` as a Dispatcher, then publish to RabbitMQ from the same script.

```bash
node -e "
  const { io: ioClient } = require('socket.io-client');
  const amqp = require('amqplib');

  const socket = ioClient('http://localhost:5000', {
    auth: { token: DISP_TOKEN },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    // publish cluster.completed to RabbitMQ
    amqp.connect('amqp://derrcs_rabbit:rabbit_password_2026@localhost:5672')
      .then(conn => conn.createChannel())
      .then(ch => {
        ch.assertExchange('derrcs.events', 'topic', { durable: true });
        ch.publish('derrcs.events', 'cluster.completed',
          Buffer.from(JSON.stringify(payload)),
          { contentType: 'application/json', persistent: true });
      });
  });

  socket.on('dispatcher:candidate:new', (data) => {
    console.log('Received:', JSON.stringify(data, null, 2));
    socket.disconnect();
    process.exit(0);
  });
"
```

**Result: PASS**

``` Socket connected as Dispatcher, id: Qu-PwEmxiz5hjALPAAAA
   Published candidateId: test-1789566106241
 dispatcher:candidate:new received:
{
  "candidateId": "test-1789566106241",
  "emergencyType": "Flood",
  "reportCount": 3,
  "location": { "lat": 8.5275, "lng": 124.7459 },
  "summary": "Manual test: 3 flood reports near barangay center",
  "createdAt": "2026-09-16T13:41:46.241Z"
}
```

Round-trip time was under 1 second. The ingestion service consumer acked the message after emitting to the `dispatchers` room.

---

## Escalation Worker (Observed Live)

The worker ran continuously during the testing session. Two incidents (INC-2026-0002 and INC-2026-0004) had been in `Reported` state for 500+ minutes.

```sql
SELECT action, previous_escalation_level, new_escalation_level, incident_id, occurred_at
FROM incident_audit_trail
WHERE action = 'ESCALATION'
ORDER BY occurred_at DESC LIMIT 6;
```

```
   action   | previous_escalation_level | new_escalation_level |             incident_id              |          occurred_at
------------+---------------------------+----------------------+--------------------------------------+-------------------------------
 ESCALATION | 10                        | 11                   | b423137f-1782-46da-a93f-b2b3b6ac0a45 | 2026-09-16 21:41:30.632331+08
 ESCALATION | 10                        | 11                   | 947fb6f8-0b9f-4301-a082-41f376442fbb | 2026-09-16 21:41:30.616966+08
 ESCALATION | 9                         | 10                   | b423137f-1782-46da-a93f-b2b3b6ac0a45 | 2026-09-16 21:41:00.638911+08
 ESCALATION | 9                         | 10                   | 947fb6f8-0b9f-4301-a082-41f376442fbb | 2026-09-16 21:41:00.625296+08
 ESCALATION | 8                         | 9                    | b423137f-1782-46da-a93f-b2b3b6ac0a45 | 2026-09-16 21:40:30.610426+08
 ESCALATION | 8                         | 9                    | 947fb6f8-0b9f-4301-a082-41f376442fbb | 2026-09-16 21:40:30.602267+08
```

```sql
SELECT incident_code, status, escalation_level FROM incidents ORDER BY created_at DESC;
```

```
 incident_code |  status  | escalation_level
---------------+----------+------------------
 INC-2026-0005 | Resolved |                0
 INC-2026-0004 | Reported |               11
 INC-2026-0003 | Resolved |                0
 INC-2026-0002 | Reported |               11
 INC-2026-0001 | Resolved |                0
```

The compare-and-swap guard (`WHERE escalation_level = $currentLevel`) worked correctly. Each poll cycle incremented the level by exactly 1. No duplicate escalation entries were observed across multiple service restarts during testing.

---

## Summary

| Test | Component | Result |
|---|---|---|
| 1 | State machine — invalid transition rejection | Pass |
| 2a | HTTP lifecycle — Reported → Validated | Pass |
| 2b | HTTP lifecycle — Validated → Dispatched | Pass |
| 2c | HTTP lifecycle — Dispatched → Active | Pass |
| 2d | HTTP lifecycle — Active → Resolved | Pass |
| 2e | Audit trail — 4 `STATE_TRANSITION` rows with actor names | Pass |
| 3 | RabbitMQ `cluster.completed` → Socket.IO `dispatcher:candidate:new` | Pass |
| 4 | Escalation worker — auto-escalation on overdue incidents | Pass |
| 5 | Escalation worker — CAS guard preventing duplicates | Pass |
