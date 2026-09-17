---
type: community
cohesion: 0.08
members: 42
---

# Algorithms Worker & DB Access

**Cohesion:** 0.08 - loosely connected
**Members:** 42 nodes

## Members
- [[Calculates great-circle distance between two points on earth in meters.]] - rationale - services/algorithms/src/clustering.py
- [[Closes all connections in the pool.]] - rationale - services/algorithms/src/db.py
- [[Creates a blocking connection to RabbitMQ with retry logic.]] - rationale - services/algorithms/src/worker.py
- [[DERRCS AI Incident Summarizer Module Calls Google Gemini API to generate…]] - rationale - services/algorithms/src/summarizer.py
- [[DERRCS PostgreSQL Connection Helper for Python Worker Provides a connection…]] - rationale - services/algorithms/src/db.py
- [[DERRCS RabbitMQ Worker Service Consumes domain events from the derrcs.events…]] - rationale - services/algorithms/src/worker.py
- [[DERRCS Streaming DBSCAN Duplicate Detection Service Groups nearby citizen…]] - rationale - services/algorithms/src/clustering.py
- [[Deterministic fallback handover template.]] - rationale - services/algorithms/src/summarizer.py
- [[Executes a SQL query and returns a single row as a dict, or None.]] - rationale - services/algorithms/src/db.py
- [[Executes a SQL query and returns results as a list of dicts. For INSERTUPDATE,…]] - rationale - services/algorithms/src/db.py
- [[Generate a hospital pre-arrival handover report.]] - rationale - services/algorithms/src/summarizer.py
- [[Generic message callback that routes to the correct handler.]] - rationale - services/algorithms/src/worker.py
- [[Gets a connection from the pool. Caller must return it with put_connection().]] - rationale - services/algorithms/src/db.py
- [[Initializes queues, binds routing keys, and starts consuming.]] - rationale - services/algorithms/src/worker.py
- [[Publishes an event back to the derrcs.events exchange.]] - rationale - services/algorithms/src/worker.py
- [[RabbitMQ handler for candidate.created events. Queries reports linked to the…]] - rationale - services/algorithms/src/summarizer.py
- [[RabbitMQ handler for field.assessment.submitted events. Queries reports and…]] - rationale - services/algorithms/src/summarizer.py
- [[RabbitMQ handler for report.ingested events. 1. Query active candidates and…]] - rationale - services/algorithms/src/clustering.py
- [[Reads PostgreSQL connection parameters from environment variables.]] - rationale - services/algorithms/src/db.py
- [[Returns a connection back to the pool.]] - rationale - services/algorithms/src/db.py
- [[Returns a thread-safe connection pool, creating it on first call.]] - rationale - services/algorithms/src/db.py
- [[_template_handover_debrief()]] - code - services/algorithms/src/summarizer.py
- [[close_pool()]] - code - services/algorithms/src/db.py
- [[clustering.py]] - code - services/algorithms/src/clustering.py
- [[db.py]] - code - services/algorithms/src/db.py
- [[generate_handover_debrief()]] - code - services/algorithms/src/summarizer.py
- [[get_connection()]] - code - services/algorithms/src/db.py
- [[get_connection_params()]] - code - services/algorithms/src/db.py
- [[get_pool()]] - code - services/algorithms/src/db.py
- [[get_rabbitmq_connection()]] - code - services/algorithms/src/worker.py
- [[handle_candidate_created()]] - code - services/algorithms/src/summarizer.py
- [[handle_field_assessment_submitted()]] - code - services/algorithms/src/summarizer.py
- [[handle_report_ingested()]] - code - services/algorithms/src/clustering.py
- [[haversine_distance_meters()]] - code - services/algorithms/src/clustering.py
- [[main()]] - code - services/algorithms/src/worker.py
- [[on_message()]] - code - services/algorithms/src/worker.py
- [[publish_event()]] - code - services/algorithms/src/worker.py
- [[put_connection()]] - code - services/algorithms/src/db.py
- [[query()_1]] - code - services/algorithms/src/db.py
- [[query_one()]] - code - services/algorithms/src/db.py
- [[summarizer.py]] - code - services/algorithms/src/summarizer.py
- [[worker.py]] - code - services/algorithms/src/worker.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Algorithms_Worker__DB_Access
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Modified Hungarian Allocation]]
- 3 edges to [[_COMMUNITY_Streaming DBSCAN Duplicate Detection]]
- 3 edges to [[_COMMUNITY_AI & Fallback Incident Summarizer]]

## Top bridge nodes
- [[summarizer.py]] - degree 12, connects to 2 communities
- [[clustering.py]] - degree 10, connects to 2 communities
- [[query()_1]] - degree 12, connects to 1 community
- [[worker.py]] - degree 12, connects to 1 community
- [[handle_report_ingested()]] - degree 8, connects to 1 community