---
source_file: "database-schema.sql"
type: "code"
community: "PostgreSQL Schema & PostGIS Tables"
location: "L28"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/PostgreSQL_Schema__PostGIS_Tables
---

# users

## Connections
- [[activity_logs]] - `references` [EXTRACTED]
- [[assignments]] - `references` [EXTRACTED]
- [[database-schema.sql]] - `contains` [EXTRACTED]
- [[field_assessments]] - `references` [EXTRACTED]
- [[incident_audit_trail]] - `reads_from` [EXTRACTED]
- [[notifications]] - `references` [EXTRACTED]
- [[response_units]] - `references` [EXTRACTED]
- [[roles]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/PostgreSQL_Schema__PostGIS_Tables