---
name: derrcs-domain-guide
description: "Specialized domain rules, architecture patterns, state machine transitions, and coding conventions for the Digital Emergency Reporting and Response Coordination System (DERRCS) in Tagoloan, Misamis Oriental."
category: development
risk: safe
---

# DERRCS Domain Guide

Follow this guide whenever you write, modify, or review code in the DERRCS codebase.

## 1. Domain Overview
* **System Purpose:** Digital Emergency Reporting and Response Coordination System for Tagoloan, Misamis Oriental.
* **Primary Stakeholder:** Municipal Disaster Risk Reduction and Management Office (MDRRMO).
* **Core Workflow:** Citizen reporting $\rightarrow$ Streaming DBSCAN clustering $\rightarrow$ AI summarization $\rightarrow$ Dispatcher confirmation $\rightarrow$ Hungarian allocation $\rightarrow$ Responder on-scene care $\rightarrow$ Resolution.

## 2. Core Entities & State Machine
Always enforce the six-stage incident lifecycle:
`Reported` $\rightarrow$ `Validated` $\rightarrow$ `Dispatched` $\rightarrow$ `Active` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`.

* **Never bypass states.** A report must enter as `Reported`.
* **Field Assessment Requirement:** Only allow transition from `Active` to `Resolved` after storing a valid `field_assessments` record.
* **Escalations:** Trigger notifications when incidents exceed 5 minutes in `Reported` or 10 minutes in `Validated`.

## 3. Spatial Data Rules
* Store all coordinates in PostgreSQL with PostGIS format: `GEOMETRY(Point, 4326)`.
* Always separate reporter location from actual emergency incident location.
* Validate that incoming coordinates fall within Tagoloan municipal operational bounds.

## 4. Algorithmic Modules
* **Streaming DBSCAN (Python):** Cluster reports incrementally. Default $\epsilon = 100$ meters; default $minPts = 2$.
* **Modified Hungarian Algorithm (Python):** Pad cost matrices with dummy rows or columns to balance unit count against incident count. Always require dispatcher confirmation before assigning units.
* **AI Summarization (Google Gemini API):** Summarize grouped citizen reports. If the API fails, fall back to template strings.

## 5. Reference Files
* Ground Truth: `CONTEXT.md`
* Guardrails: `PROJECT_RULES.md`
* Database Schema: `database-schema.sql`
* API & RabbitMQ Topics: `api-contracts.md`

## 6. Resolved Architectural Decisions

### 6.1 State Machine — Candidate Confirmation Flow
* When DBSCAN creates a new `incident_candidates` row, also create a linked `incidents` row immediately with `status = 'Reported'`.
* When a dispatcher confirms the candidate (`POST /api/v1/candidates/:id/confirm`), transition the existing `incidents` row from `Reported` → `Validated` inside a single DB transaction.
* **Never** create the `incidents` row for the first time at `Validated`. Doing so bypasses `Reported` and breaks the 6-stage lifecycle.
* The `incident_candidates` table uses `Pending / Confirmed / Dismissed`. The `incidents` table uses the full 6-stage lifecycle.

### 6.2 Hungarian Algorithm — Keep Matrix Padding
* `services/algorithms/src/allocation.py` pads the cost matrix with dummy rows/columns using a penalty of `1e6`.
* **Do not remove this padding**, even though SciPy's `linear_sum_assignment` supports rectangular matrices natively.
* The capstone specification (`CONTEXT.md §5.2` and the system documentation) explicitly defines the "Modified Hungarian Algorithm" as one that uses dummy matrix padding. Removing it contradicts the documented system design.

### 6.3 Streaming DBSCAN — Incremental Matching + Emergency Type Filter
* `cluster_reports()` must first check each new report against existing active `incident_candidates` before running batch DBSCAN on leftovers.
* Only match reports against candidates that share the same `emergencyType`. A Fire report must never attach to a Flood candidate even at the same GPS coordinates.
* Apply a temporal window query: only fetch reports from the last `CLUSTER_TIME_WINDOW_HOURS` hours (default: 12, configured in `.env`).

### 6.4 Native Setup — POSTGRES_HOST Must Be `localhost`
* `.env` ships with `POSTGRES_HOST=postgres`, the Docker Compose service name.
* When running the Node.js service outside Docker (Option B), change this to `POSTGRES_HOST=localhost` before starting.
* The service calls `testConnection()` on startup and exits with code 1 if the host is unreachable. This is the expected failure signal for a wrong host.
