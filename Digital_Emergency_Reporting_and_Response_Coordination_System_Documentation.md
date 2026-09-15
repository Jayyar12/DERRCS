# Digital Emergency Reporting and Response Coordination System

## System Proposal

**Course/Subject:** Integrative Programming and Technologies

### Project Team

- Guiroy, Jay-ar T.
- Gumapal, Krizza L.
- Oclarit, Fritz M.
- Casas, Ivan Rey
- Regidor, Millan

---

## 1. Introduction

### 1.1 Background

The **Digital Emergency Reporting and Response Coordination System (DERRCS)** is a centralized digital system designed to manage the full lifecycle of emergency incidents, from citizen reporting through responder resolution. The system is specifically designed to support disaster coordination at the barangay and municipal level in Tagoloan, Misamis Oriental.

### 1.2 Current Problem

During major disasters, coordination centers may receive large numbers of duplicate reports describing the same incident. Dispatchers have difficulty determining which reports refer to the same event. As a result, multiple response units may be sent to one location while other emergencies receive insufficient or delayed attention.

### 1.3 Need for the System

Without a centralized system, emergency information is difficult to organize and resources may be inefficiently allocated. The proposed system addresses this information bottleneck by standardizing emergency data and automatically grouping related reports for dispatcher review.

### 1.4 Target Users

The system is intended for:

- Citizens
- MDRRMO Dispatchers
- Response Units
- Administrators

### 1.5 Glossary

| Term | Definition |
|---|---|
| **MDRRMO** | Municipal Disaster Risk Reduction and Management Office — the local government unit responsible for disaster preparedness and emergency response at the municipal level. |
| **NDRRMC** | National Disaster Risk Reduction and Management Council — the national-level agency responsible for disaster management policy and coordination in the Philippines. |
| **DERRCS** | Digital Emergency Reporting and Response Coordination System — the system described in this document. |
| **PWA** | Progressive Web App — a web application that uses modern browser capabilities to deliver a mobile-app-like experience without requiring installation from an app store. |
| **DBSCAN** | Density-Based Spatial Clustering of Applications with Noise — a clustering algorithm that groups data points based on spatial density without requiring the number of clusters to be specified in advance. |
| **Streaming DBSCAN** | A variant of DBSCAN that processes incoming data points incrementally as they arrive, rather than requiring the full dataset upfront. This enables real-time clustering of incoming reports. |
| **Hungarian Algorithm** | An optimization algorithm that solves the assignment problem by finding the optimal one-to-one matching between two sets (e.g., response units and incidents) that minimizes total cost. |
| **PostGIS** | A spatial database extension for PostgreSQL that adds support for geographic objects, enabling location-based queries such as proximity searches and boundary validation. |
| **JWT** | JSON Web Token — a compact, URL-safe token format used to securely transmit authentication and authorization claims between services. |
| **LLM** | Large Language Model — an AI model trained on large text datasets that can generate, summarize, and analyze natural language text. |
| **Incident Candidate** | A group of related reports identified by the streaming DBSCAN algorithm that potentially describe the same emergency. An incident candidate becomes a confirmed incident after dispatcher review. |
| **PCR / Field Assessment** | Pre-Hospital Care Report / Field Casualty Assessment — a standardized assessment form completed by responders on-scene detailing victim status, injuries, on-site treatments, and hospital transit information. |

---

## 2. Background of the System

### 2.1 Organization and Environment

The system is intended for the Municipal Disaster Risk Reduction and Management Office (MDRRMO) of Tagoloan, Misamis Oriental, and its associated disaster coordination centers and local government response teams responsible for emergency dispatches during major incidents.

### 2.2 Existing Process

Citizens currently report emergencies through channels such as:

- Phone calls
- Text messages
- Two-way radios

Dispatchers manually record these reports and determine whether each incoming report represents a new incident or an existing one. Once response teams are deployed, casualty information and patient assessments are recorded using paper forms on the scene.

### 2.3 Existing Tools

The current process relies primarily on:

- Emergency hotlines
- SMS
- Two-way radios
- Manual dispatch logs
- Paper-based Pre-Hospital Care Reports (PCR)

