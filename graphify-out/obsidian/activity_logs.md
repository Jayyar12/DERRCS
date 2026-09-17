---
source_file: "database-schema.sql"
type: "code"
community: "PostgreSQL Schema & PostGIS Tables"
location: "L153"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/PostgreSQL_Schema__PostGIS_Tables
---

# activity_logs

## Connections
- [[database-schema.sql]] - `contains` [EXTRACTED]
- [[idx_activity_logs_action]] - `indexes` [EXTRACTED]
- [[idx_activity_logs_created_at]] - `indexes` [EXTRACTED]
- [[idx_activity_logs_entity]] - `indexes` [EXTRACTED]
- [[incident_audit_trail]] - `reads_from` [EXTRACTED]
- [[users]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/PostgreSQL_Schema__PostGIS_Tables