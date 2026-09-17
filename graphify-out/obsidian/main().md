---
source_file: "services/algorithms/src/worker.py"
type: "code"
community: "Algorithms Worker & DB Access"
location: "L116"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Algorithms_Worker__DB_Access
---

# main()

## Connections
- [[Initializes queues, binds routing keys, and starts consuming.]] - `rationale_for` [EXTRACTED]
- [[get_rabbitmq_connection()]] - `calls` [EXTRACTED]
- [[on_message()]] - `indirect_call` [INFERRED]
- [[worker.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Algorithms_Worker__DB_Access