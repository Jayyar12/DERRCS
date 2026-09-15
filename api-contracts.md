# DERRCS — API & Message Broker Contracts

This document defines the HTTP REST contracts and RabbitMQ message payloads for DERRCS. All services must adhere to these contracts.

---

## 1. REST Endpoints

### 1.1 Public Reporting (Citizen Intake)
* **Endpoint:** `POST /api/v1/reports`
* **Auth:** None (Public). Rate limited by IP and session identifier.
* **Request Body:**
```json
{
  "sessionId": "anon-sess-98213",
  "emergencyType": "Fire",
  "description": "Thick black smoke coming from a residential roof.",
  "reporterCoordinates": {
    "latitude": 8.5392,
    "longitude": 124.7521
  },
  "emergencyCoordinates": {
    "latitude": 8.5385,
    "longitude": 124.7533
  },
  "photoUrl": "https://storage.local/uploads/fire-01.jpg",
  "standardizedAnswers": {
    "structureType": "Residential",
    "peopleTrapped": false,
    "hazardousMaterialsNearby": false
  }
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "reportId": "8f3b23c0-30f1-419b-b56e-6c61f22e3cf7",
    "status": "Received",
    "receivedAt": "2026-09-14T14:23:10Z"
  }
}
```

---

### 1.2 Dispatcher Dashboard Endpoints
* **`GET /api/v1/candidates`**
  * **Auth:** Bearer JWT (Role: `Dispatcher` or `Admin`).
  * **Response:** Returns list of active `incident_candidates` with attached report counts and AI summary content.

* **`POST /api/v1/candidates/:candidateId/confirm`**
  * **Auth:** Bearer JWT (Role: `Dispatcher`).
  * **Action:** Promotes an `incident_candidate` to an `incident`. Transitions state to `Validated`.
  * **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "incidentId": "d3b07384-d113-4c4b-b82c-63b79823901a",
    "incidentCode": "INC-2026-0042",
    "status": "Validated",
    "confirmedAt": "2026-09-14T14:25:00Z"
  }
}
```

* **`POST /api/v1/incidents/:incidentId/assign`**
  * **Auth:** Bearer JWT (Role: `Dispatcher`).
  * **Request Body:**
```json
{
  "responseUnitId": "5a1098b2-f331-41a2-9442-123456789abc",
  "notes": "Proceed with siren."
}
```
  * **Response (200 OK):** Sets status to `Dispatched`. Triggers WebSocket alert to response unit.

---

### 1.3 Response Unit Endpoints (Tablet / Field)
* **`PATCH /api/v1/assignments/:assignmentId/status`**
  * **Auth:** Bearer JWT (Role: `ResponseUnit`).
  * **Request Body:**
```json
{
  "status": "OnScene"
}
```
  * **Action:** Updates assignment and incident state machine to `Active`.

* **`POST /api/v1/incidents/:incidentId/field-assessment`**
  * **Auth:** Bearer JWT (Role: `ResponseUnit`).
  * **Request Body:**
```json
{
  "assignmentId": "b18b4562-5881-42cb-b1d1-678456201aef",
  "patientName": "Juan Dela Cruz",
  "approximateAge": 34,
  "gender": "Male",
  "consciousnessLevel": "Alert",
  "injuriesObserved": ["LacerationForehead", "SuspectedArmFracture"],
  "interventionsRendered": ["WoundDressing", "ArmSplint"],
  "disposition": "TransportedHealthCenter",
  "destinationFacility": "Tagoloan Municipal Health Center",
  "notes": "Patient conscious and stable."
}
```
  * **Action:** Stores the Pre-Hospital Care Report. Updates incident status from `Active` to `Resolved`. Triggers AI debrief generation.

---

## 2. RabbitMQ Message Broker Contracts

* **Exchange Name:** `derrcs.events`
* **Exchange Type:** `topic`

| Topic Routing Key | Publisher | Subscribers | Message Purpose |
|---|---|---|---|
| `report.ingested` | Ingestion Service (Node.js) | Candidate Detection (Python) | New raw citizen report ready for DBSCAN clustering |
| `candidate.created` | Candidate Detection (Python) | AI Summarizer, Socket.IO Service | New spatial cluster formed |
| `candidate.updated` | Candidate Detection (Python) | AI Summarizer, Socket.IO Service | Duplicate report attached to existing candidate |
| `incident.validated` | State Machine (Node.js) | Resource Allocator (Python) | Incident confirmed, trigger Hungarian algorithm |
| `assignment.recommended` | Resource Allocator (Python) | Socket.IO Service | Optimization engine suggests unit dispatch |
| `field.assessment.submitted` | Field Service (Node.js) | AI Summarizer, Socket.IO Service | On-scene care logged, trigger final debrief |

### Sample Payload: `report.ingested`
```json
{
  "eventId": "evt-771239",
  "timestamp": "2026-09-14T14:23:10.120Z",
  "reportId": "8f3b23c0-30f1-419b-b56e-6c61f22e3cf7",
  "emergencyType": "Fire",
  "coordinates": {
    "latitude": 8.5385,
    "longitude": 124.7533
  }
}
```

### Sample Payload: `assignment.recommended`
```json
{
  "eventId": "evt-771255",
  "incidentId": "d3b07384-d113-4c4b-b82c-63b79823901a",
  "recommendedUnitId": "5a1098b2-f331-41a2-9442-123456789abc",
  "estimatedTravelTimeMinutes": 4.5,
  "optimizationScore": 0.94
}
```

---

## 3. Real-Time WebSocket Events (Socket.IO)

* **`dispatcher:candidate:new`** — Pushes new clustered candidate with AI summary to dashboard map.
* **`dispatcher:incident:escalated`** — Pushes visual alarm when an incident exceeds timeout thresholds.
* **`unit:dispatch:alert`** — Pushes notification to assigned responder tablet.
* **`dispatcher:field:resolved`** — Pushes casualty assessment and resolution notice to dashboard.
