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
