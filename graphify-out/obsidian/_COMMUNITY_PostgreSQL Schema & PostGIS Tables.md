---
type: community
cohesion: 0.13
members: 32
---

# PostgreSQL Schema & PostGIS Tables

**Cohesion:** 0.13 - loosely connected
**Members:** 32 nodes

## Members
- [[003_phase3_state_machine_escalation.sql]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[activity_logs]] - code - database-schema.sql
- [[assignments]] - code - database-schema.sql
- [[database-schema.sql]] - code - database-schema.sql
- [[field_assessments]] - code - database-schema.sql
- [[idx_activity_logs_action]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[idx_activity_logs_created_at]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[idx_activity_logs_entity]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[idx_assignments_incident]] - code - database-schema.sql
- [[idx_assignments_unit]] - code - database-schema.sql
- [[idx_field_assessments_incident]] - code - database-schema.sql
- [[idx_incident_candidates_center]] - code - database-schema.sql
- [[idx_incidents_escalation_level]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[idx_incidents_location]] - code - database-schema.sql
- [[idx_incidents_status]] - code - database-schema.sql
- [[idx_incidents_status_escalation]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[idx_reports_candidate]] - code - database-schema.sql
- [[idx_reports_emergency_loc]] - code - database-schema.sql
- [[idx_reports_incident]] - code - database-schema.sql
- [[idx_reports_reporter_loc]] - code - database-schema.sql
- [[idx_response_units_location]] - code - database-schema.sql
- [[incident_audit_trail]] - code - migrations/003_phase3_state_machine_escalation.sql
- [[incident_candidates]] - code - database-schema.sql
- [[incidents]] - code - database-schema.sql
- [[notifications]] - code - database-schema.sql
- [[permissions]] - code - database-schema.sql
- [[reports]] - code - database-schema.sql
- [[response_units]] - code - database-schema.sql
- [[role_permissions]] - code - database-schema.sql
- [[roles]] - code - database-schema.sql
- [[summaries]] - code - database-schema.sql
- [[users]] - code - database-schema.sql

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/PostgreSQL_Schema__PostGIS_Tables
SORT file.name ASC
```
