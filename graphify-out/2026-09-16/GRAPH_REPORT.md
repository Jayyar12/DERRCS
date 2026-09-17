# Graph Report - DERRCS  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 291 nodes · 439 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4f7d5da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13

## God Nodes (most connected - your core abstractions)
1. `query()` - 12 edges
2. `incidents` - 11 edges
3. `get_connection()` - 9 edges
4. `put_connection()` - 9 edges
5. `handle_report_ingested()` - 8 edges
6. `cluster_reports()` - 8 edges
7. `optimize_allocations()` - 8 edges
8. `express` - 8 edges
9. `users` - 8 edges
10. `TestHungarianAllocationAlgorithm` - 7 edges

## Surprising Connections (you probably didn't know these)
- `idx_activity_logs_action` --indexes--> `activity_logs`  [EXTRACTED]
  migrations/003_phase3_state_machine_escalation.sql → database-schema.sql
- `idx_activity_logs_created_at` --indexes--> `activity_logs`  [EXTRACTED]
  migrations/003_phase3_state_machine_escalation.sql → database-schema.sql
- `idx_activity_logs_entity` --indexes--> `activity_logs`  [EXTRACTED]
  migrations/003_phase3_state_machine_escalation.sql → database-schema.sql
- `idx_incidents_escalation_level` --indexes--> `incidents`  [EXTRACTED]
  migrations/003_phase3_state_machine_escalation.sql → database-schema.sql
- `idx_incidents_status_escalation` --indexes--> `incidents`  [EXTRACTED]
  migrations/003_phase3_state_machine_escalation.sql → database-schema.sql

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (50): amqplib, bcryptjs, express, jsonwebtoken, pg, { Pool }, query(), testConnection() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (38): handle_report_ingested(), haversine_distance_meters(), DERRCS Streaming DBSCAN Duplicate Detection Service Groups nearby citizen…, Calculates great-circle distance between two points on earth in meters., RabbitMQ handler for report.ingested events. 1. Query active candidates and…, close_pool(), get_connection(), get_connection_params() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): leaflet, lucide-react, oxlint, react, react-dom, @types/react, @types/react-dom, vite (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (30): activity_logs, assignments, field_assessments, idx_assignments_incident, idx_assignments_unit, idx_field_assessments_incident, idx_incident_candidates_center, idx_incidents_location (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): cors, nodemon, socket.io, uuid, dependencies, amqplib, bcryptjs, cors (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (18): closeRabbitMQ(), amqp, app, bindConsumers(), { connectRabbitMQ, closeRabbitMQ, EXCHANGE_NAME }, cors, dotenv, emitToRoom() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (10): calculate_distance_meters(), handle_incident_validated(), optimize_allocations(), DERRCS Modified Hungarian Algorithm for Emergency Resource Allocation Optimizes…, Calculates great-circle distance between two GPS coordinates in meters., Finds optimal matching between available response units and active validated…, RabbitMQ handler for incident.validated events. 1. Fetch the validated incident…, Unit and integration tests for DERRCS Algorithmic Services Tests both Streaming… (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (6): dotenv, amqp, dotenv, http, { io: ioClient }, path

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (7): multer, ALLOWED_MIME_TYPES, multer, path, storage, upload, UPLOADS_DIR

### Community 9 - "Community 9"
Cohesion: 0.31
Nodes (8): build_report_payload(), generate_jittered_coordinate(), main(), DERRCS Disaster Simulation and Report Generator Simulates incoming citizen…, Applies small random distance jitter to a coordinate. One degree…, Constructs a realistic emergency report payload matching DERRCS api-…, Sends JSON report payload via HTTP POST using standard urllib., send_report()

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (6): generate_template_summary(), Generates structured fallback summary when Gemini API is unavailable., Summarizes multiple citizen reports into a single actionable paragraph. Uses…, summarize_incident_cluster(), Tests for AI and Template incident summarization., TestSummarizerModule

### Community 11 - "Community 11"
Cohesion: 0.36
Nodes (4): cluster_reports(), Clusters reports by location. Matches against existing candidates first, then…, Tests for DBSCAN duplicate report detection., TestClusteringAlgorithm

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **104 isolated node(s):** `amqp`, `jwt`, `{ authenticate, authorize }`, `express`, `{ pool }` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `socket.io-client` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `express` connect `Community 0` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `amqp`, `jwt`, `{ authenticate, authorize }` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053410893707033315 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08246225319396051 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06031746031746032 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13306451612903225 - nodes in this community are weakly interconnected._