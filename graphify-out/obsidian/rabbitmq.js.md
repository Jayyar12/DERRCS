---
source_file: "services/ingestion/src/config/rabbitmq.js"
type: "code"
community: "Ingestion API & State Machine"
location: "L1"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Ingestion_API__State_Machine
---

# rabbitmq.js

## Connections
- [[amqp]] - `contains` [EXTRACTED]
- [[amqplib]] - `imports_from` [EXTRACTED]
- [[candidates.js]] - `imports_from` [EXTRACTED]
- [[closeRabbitMQ()]] - `indirect_call` [INFERRED]
- [[connectRabbitMQ()]] - `indirect_call` [INFERRED]
- [[incidents.js]] - `imports_from` [EXTRACTED]
- [[index.js]] - `imports_from` [EXTRACTED]
- [[publishEvent()]] - `indirect_call` [INFERRED]
- [[reports.js]] - `imports_from` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Ingestion_API__State_Machine