### 2.4 Limitations of the Existing Process

The manual process creates several operational limitations:

- Duplicate reports are difficult to track at scale.
- Response resources may be allocated inefficiently.
- Response times may increase.
- Citizens requiring immediate assistance may experience delays.
- Dispatchers lack a consolidated view of all active incidents across the municipality.
- Paper-based on-scene casualty assessments are slow to communicate back to dispatch and receiving medical facilities.

---

## 3. Problem Statement

During a major disaster, a coordination center may receive hundreds to thousands of reports within minutes to hours, depending on the scale of the event and the population density of the affected area. Dispatchers have no reliable automated mechanism for determining which reports describe the same incident.

For example, hundreds of citizens may report the same collapsed building. Without automated grouping, these submissions may appear to be hundreds of separate emergencies.

This information-management problem can result in multiple response units being dispatched to the same location while other critical areas wait for assistance. Furthermore, once units arrive, on-scene victim assessments and status updates are frequently hindered by verbal radio delays or paper documentation bottlenecks.

The system therefore needs to organize incoming emergency reports, identify related submissions, support efficient allocation of response units, and digitize the on-scene casualty assessment workflow.

---

## 4. Proposed Solution

The proposed system will:

1. Provide a centralized platform for managing the full lifecycle of emergency incidents.
2. Allow citizens to submit emergency reports through a mobile-responsive Progressive Web App (PWA) without requiring an account.
3. Normalize incoming reports and process them through an incident candidate detection engine to identify related or duplicate submissions.
4. Provide dispatchers with a real-time dashboard containing visual map clustering and incident updates.
5. Recommend optimal response-unit assignments using a modified Hungarian algorithm intended to minimize total response time across active incidents. Dispatchers review and confirm or adjust recommendations before dispatch.
6. Provide response units with a dedicated field interface to log arrival, conduct on-scene casualty assessments (Pre-Hospital Care Reports), and record emergency resolutions directly from mobile devices or tablets.
7. Generate AI-powered summaries of grouped citizen reports for dispatchers, as well as consolidated incident and hospital-handover briefings from on-scene field assessments.

---

## 5. Objectives

### 5.1 General Objective

To design and develop a **Digital Emergency Reporting and Response Coordination System** that improves disaster response by automatically identifying duplicate reports, summarizing emergency data using AI, streamlining response-unit allocation, and digitizing on-scene field casualty reporting.

### 5.2 Specific Objectives

The system aims to:

1. Develop a mobile-responsive PWA reporting channel that distinguishes the reporter's location from the actual emergency location.
2. Implement an incident candidate detection engine using **streaming DBSCAN**, a variant of the DBSCAN density-based clustering algorithm that processes incoming data points incrementally rather than requiring the full dataset upfront. This allows the engine to group nearby reports in real time without requiring the number of incidents to be known in advance.
3. Create an **Incident State Machine** that tracks emergencies through six defined stages:
   - Reported
   - Validated
   - Dispatched
   - Active
   - Resolved
   - Closed
4. Build a real-time dispatcher dashboard for reviewing incident candidates and confirming incidents.
5. Develop a resource allocation service using a **modified Hungarian algorithm** — extended to handle unbalanced assignment matrices where the number of available response units may not equal the number of active incidents — to recommend response-unit assignments while minimizing total response time.
6. Build a digital **Field Casualty Assessment (Pre-Hospital Care Report)** interface for response units on tablets/mobile devices to record victim status, injuries, and treatments on-scene before marking an incident resolved.
7. Implement an **AI-powered summarization service** that consolidates grouped citizen reports for dispatchers and generates structured medical/incident briefings from field responder assessments.
8. Secure the system against false reports and abuse through rate limiting, temporary session identifiers, and role-based access control.

---

## 6. Scope of the System

The system covers the following components and functions:

