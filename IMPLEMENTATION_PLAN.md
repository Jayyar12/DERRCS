# DERRCS Phased Implementation Plan

This plan organizes the development of the Digital Emergency Reporting and Response Coordination System (DERRCS) into five sequential phases. Each phase delivers a functional, testable milestone.

---

## Phase 1: Core Backend & Database Persistence (COMPLETED)

### Goal
Replace mock handlers with real PostgreSQL queries, secure authentication, and file upload storage.

### Deliverables
1. **Database Connection Pool**
   * Create `services/ingestion/src/config/db.js` using the `pg` library.
   * Export query helper functions and test database connectivity on startup.
   * Map database parameters directly from [.env](file:///home/jay/Documents/Projects/Digital_Emergency_Reporting_and_Response_Coordination_System/.env#L12-L17).

2. **Authentication & Authorization System**
   * Create authentication routes in `services/ingestion/src/routes/auth.js` (`POST /api/v1/auth/login`).
   * Validate user credentials against the `users` table using `bcryptjs`.
   * Issue signed JSON Web Tokens containing the user ID, username, and role.
   * Create middleware in `services/ingestion/src/middleware/auth.js` to enforce role permissions (`Dispatcher`, `ResponseUnit`, `Admin`).

3. **Citizen Report Ingestion with Spatial Data**
   * Configure `multer` storage in `services/ingestion/src/middleware/upload.js` to save uploaded photos into `uploads/`.
   * Update `POST /api/v1/reports` in `services/ingestion/src/index.js` to insert records into the `reports` table.
   * Store coordinates as PostGIS spatial points using `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`.
   * Return the generated `reportId` and timestamp to the citizen client.

4. **Core Incident & Unit Management Endpoints**
   * Implement `GET /api/v1/candidates` to fetch active clusters from `incident_candidates`.
   * Implement `POST /api/v1/candidates/:candidateId/confirm` to create an entry in `incidents` with status `Validated`.
   * Implement `GET /api/v1/units` to list available response vehicles and teams.
   * Implement `POST /api/v1/incidents/:incidentId/assign` to insert records into `assignments` with status `Dispatched`.
   * Implement `PATCH /api/v1/assignments/:assignmentId/status` for responders to toggle `OnScene`.
   * Implement `POST /api/v1/incidents/:incidentId/field-assessment` to record pre-hospital casualty data in `field_assessments` and transition the incident to `Resolved`.

---

## Phase 2: Message Broker & Algorithmic Microservices (COMPLETED)

### Goal
Connect the Node.js ingestion backend with the Python algorithmic worker through RabbitMQ.

### Deliverables
1. **RabbitMQ Messaging Configuration in Node.js**
   * [x] Create `services/ingestion/src/config/rabbitmq.js` using `amqplib`.
   * [x] Assert the topic exchange `derrcs.events`.
   * [x] Publish `report.ingested` whenever a citizen submits a valid emergency report.
   * [x] Publish `incident.validated` when a dispatcher confirms an incident candidate.
   * [x] Publish `field.assessment.submitted` when a responder submits a casualty assessment.

2. **Python RabbitMQ Worker Service**
   * [x] Create `services/algorithms/src/worker.py` using `pika`.
   * [x] Connect to RabbitMQ using credentials from `.env`.
   * [x] Subscribe to `report.ingested`, `incident.validated`, and `field.assessment.submitted`.

3. **Streaming DBSCAN Worker Pipeline**
   * [x] Wire `services/algorithms/src/clustering.py` into the `report.ingested` queue handler.
   * [x] Query existing active `incident_candidates` and recent unclustered reports from PostgreSQL.
   * [x] Attach reports to existing candidates if within 100 meters, otherwise run DBSCAN.
   * [x] Insert new clusters into `incident_candidates` AND create linked `incidents` at `Reported`.
   * [x] Publish `candidate.created` or `candidate.updated` back to RabbitMQ.

4. **Resource Allocation Engine Integration**
   * [x] Wire `services/algorithms/src/allocation.py` into the `incident.validated` consumer.
   * [x] Retrieve active available units from `response_units` and compute travel distances.
   * [x] Execute the Modified Hungarian Algorithm to find optimal unit pairings.
   * [x] Publish `assignment.recommended` containing the recommended unit ID and travel time.

5. **AI Summarizer & Fallback Worker**
   * [x] Wire `services/algorithms/src/summarizer.py` into `candidate.created` and `field.assessment.submitted`.
   * [x] Query PostgreSQL for the full report details before summarizing.
   * [x] Request structured summaries from the Google Gemini API.
   * [x] Switch to deterministic template summaries if Gemini exceeds 2 seconds or errors.
   * [x] Save output text into the `summaries` table.

---

## Phase 3: State Machine, Escalation Alarms & WebSockets

### Goal
Enforce strict lifecycle rules and push real-time updates to connected clients.

### Deliverables
1. **Incident State Machine Enforcement**
   * Create `services/ingestion/src/services/stateMachine.js`.
   * Restrict status changes to valid transitions: `Reported` -> `Validated` -> `Dispatched` -> `Active` -> `Resolved` -> `Closed`.
   * Reject invalid transitions with clear HTTP error responses.
   * Write every state change to the `activity_logs` table for auditing.

2. **Automated Escalation Timers**
   * Implement a background interval in Node.js to scan open incidents every 30 seconds.
   * Detect incidents waiting in `Reported` state over 5 minutes without dispatcher review.
   * Detect incidents waiting in `Validated` state over 10 minutes without assigned units.
   * Increment `escalation_level` in `incidents` and emit `dispatcher:incident:escalated`.

3. **Socket.IO Event Distribution**
   * Wire RabbitMQ event consumers to Socket.IO broadcasts in `services/ingestion/src/index.js`.
   * Broadcast `dispatcher:candidate:new` when Python finishes clustering a new emergency.
   * Broadcast `unit:dispatch:alert` directly to the assigned response unit's socket room.
   * Broadcast `dispatcher:field:resolved` when responders complete on-scene assessments.

---

## Phase 4: Frontend Web Applications (React + Tailwind CSS + Leaflet)

### Goal
Build user interfaces for citizens, dispatchers, responders, and administrators.

### Deliverables
1. **Frontend Infrastructure Setup**
   * Configure Tailwind CSS inside `services/frontend`.
   * Install `react-router-dom`, `leaflet`, `react-leaflet`, and `socket.io-client`.
   * Create an API client in `services/frontend/src/api/client.js` with automatic JWT token attachment.
   * Establish a persistent Socket.IO client in `services/frontend/src/api/socket.js`.

2. **Citizen Reporting Progressive Web App (PWA)**
   * Create `services/frontend/src/pages/CitizenReport.jsx`.
   * Implement a multi-step form: emergency type picker, short description, photo capture, and EMT questions.
   * Use HTML5 Geolocation to detect user coordinates.
   * Provide an interactive Leaflet map pin-drop so citizens can adjust the exact disaster location.
   * Display a clean submission confirmation screen with the tracking identifier.

3. **MDRRMO Dispatcher Command Dashboard**
   * Create `services/frontend/src/pages/DispatcherDashboard.jsx`.
   * Build an interactive full-screen Leaflet map displaying Tagoloan barangay boundaries and color-coded incident markers.
   * Build the Candidate Review drawer displaying incoming report counts, individual submissions, and the AI summary card.
   * Build the Candidate Confirmation dialog to validate incidents with one click.
   * Build the Resource Dispatch panel showing Hungarian algorithm recommendations with manual override options.
   * Add audiovisual banner alerts when the server emits `dispatcher:incident:escalated`.

4. **Response Unit Field Interface**
   * Create `services/frontend/src/pages/ResponderPortal.jsx` optimized for touch tablets and phones.
   * Display assigned emergency details, location coordinates, and caller notes.
   * Add large action buttons for unit status toggling: "En Route" and "Arrived on Scene".
   * Build the Digital Field Casualty Assessment Form (Pre-Hospital Care Report) with checklist selectors for injuries and treatments.
   * Submit completed casualty assessments to resolve the incident.

5. **Authentication & Administration Screens**
   * Create `services/frontend/src/pages/Login.jsx` for dispatchers, responders, and administrators.
   * Create `services/frontend/src/pages/AdminDashboard.jsx` to manage user accounts, inspect audit logs, and tune algorithm parameters.

---

## Phase 5: Verification, Load Testing & Field Simulation

### Goal
Validate system reliability, algorithm performance, and end-to-end disaster response workflows.

### Deliverables
1. **Disaster Simulation Execution**
   * Execute `scripts/simulate_disaster.py` to fire concurrent emergency reports into Tagoloan barangays.
   * Confirm that the streaming DBSCAN algorithm groups duplicate calls within the 100 ms target window.
   * Confirm that the Modified Hungarian algorithm pairs units with validated incidents accurately.

2. **AI Fallback Verification**
   * Run test cases with an invalid or disabled `GEMINI_API_KEY`.
   * Verify that the worker saves template fallback summaries without crashing the queue.

3. **End-to-End Workflow Dry Run**
   * Submit a citizen emergency report from the mobile PWA view.
   * Review and confirm the candidate cluster on the Dispatcher Dashboard.
   * Accept the recommended unit assignment.
   * Change status to "Arrived on Scene" on the responder tablet view.
   * Submit a Field Casualty Assessment and verify that the incident moves to `Resolved`.
   * Verify that the dispatcher can close the incident and inspect the audit log.
