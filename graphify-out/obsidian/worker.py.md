---
source_file: "services/algorithms/src/worker.py"
type: "code"
community: "Algorithms Worker & DB Access"
location: "L1"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Algorithms_Worker__DB_Access
---

# worker.py

## Connections
- [[DERRCS RabbitMQ Worker Service Consumes domain events from the derrcs.events…]] - `rationale_for` [EXTRACTED]
- [[allocation.py]] - `imports_from` [EXTRACTED]
- [[clustering.py]] - `imports_from` [EXTRACTED]
- [[get_rabbitmq_connection()]] - `contains` [EXTRACTED]
- [[handle_candidate_created()]] - `indirect_call` [INFERRED]
- [[handle_field_assessment_submitted()]] - `indirect_call` [INFERRED]
- [[handle_incident_validated()]] - `indirect_call` [INFERRED]
- [[handle_report_ingested()]] - `indirect_call` [INFERRED]
- [[main()]] - `contains` [EXTRACTED]
- [[on_message()]] - `contains` [EXTRACTED]
- [[publish_event()]] - `contains` [EXTRACTED]
- [[summarizer.py]] - `imports_from` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Algorithms_Worker__DB_Access