- Mobile-responsive Progressive Web App (PWA) reporting interface for citizens
- Ingestion and data normalization service
- Incident Candidate Detection using streaming DBSCAN
- AI-powered incident summarization and briefing generation
- Incident State Machine with automated escalations and resolution logging
- Resource Allocation Engine using the modified Hungarian algorithm
- Dispatcher dashboard with real-time WebSocket updates
- Response Unit field interface with digital casualty and Pre-Hospital Care logging
- Visual map clustering
- Role-based authorization

---

## 7. System Limitations

The proposed system has the following limitations:

1. Citizens require internet connectivity to submit reports.
2. Location accuracy depends on GPS availability or the accuracy of manually selected map locations.
3. False reports cannot be completely eliminated and still require human review by MDRRMO personnel.
4. The system is designed for barangay and municipal-level operations rather than enterprise-level national agencies.
5. AI-generated summaries depend on the availability of the large language model (LLM) API; a template-based fallback is used when the API is unreachable.
6. The on-scene casualty assessment feature is designed for emergency field triage and patient transfer documentation rather than full-scale hospital Electronic Medical Records (EMR).

---

## 8. User Roles and Responsibilities

| User Role | Responsibilities |
|---|---|
| **Administrator** | Manages system roles, user access, and backend configurations. |
| **MDRRMO Dispatcher** | Reviews incident candidates and AI-generated summaries, confirms incidents, and reviews or adjusts AI-recommended response-unit assignments before dispatch. |
| **Response Unit** | Receives field assignments via mobile/tablet, updates real-time operational status (e.g., Arrived, En Route), and submits digital on-scene casualty assessments and resolution reports. |
| **Citizen** | Submits emergency reports and photos through the PWA interface without creating an account. |

---

## 9. Major System Features

### 9.1 Citizen Reporting

Citizens can report emergencies through a mobile-responsive Progressive Web App (PWA) without creating an account. The reporting process presents standardized questions relevant to the selected emergency type, based on operational requirements gathered through MDRRMO stakeholder interviews.

### 9.2 Location Separation

The system records the physical location of the emergency separately from the location of the person submitting the report.

### 9.3 Incident Candidate Detection Engine

The system uses streaming DBSCAN to identify potentially related or duplicate reports. Streaming DBSCAN processes each incoming report incrementally against existing clusters using two key parameters: **ε (epsilon)**, which defines the maximum geographic radius for considering two reports as neighbors, and **minPts**, which sets the minimum number of reports required to form a cluster. These parameters are configurable and may be tuned based on Tagoloan's geographic characteristics and the spatial signatures of different emergency types.

The proposed system targets incident candidate detection within 100 milliseconds per incoming report, which allows the system to sustain a throughput of at least 10 reports per second during peak disaster periods while remaining well within the two-second end-to-end latency budget.

### 9.4 Incident State Machine

Incidents follow a defined six-stage lifecycle:

**Reported → Validated → Dispatched → Active → Resolved → Closed**

The valid state transitions and their triggers are:

| From | To | Trigger |
|---|---|---|
| Reported | Validated | Dispatcher reviews and confirms the incident candidate |
| Validated | Dispatched | Resource Allocation Engine recommends assignment and dispatcher confirms |
| Dispatched | Active | Response unit arrives on scene and toggles status to "Arrived" |
| Active | Resolved | Response unit completes on-scene intervention and submits the Digital Field Casualty Assessment |
| Resolved | Closed | Dispatcher or administrator reviews the final incident record and closes the file |
| Reported | Escalated (re-notify) | Incident remains in Reported state beyond a configurable threshold (default: 5 minutes) without dispatcher action |
| Validated | Escalated (re-notify) | Incident remains in Validated state beyond a configurable threshold (default: 10 minutes) without dispatch |

The state machine supports automatic escalation of incidents that remain in the Reported or Validated state beyond a configurable time threshold without dispatcher action. Escalation triggers a re-notification to the dispatcher dashboard and, if the incident remains unattended after a second threshold, alerts the administrator.

### 9.5 Real-Time Broadcasting

WebSockets are used to push incident state changes and dispatch alerts to active users in real time.

### 9.6 Smart Resource Allocation

