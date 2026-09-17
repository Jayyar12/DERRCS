---
source_file: "migrations/003_phase3_state_machine_escalation.sql"
type: "code"
community: "PostgreSQL Schema & PostGIS Tables"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/PostgreSQL_Schema__PostGIS_Tables
---

# 003_phase3_state_machine_escalation.sql

## Connections
- [[idx_activity_logs_action]] - `contains` [EXTRACTED]
- [[idx_activity_logs_created_at]] - `contains` [EXTRACTED]
- [[idx_activity_logs_entity]] - `contains` [EXTRACTED]
- [[idx_incidents_escalation_level]] - `contains` [EXTRACTED]
- [[idx_incidents_status_escalation]] - `contains` [EXTRACTED]
- [[incident_audit_trail]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/PostgreSQL_Schema__PostGIS_Tables