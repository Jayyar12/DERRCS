# DERRCS — Project Team Role Assignments & Work Breakdown

**Project:** Digital Emergency Reporting and Response Coordination System (DERRCS)  
**Course:** Integrative Programming and Technologies  
**Team Size:** 5 Members  
**Duration:** 8 Weeks  

---

## 1. Team Role Distribution

| Name | Primary Role | Core Technical Focus |
|---|---|---|
| **Jay-ar T. Guiroy** | **Team Lead & System Architect** | System Integration, RabbitMQ Broker, Node.js State Machine, Docker |
| **Fritz M. Oclarit** | **Backend & Algorithm Engineer** | Streaming DBSCAN, Modified Hungarian Algorithm, PostGIS Queries |
| **Krizza L. Gumapal** | **AI & Database Engineer** | PostgreSQL Schema, Gemini API Summarizer Service, Reporting API |
| **Ivan Rey Casas** | **Frontend Lead (Dispatcher Dashboard)** | React PWA, Leaflet.js Map Clustering, Socket.IO Client |
| **Millan Regidor** | **Mobile PWA & Field Interface Lead** | Citizen Report Form, Responder Field Assessment (PCR), Auth & UI Testing |

---

## 2. Individual Member Profiles & Deliverables

### Jay-ar T. Guiroy (Team Lead & System Architect)
**Focus:** Orchestration, core backend pipeline, inter-service communication, and project coordination.

* **Key Responsibilities:**
  * Coordinate with the course instructor and lead the MDRRMO Tagoloan stakeholder interview.
  * Set up Docker containers and the Git collaboration repository.
  * Implement the Ingestion Service in Node.js to receive, validate, and normalize incoming reports.
  * Configure RabbitMQ exchanges, queues, and message routing keys between services.
  * Build the Incident State Machine in Node.js, including automated escalation timers.
  * Lead end-to-end integration testing and final deployment to staging.
  * Build role-based login screens (Dispatcher, Responder, Admin) with JWT authentication.
* **Primary Technologies:** Node.js, Express, RabbitMQ, Docker, Git.

---

### Fritz M. Oclarit (Backend & Algorithm Engineer)
**Focus:** Mathematical modeling, spatial clustering, and automated resource dispatch optimization.

* **Key Responsibilities:**
  * Build the Python service for Streaming DBSCAN with spatial distance calculations.
  * Tune and test the $\epsilon$ (radius) and $minPts$ thresholds for Tagoloan barangay boundaries.
  * Benchmark the clustering engine to ensure execution remains under the 100 ms target.
  * Implement the Modified Hungarian Algorithm in Python to handle unbalanced assignment matrices.
  * Write PostGIS spatial queries for coordinate boundary validation and distance matrices.
* **Primary Technologies:** Python (NumPy, SciPy, Scikit-learn), PostGIS, RabbitMQ Consumer.

---

### Krizza L. Gumapal (AI & Database Engineer)
**Focus:** Relational database architecture, spatial schema configuration, and LLM summarization.

* **Key Responsibilities:**
  * Design and maintain the PostgreSQL database schema and migrations.
  * Configure PostGIS spatial extensions, geometry columns, and spatial indexes.
  * Develop the AI Summarization Service in Python using the Google Gemini API.
  * Implement structured prompt engineering and output parsing for incident cluster briefs.
  * Build the template-based fallback summarizer for times when internet connectivity drops.
  * Build analytics endpoints for incident histories, casualty totals, and response times.
* **Primary Technologies:** PostgreSQL, PostGIS, Python, Google Gemini API, SQL.

---

### Ivan Rey Casas (Frontend Lead — Dispatcher Dashboard)
**Focus:** Desktop dispatch operations, interactive spatial visualization, and real-time event updates.

* **Key Responsibilities:**
  * Develop the MDRRMO Dispatcher Dashboard in React.
  * Integrate Leaflet.js with map marker clustering for high-density emergency zones.
  * Connect Socket.IO client listeners to reflect real-time incident state changes without page reloads.
  * Build the Candidate Group Review screen with side-by-side report comparisons and AI summary cards.
  * Build the Resource Allocation panel showing recommended units and manual override controls.
* **Primary Technologies:** React, Leaflet.js, Socket.IO-client, Tailwind CSS.

---

### Millan Regidor (Mobile PWA & Field Interface Lead)
**Focus:** Public citizen intake, mobile usability, responder tablet workflow.

* **Key Responsibilities:**
  * Build the responsive Citizen Reporting PWA with stepped input forms.
  * Implement location separation in the UI (current GPS position vs. manual pin-drop for emergency site).
  * Build the Response Unit Field Interface for tablets and mobile phones.
  * Implement the Digital Field Casualty Assessment Form (Pre-Hospital Care Report) with standard EMT checklists.
  * Conduct usability tests with sample users on mobile browsers.
* **Primary Technologies:** React (PWA), HTML5 Geolocation API, Tailwind CSS.

---

## 3. Weekly Task Matrix (8-Week Roadmap)

| Week | Jay-ar (Lead) | Fritz (Algorithms) | Krizza (DB / AI) | Ivan (Dashboard) | Millan (PWA / Field) |
|---|---|---|---|---|---|
| **Week 1** | Project setup, lead MDRRMO interview | Define algorithm requirements | Document PCR form data & draft DB schema | UI wireframes (Dashboard) | UI wireframes (Citizen & Responder) |
| **Week 2** | API contracts & RabbitMQ topic architecture | Mathematical draft of DBSCAN & Hungarian | Finalize PostgreSQL + PostGIS schema | Dashboard layout & Leaflet map shell | Citizen stepped form layout |
| **Week 3** | Ingestion Service & input validation | Spatial coordinate math & PostGIS setup | Database connection layer & CRUD routes | Leaflet marker clustering integration | Camera & GPS integration in PWA |
| **Week 4** | Docker container setup for all services | Streaming DBSCAN Python engine | Gemini API setup & prompt engineering | Incident Candidate Review UI | Response Unit tablet interface layout |
| **Week 5** | Incident State Machine & timers | Modified Hungarian algorithm engine | Connect AI service to RabbitMQ & test fallback | Connect Socket.IO events to dashboard | Digital Casualty Assessment form logic |
| **Week 6** | Service bus integration (Node + Python) | Benchmark clustering & allocation speeds | Build reporting and statistics queries | Response unit assignment panel | JWT login & role protection screens |
| **Week 7** | Full system integration & security review | Edge-case algorithm debugging | Database performance tuning & indexing | Real-time map stress testing | Field assessment end-to-end testing |
| **Week 8** | Lead staging deploy & MDRRMO UAT | Prepare algorithm documentation | Prepare database & prompt documentation | Final dashboard UI polish | Final mobile UI polish |

---

## 4. Shared Team Responsibilities

1. **Stakeholder Interview (Week 1):** Entire team attends the interview with the MDRRMO officer, with Jay-ar leading the conversation and Millan recording the form fields.
2. **Weekly Sync (Every Monday):** 20-minute check-in to identify blockers before beginning the week's tasks.
3. **Pull Request Policy:** No code merges into the `main` Git branch without at least one peer review from another teammate.
4. **Final Defense Preparation (Week 8):** Every member prepares a 3-minute presentation segment explaining their technical component during the course presentation.