A modified Hungarian algorithm recommends response-unit assignments with the objective of minimizing total response time across active incidents. The standard Hungarian algorithm requires a balanced assignment matrix (equal number of units and tasks). The modification extends the algorithm to handle unbalanced matrices where the number of available response units does not equal the number of active incidents, using dummy rows or columns to pad the cost matrix. Dispatchers review the recommendations and confirm, adjust, or override assignments before dispatch.

### 9.7 Abuse Protection

Server-side rate limiting and temporary session identifiers provide protection against basic spam and abuse attempts.

### 9.8 Visual Map Clustering

The dispatcher dashboard groups nearby map markers visually so that the map remains readable during events involving many reports or incidents.

### 9.9 AI-Powered Incident Summarization & Briefing

The AI summarization service operates at two critical junctures:
1. **Intake Candidate Summaries:** When streaming DBSCAN groups multiple citizen submissions, the AI generates a single concise paragraph detailing incident type, location, affected count, and hazards so dispatchers do not need to read dozens of redundant reports. Summaries are refreshed every 5 new reports or every 2 minutes.
2. **Post-Response & Handover Briefings:** When responders submit their field casualty report, the AI synthesizes both the citizen reports and responder findings into a structured debriefing and hospital pre-arrival handover summary (e.g., patient condition, interventions performed, and transit destination).

If the LLM API is unreachable, a structured template-based summary is automatically produced as a fallback.

### 9.10 Digital Field Casualty Assessment (Pre-Hospital Care Logging)

When response teams reach an incident scene, designated field personnel use an authenticated tablet/mobile interface to record victim status and medical assessments based on standardized MDRRMO Pre-Hospital Care protocols:
- **Patient Profile:** Name/identity (if obtainable), approximate age group, and gender.
- **Triage & Consciousness:** Neurological response using standard scales (e.g., AVPU: Alert, Verbal, Pain, Unresponsive).
- **Primary Injuries:** Checklist of observed traumas (lacerations, fractures, burns, head trauma, respiratory distress).
- **On-Scene Interventions:** Checklist of actions taken (wound dressing, cervical collar, splinting, CPR, oxygen therapy).
- **Patient Disposition:** Treated on-scene, transferred to Tagoloan Municipal Health Center, transported to Northern Mindanao Medical Center (NMMC), or refused care.

Submitting this assessment completes on-scene operations and transitions the incident from **`Active` to `Resolved`**.

---

## 10. System Architecture

### 10.1 Architecture Overview

The proposed data flow is:

```text
User (Citizen / Responder)
  ↓
Frontend (React PWA)
  ↓
Ingestion Service
  ↓
Message Broker (RabbitMQ)
  ├──→ Incident Candidate Detection (Python, streaming DBSCAN)
  ├──→ AI Summarization Service (Python, Gemini API)
  ├──→ Incident State Machine (Node.js)
  └──→ Resource Allocation Engine (Python, modified Hungarian)
         ↓
     Database (PostgreSQL + PostGIS)
         ↓
     Broadcast Service (Socket.IO)
         ↓
     Dispatcher Dashboard / Response Unit Field Interface
```

Citizens access the public reporting module via PWA, while authenticated responders access the field operations interface. Ingestion standardizes all payloads before forwarding them to RabbitMQ, which fans out events to parallel services. The Incident State Machine coordinates transitions, and Socket.IO pushes live updates across all connected clients.

### 10.2 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Progressive Web App), Leaflet.js |
| **Backend** | Node.js, Python |
| **AI / LLM** | Google Gemini API |
| **Message Broker** | RabbitMQ |
| **Database** | PostgreSQL with PostGIS |
| **Real-Time Communication** | WebSocket via Socket.IO |
| **Deployment** | Docker |

### 10.3 Latency Budget

The proposed system targets an end-to-end delay of less than two seconds between a citizen report submission and the corresponding dispatcher notification. The estimated latency budget is as follows:

| Stage | Estimated Latency |
|---|---|
| Ingestion and normalization | ~200 ms |
| RabbitMQ routing | ~50 ms |
| Streaming DBSCAN processing | ~100 ms |
| AI summary generation | ~500 ms |
| Database write | ~100 ms |
| WebSocket broadcast | ~100 ms |
| **Total estimated** | **~1,050 ms** |

