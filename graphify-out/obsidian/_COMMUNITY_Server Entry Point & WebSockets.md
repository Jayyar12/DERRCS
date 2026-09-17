---
type: community
cohesion: 0.12
members: 19
---

# Server Entry Point & WebSockets

**Cohesion:** 0.12 - loosely connected
**Members:** 19 nodes

## Members
- [[amqp_1]] - code - services/ingestion/src/index.js
- [[app]] - code - services/ingestion/src/index.js
- [[bindConsumers()]] - code - services/ingestion/src/index.js
- [[closeRabbitMQ()]] - code - services/ingestion/src/config/rabbitmq.js
- [[cors_2]] - code - services/ingestion/src/index.js
- [[dotenv_1]] - code - services/ingestion/src/index.js
- [[emitToRoom()]] - code - services/ingestion/src/index.js
- [[escalationWorker]] - code - services/ingestion/src/index.js
- [[express_8]] - code - services/ingestion/src/index.js
- [[http]] - code - services/ingestion/src/index.js
- [[index.js]] - code - services/ingestion/src/index.js
- [[io]] - code - services/ingestion/src/index.js
- [[jwt_2]] - code - services/ingestion/src/index.js
- [[path]] - code - services/ingestion/src/index.js
- [[shutdown()]] - code - services/ingestion/src/index.js
- [[stop()]] - code - services/ingestion/src/workers/escalationWorker.js
- [[{ Server }]] - code - services/ingestion/src/index.js
- [[{ connectRabbitMQ, closeRabbitMQ, EXCHANGE_NAME }]] - code - services/ingestion/src/index.js
- [[{ testConnection }]] - code - services/ingestion/src/index.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Entry_Point__WebSockets
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_Ingestion API & State Machine]]
- 2 edges to [[_COMMUNITY_Ingestion Dependencies & Config]]
- 1 edge to [[_COMMUNITY_Phase 3 Verification Suite]]

## Top bridge nodes
- [[index.js]] - degree 28, connects to 3 communities
- [[closeRabbitMQ()]] - degree 3, connects to 1 community
- [[stop()]] - degree 2, connects to 1 community