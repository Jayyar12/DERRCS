# DERRCS — Project Context & System Ground Truth

This document serves as the absolute single source of truth for the Digital Emergency Reporting and Response Coordination System (DERRCS). All code, database designs, API contracts, and features must align with this document and `Digital_Emergency_Reporting_and_Response_Coordination_System_Documentation.md`.

---

## 1. Project Identity

* **Project Title:** Digital Emergency Reporting and Response Coordination System (DERRCS)
* **Subject:** Integrative Programming and Technologies
* **Target Jurisdiction:** Municipality of Tagoloan, Misamis Oriental, Philippines
* **Primary Partner Agency:** Tagoloan Municipal Disaster Risk Reduction and Management Office (MDRRMO)
* **Team Members:**
  * Guiroy, Jay-ar T. (Team Lead & System Architect)
  * Gumapal, Krizza L. (AI & Database Engineer)
  * Oclarit, Fritz M. (Backend & Algorithm Engineer)
  * Casas, Ivan Rey (Frontend Lead, Dispatcher Dashboard)
  * Regidor, Millan (Mobile PWA & Field Interface Lead)

---

## 2. Approved Technology Stack

Any addition of unlisted libraries or technologies requires explicit team approval.

| Layer | Approved Technology | Purpose |
|---|---|---|
| **Frontend** | React (Progressive Web App), Tailwind CSS | Single codebase for desktop dashboard and mobile field devices |
| **Map Rendering** | Leaflet.js | Map rendering, tile display, and marker clustering |
| **Primary Backend** | Node.js, Express | Ingestion service, state machine, auth, and API routing |
| **Algorithm Backend** | Python 3.10+ (NumPy, SciPy, Scikit-learn) | Streaming DBSCAN clustering and Hungarian optimization |
| **AI / LLM** | Google Gemini API (Gemini Flash) | Incident cluster summaries and responder handover debriefs |
| **Message Broker** | RabbitMQ | Decoupled asynchronous messaging between microservices |
| **Database** | PostgreSQL 15+ with PostGIS | Relational records and spatial geometry calculations (SRID 4326) |
| **Real-Time Layer** | Socket.IO (WebSockets) | Live dashboard alerts, map updates, and unit telemetry |
| **Containerization** | Docker, Docker Compose | Development parity and staging deployment |

---

## 3. User Roles and Permissions

The system defines four distinct user roles:

1. **Citizen (Public / Unauthenticated):**
   * Accesses public PWA reporting form without an account.
   * Receives temporary anonymous session identifier.
   * Can submit emergency type, GPS coordinates, photo, and standardized answers.
2. **MDRRMO Dispatcher (Authenticated):**
   * Monitors live map and active incident candidate clusters.
   * Reads AI-generated cluster summaries.
   * Confirms incident candidates into active incidents.
   * Reviews and confirms AI-recommended response unit assignments.
3. **Response Unit (Authenticated, Mobile/Tablet):**
   * Receives assigned emergency dispatches.
   * Toggles operational status ("En Route", "Arrived on Scene").
   * Submits the digital Field Casualty Assessment Form (Pre-Hospital Care Report).
   * Marks incidents as "Resolved".
4. **Administrator (Authenticated):**
   * Manages user accounts, roles, and access credentials.
   * Configures system threshold parameters (escalation times, clustering radius).
   * Views audit logs, system performance metrics, and historical archives.

---

## 4. Incident Lifecycle State Machine

Every emergency incident strictly follows this six-stage state machine:

$$\text{Reported} \longrightarrow \text{Validated} \longrightarrow \text{Dispatched} \longrightarrow \text{Active} \longrightarrow \text{Resolved} \longrightarrow \text{Closed}$$

### Transition Rules:
* **Reported $\rightarrow$ Validated:** Dispatcher reviews and confirms the incident candidate.
* **Validated $\rightarrow$ Dispatched:** Dispatcher confirms response unit assignment.
* **Dispatched $\rightarrow$ Active:** Response unit arrives on scene and toggles "Arrived".
* **Active $\rightarrow$ Resolved:** Response unit submits completed Field Casualty Assessment.
* **Resolved $\rightarrow$ Closed:** Dispatcher or administrator reviews the incident record and closes it.
* **Escalation Trigger 1:** Incident remains in `Reported` state over 5 minutes without dispatcher review. System sends alert to dispatcher.
* **Escalation Trigger 2:** Incident remains in `Validated` state over 10 minutes without dispatch. System alerts dispatcher and administrator.

---

## 5. Core Algorithmic Logic

### 5.1 Streaming DBSCAN (Duplicate Detection)
* **Goal:** Group incoming reports that describe the same physical event within 100 milliseconds.
* **Parameters:**
  * $\epsilon$ (Epsilon): Maximum distance radius between reports (default: 100 meters).
  * $minPts$: Minimum reports required to mark an incident cluster (default: 2 reports).
* **Behavior:** Points that do not meet $minPts$ remain as single-report candidates. Points meeting criteria attach to existing candidate clusters.

### 5.2 Modified Hungarian Algorithm (Resource Dispatch)
* **Goal:** Assign available response units to validated incidents while minimizing overall response travel time.
* **Modification:** Uses matrix padding (dummy rows or dummy columns) to handle unbalanced conditions where active incidents outnumber response units, or response units outnumber incidents.
* **Output:** Recommends optimal unit assignments to the dispatcher. The system never executes automatic dispatch without human confirmation.

### 5.3 AI Summarization Engine (Google Gemini API)
* **Trigger 1 (Intake Summary):** Generates a 3 to 5 sentence summary when an incident candidate forms or receives 5 new reports.
* **Trigger 2 (Resolution Briefing):** Synthesizes citizen reports and responder Field Casualty Assessments into a hospital pre-arrival handover report.
* **Fallback:** Uses static template strings if the Gemini API call fails or times out after 2 seconds.

---

## 6. Strict Scope Boundaries (Out of Scope)

The following items are strictly out of scope for Version 1.0. Do not implement or suggest these:

* Native iOS or Android mobile apps (PWA only).
* Full hospital Electronic Medical Record (EMR) systems.
* SMS or two-way radio hardware gateways.
* Offline mesh networking.
* National NDRRMC live database synchronization.