This budget allocates approximately 50% of the two-second target to AI summary generation, which is the most variable stage. The template-based fallback eliminates this stage entirely when needed, reducing the estimated total to approximately 550 ms.

---

## 11. Integrative Technologies

### 11.1 Frontend

**React** provides the user interfaces for citizens, dispatchers, response units, and administrators.

**Leaflet.js** provides map functionality and visual marker clustering.

### 11.2 Backend and Microservices

The backend is divided into isolated services.

- **Node.js** handles event-driven input/output operations, field assessment submissions, and broadcasting.
- Node.js also drives the Incident State Machine, including timed escalations and state transitions.
- **Python** executes the computational logic for streaming DBSCAN and the modified Hungarian algorithm.

### 11.3 Message Broker

**RabbitMQ** routes messages between services. The architecture avoids requiring services to call one another directly, which means individual services can be developed, tested, deployed, and scaled without coordinating releases across the entire system.

### 11.4 Database

**PostgreSQL** stores standard application records.

**PostGIS** provides spatial capabilities for operations such as GPS coordinate proximity searches and operational-boundary validation.

### 11.5 Real-Time Communication

**Socket.IO** streams events to connected clients, including incident state changes, new incident candidate notifications, field status updates from response units, and updated AI summaries.

### 11.6 Infrastructure

**Docker** isolates application dependencies for the Python, Node.js, and database components and supports containerized deployment.

### 11.7 Artificial Intelligence

The **Google Gemini API** provides the large language model backend for the AI Summarization Service. Gemini was selected for its generous free-tier quota, which is sufficient for the projected summarization volume of a municipal-level system. The service is implemented in Python to share infrastructure with the Candidate Detection and Resource Allocation services. It consumes messages from RabbitMQ and writes generated summaries to the `Summaries` table in PostgreSQL. A template-based fallback is implemented at the application layer to ensure uninterrupted operation when the Gemini API is temporarily unavailable.

---

## 12. Database Design

### 12.1 Major Tables

The proposed database contains the following major tables:

- `Users`
- `Roles`
- `Permissions`
- `Reports`
- `Incidents`
- `IncidentCandidates`
- `Summaries`
- `ResponseUnits`
- `Assignments`
- `FieldAssessments`
- `Notifications`
- `ActivityLogs`

### 12.2 Key Relationships

- A `Report` is initially linked to an `IncidentCandidate` during the detection phase. When a dispatcher confirms the incident candidate, two things happen: (1) a new `Incident` record is created from the candidate, and (2) all reports linked to that candidate are re-associated with the newly created `Incident`.
- An `Incident` can have multiple `Assignments`.
- `ResponseUnits` are associated with incidents through assignments.
- A `FieldAssessment` belongs to an `Incident` and is submitted by an assigned `ResponseUnit` upon completing on-scene victim care.
- A `User` has one `Role`.
- A `Role` has multiple `Permissions`.
- `Incidents` and `Reports` contain geometry data for spatial queries.
- A `Summary` initially belongs to an `IncidentCandidate`. When the candidate is confirmed and becomes an `Incident`, the associated summary is transferred to the `Incident`. Summaries are regenerated as new reports or field assessments are added.

### 12.3 Simplified Entity Relationship Diagram

```text
Users >── Roles ──< Permissions

Reports >── IncidentCandidates >── Incidents
Reports >── Incidents

IncidentCandidates ──< Summaries
Incidents ──< Summaries

Incidents ──< Assignments >── ResponseUnits
Incidents ──< FieldAssessments >── ResponseUnits

Users ──< ActivityLogs

Incidents ──< Notifications
```

---

## 13. System Workflow

The emergency-reporting and field response workflow is as follows:

```text
Citizen Opens PWA
       │
       ▼
Submits Report (type, location, photo(optional))
       │
       ▼
Ingestion Service normalizes data
       │
       ▼
Incident Candidate Detection Engine (streaming DBSCAN)
       │
       ├── Duplicate found?
       │       │
       │       └── Attach to existing Incident Candidate
       │               │
       │               ▼
       │       AI Summarization Service
       │       regenerates summary (if threshold met)
       │               │
       │               ▼
       │       Dispatcher notified of updated candidate
       │
       └── New cluster?
               │
               └── Create new Incident Candidate
                       │
                       ▼
               AI Summarization Service
               generates incident summary
                       │
                       ▼
               Notify Dispatcher
               (summary + grouped reports)
                       │
                       ▼
               Dispatcher reviews summary
               and incident candidate
                       │
                       ▼
               Confirms Incident
                       │
                       ▼
               Resource Allocation Engine
               (modified Hungarian algorithm)
               recommends assignment
                       │
                       ▼
               Dispatcher reviews and confirms
               Response Unit assigned
               Status: Dispatched
                       │
                       ▼
               Unit arrives on scene
               Status: Active
                       │
                       ▼
               Responders treat casualties & conduct interview
               Submits Digital Field Assessment (PCR)
                       │
                       ▼
               AI generates Handover / Resolution Briefing
               Status: Resolved
                       │
                       ▼
               Dispatcher reviews outcome
               Status: Closed
                       │
                       ▼
               Report archived for MDRRMO analytics
```

---

## 14. User Interface Design

The proposed system includes the following interfaces:

### 14.1 Login

Provides role-based authentication for dispatchers, response units, and administrators.

### 14.2 Dispatcher Dashboard

Provides a live map with clustered incident markers, AI-generated incident summaries, active unit telemetry, and an incident candidate review panel.

### 14.3 Citizen Report Form

Provides a stepped reporting form whose questions adapt to the selected emergency type. The standardized questions presented in each form step are based on operational requirements gathered through stakeholder interviews with MDRRMO officers. This ensures that submitted reports contain the information dispatchers need to assess and respond to emergencies.

### 14.4 Incident Details View

Displays the incident timeline, AI-generated summary, assigned response units, duplicate reports linked to the incident, and completed field casualty assessments.

### 14.5 Incident Candidate Review

Provides a side-by-side view of raw reports grouped by the incident candidate detection engine, along with the AI-generated summary of the grouped reports.

### 14.6 Response Unit Field Interface & Casualty Logging

Provides authenticated responders on tablets or mobile phones with a simplified, high-contrast field screen showing:
- Assigned incident details and navigation location
- One-tap status updates ("En Route", "Arrived on Scene")
- Digital Field Casualty Assessment Form (Pre-Hospital Care Report) for rapid logging of patient consciousness, injuries, on-site treatments, and transit destination
- "Resolve Incident" submission button

### 14.7 Reports and Analytics

Provides historical incident information, response-time metrics, casualty summaries, and data export options for municipal reporting.

### 14.8 User Management

Allows authorized administrators to add, edit, and deactivate users and assign roles and permissions.

---

## 15. Security Features

The proposed security controls include:

1. **JWT Authentication** — API calls are authenticated using JSON Web Tokens.
2. **Role-Based Authorization** — Controls which screens and actions are available to each user role.
3. **Password Hashing** — Passwords are hashed using bcrypt before storage.
4. **Input Validation and Sanitization** — Report and casualty assessment fields are validated and sanitized to reduce injection risks.
5. **Rate Limiting** — The public reporting endpoint is rate-limited to reduce spam submissions.
6. **Temporary Session Identifiers** — Anonymous citizen reporters can submit reports without an account or permanent tracking.
7. **Inter-Service Authentication** — Services authenticate API communication using token headers.
8. **PostGIS Boundary Validation** — Coordinates outside the operational area are rejected.
9. **Audit Logging** — Dispatcher, responder, and administrator actions are recorded with timestamps.
10. **Secure Session Management** — Short token expiry and refresh-token rotation are specified.

---

## 16. Development Methodology

The project follows a **phased development** approach structured around eight sequential phases, with each phase building upon the deliverables of the previous phase. Within the Development phase (Phase 4), services are built in parallel to maximize the team's eight-week build window.

### Phase 1 — Planning (Week 1)

- Define the project scope.
- Assign project roles.
- Set up the project board.
- Establish the project repository.

### Phase 2 — Requirements Gathering (Week 1)

- Interview MDRRMO dispatchers to gather standardized citizen reporting questions and operational requirements.
- Review MDRRMO Pre-Hospital Care Report (PCR) forms to standardize field casualty assessment inputs.
- Document user stories based on interview findings.

### Phase 3 — System Design (Week 2)

- Finalize the database schema (including `FieldAssessments`).
- Define service boundaries and API contracts.
- Prepare UI wireframes for citizen reporting, dispatcher dashboard, and responder field tablet.

### Phase 4 — Development (Weeks 3–6)

- Develop services in parallel.
- Use Docker for the development environment.
- Integrate services through RabbitMQ.

### Phase 5 — Testing (Week 7)

- Perform functional testing across citizen and responder workflows.
- Perform integration testing with RabbitMQ and WebSocket broadcasts.
- Perform security and input sanitization testing.
- Perform performance testing according to the testing plan.

### Phase 6 — Deployment (Week 8)

- Containerize the services.
- Deploy the system to a staging environment.
- Prepare the environment for acceptance testing with MDRRMO stakeholders.

### Phase 7 — Evaluation (Post Week 8)

- Gather feedback from dispatchers and response personnel.
- Measure response-time improvements and field documentation efficiency.

### Phase 8 — Maintenance (Post Week 8)

- Monitor system logs.
- Fix reported issues.
- Add features based on field feedback.

---

## 17. Development Timeline

| Week | Phase(s) | Activities |
|---|---|---|
| **Week 1** | Phases 1–2 | Requirements gathering, MDRRMO stakeholder interviews, PCR form review, and project planning |
| **Week 2** | Phase 3 | Database schema design, API contract definition, and UI wireframes (Dashboard, Citizen PWA, Responder Tablet) |
| **Week 3** | Phase 4 | Ingestion Service, data normalization, and public reporting API development |
| **Week 4** | Phase 4 | Incident Candidate Detection Engine (streaming DBSCAN) development |
| **Week 5** | Phase 4 | Incident State Machine, AI Summarization Service, and Resource Allocation Service (modified Hungarian algorithm) |
| **Week 6** | Phase 4 | Dispatcher Dashboard, Citizen Report Form, Response Unit Field Interface (Casualty Logging), and WebSocket integration |
| **Week 7** | Phase 5 | Integration testing, security review, and bug fixing |
| **Week 8** | Phase 6 | User Acceptance Testing with MDRRMO staff and deployment to staging |

**Note:** Week 5 carries the highest delivery risk due to three concurrent workstreams. The AI Summarization Service has a template-based fallback that can serve as the Week 5 deliverable if Gemini API integration requires additional time.

**Note:** Evaluation (Phase 7) and Maintenance (Phase 8) begin after Week 8 and continue through the staging period rather than being included within the eight-week build schedule.

---

## 18. Testing Plan

### 18.1 Functional Testing

Verify that citizen reports, incident clustering, assignment recommendations, and responder casualty assessment forms operate according to documented requirements.

### 18.2 Integration Testing

Verify that services communicate correctly through RabbitMQ and that incident state changes propagate end-to-end from citizen submission to responder resolution.

### 18.3 Usability Testing

Have dispatchers, response unit personnel, and a sample of citizens perform key tasks on desktop and mobile devices, documenting areas where users encounter difficulty.

### 18.4 Security Testing

Test reporting and field assessment endpoints using input fuzzing, verify rate-limiting thresholds, and attempt unauthorized role escalation.

### 18.5 Performance Testing

Simulate mass report ingestion during a disaster scenario and measure:

- Streaming DBSCAN processing throughput against the 100 ms per-report target
- AI summary generation latency against the 500 ms estimate
- WebSocket broadcast latency
- End-to-end report-to-notification latency against the two-second target
- System behavior under high report volume (target: 10+ concurrent reports per second)

### 18.6 User Acceptance Testing

Deploy the system in a controlled environment where MDRRMO personnel can test citizen intake, dispatching, and field casualty reporting under realistic disaster simulation scenarios.

---

## 19. Expected Benefits

The proposed system is expected to provide the following benefits:

- Faster incident confirmation by grouping duplicate reports and providing AI-generated summaries before dispatcher review.
- Fewer unnecessary response-unit deployments through optimized allocation recommendations across active incidents.
- Improved data accuracy through structured emergency reporting based on MDRRMO-defined standardized questions.
- Streamlined pre-hospital care documentation through digital on-scene casualty assessments replacing handwritten logs.
- Centralized incident records accessible to dispatchers, field units, and administrators in real time.
- Enhanced hospital handover coordination via AI-synthesized field assessment briefings.
- Easier monitoring of active emergencies through a single map-based dashboard.
- Improved post-incident reporting using timestamped incident lifecycle data.
- Better decision-making because dispatchers can view AI summaries and the broader picture of active incidents before confirming assignments.

---

## 20. Expected Output

The expected output is a functional **Digital Emergency Reporting and Response Coordination System** capable of:

- Receiving citizen emergency reports through a Progressive Web App.
- Detecting and grouping duplicate submissions using streaming DBSCAN.
- Generating AI-powered summaries of grouped reports and field responder assessments.
- Tracking incidents through a six-stage lifecycle with automated escalations.
- Recommending response-unit assignments using a modified Hungarian algorithm, subject to dispatcher confirmation.
- Providing response units with a mobile field interface to record on-scene casualty assessments and emergency resolution.
- Presenting emergency information through a real-time web dashboard.
- Operating through a containerized microservice architecture.
- Applying role-based access control and other specified security measures.

---

## 21. Future Enhancements

Potential future enhancements include:

1. **Native Mobile Applications** — Develop dedicated iOS and Android applications for citizen reporting, particularly in areas with limited browser support.
2. **Push Notifications** — Notify nearby verified responders when an incident is confirmed in their area.
3. **Machine Learning Severity Classification** — Automatically classify report severity to assist dispatchers in prioritization.
4. **Advanced Analytics Dashboard** — Provide historical response-time trends, casualty statistics, and high-frequency incident zones.
5. **Hospital Portal Integration** — Provide receiving health centers and hospitals with direct read-only access to incoming Pre-Hospital Care Reports while the ambulance is en route.
6. **NDRRMC Integration** — Integrate with the national NDRRMC incident registry for cross-agency data sharing.
7. **Offline Report Queuing** — Store reports locally when connectivity is unavailable and upload them when a connection returns.
8. **Automated Cloud Backup** — Back up incident records, casualty assessments, and activity logs.
9. **QR Code Emergency Stations** — Provide QR codes at physical emergency stations so citizens can quickly access the reporting form.
10. **Shift and Event Summary Reports** — Use the AI summarization service to generate comprehensive post-event narrative reports summarizing all incidents, response actions, timelines, and outcomes for MDRRMO review.

---

## 22. Conclusion

The proposed **Digital Emergency Reporting and Response Coordination System** provides Tagoloan's MDRRMO with a centralized, AI-assisted platform for receiving emergency reports, automatically identifying duplicates, coordinating response-unit dispatch, and recording on-scene casualty assessments during disaster events.

The system combines **React, Node.js, Python, Google Gemini API, RabbitMQ, PostgreSQL with PostGIS, Socket.IO, and Docker** within a microservice architecture. It replaces manual processes such as phone-based logging, verbal dispatch, and handwritten pre-hospital paper records with a centralized and auditable digital workflow.

By automating report grouping, generating AI-powered incident and medical summaries, recommending optimized response-unit assignments, and digitizing field casualty documentation, the system is designed to help dispatchers and field responders operate more efficiently. Its modular architecture also allows individual services to be scaled or replaced without requiring the entire system to be rebuilt.

The proposed architecture provides a foundation for future capabilities such as hospital portal integration, native mobile applications, machine-learning-assisted severity classification, offline reporting, and integration with national emergency-management systems.
