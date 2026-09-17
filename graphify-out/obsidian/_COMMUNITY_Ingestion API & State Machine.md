---
type: community
cohesion: 0.05
members: 62
---

# Ingestion API & State Machine

**Cohesion:** 0.05 - loosely connected
**Members:** 62 nodes

## Members
- [[dot-constructor()]] - code - services/ingestion/src/services/stateMachine.js
- [[InvalidStateTransitionError]] - code - services/ingestion/src/services/stateMachine.js
- [[TRANSITIONS]] - code - services/ingestion/src/services/stateMachine.js
- [[_escalateIncident()]] - code - services/ingestion/src/workers/escalationWorker.js
- [[_runPollCycle()]] - code - services/ingestion/src/workers/escalationWorker.js
- [[amqp]] - code - services/ingestion/src/config/rabbitmq.js
- [[amqplib]] - concept - services/ingestion/package.json
- [[assignments.js]] - code - services/ingestion/src/routes/assignments.js
- [[authenticate()]] - code - services/ingestion/src/middleware/auth.js
- [[authorize()]] - code - services/ingestion/src/middleware/auth.js
- [[bcrypt]] - code - services/ingestion/src/routes/auth.js
- [[bcryptjs]] - concept - services/ingestion/package.json
- [[candidates.js]] - code - services/ingestion/src/routes/candidates.js
- [[connectRabbitMQ()]] - code - services/ingestion/src/config/rabbitmq.js
- [[db.js]] - code - services/ingestion/src/config/db.js
- [[escalationWorker.js]] - code - services/ingestion/src/workers/escalationWorker.js
- [[express_6]] - concept - services/ingestion/package.json
- [[express]] - code - services/ingestion/src/routes/assignments.js
- [[express_1]] - code - services/ingestion/src/routes/auth.js
- [[express_2]] - code - services/ingestion/src/routes/candidates.js
- [[express_3]] - code - services/ingestion/src/routes/incidents.js
- [[express_4]] - code - services/ingestion/src/routes/reports.js
- [[express_5]] - code - services/ingestion/src/routes/units.js
- [[incidents.js]] - code - services/ingestion/src/routes/incidents.js
- [[isValidTransition()]] - code - services/ingestion/src/services/stateMachine.js
- [[jsonwebtoken]] - concept - services/ingestion/package.json
- [[jwt]] - code - services/ingestion/src/middleware/auth.js
- [[jwt_1]] - code - services/ingestion/src/routes/auth.js
- [[middlewareauth.js]] - code - services/ingestion/src/middleware/auth.js
- [[pg]] - concept - services/ingestion/package.json
- [[publishEvent()]] - code - services/ingestion/src/config/rabbitmq.js
- [[query()]] - code - services/ingestion/src/config/db.js
- [[rabbitmq.js]] - code - services/ingestion/src/config/rabbitmq.js
- [[reports.js]] - code - services/ingestion/src/routes/reports.js
- [[router]] - code - services/ingestion/src/routes/assignments.js
- [[router_1]] - code - services/ingestion/src/routes/auth.js
- [[router_2]] - code - services/ingestion/src/routes/candidates.js
- [[router_3]] - code - services/ingestion/src/routes/incidents.js
- [[router_4]] - code - services/ingestion/src/routes/reports.js
- [[router_5]] - code - services/ingestion/src/routes/units.js
- [[routesauth.js]] - code - services/ingestion/src/routes/auth.js
- [[start()]] - code - services/ingestion/src/workers/escalationWorker.js
- [[stateMachine]] - code - services/ingestion/src/routes/candidates.js
- [[stateMachine_1]] - code - services/ingestion/src/routes/incidents.js
- [[stateMachine.js]] - code - services/ingestion/src/services/stateMachine.js
- [[testConnection()]] - code - services/ingestion/src/config/db.js
- [[transition()]] - code - services/ingestion/src/services/stateMachine.js
- [[units.js]] - code - services/ingestion/src/routes/units.js
- [[upload]] - code - services/ingestion/src/routes/reports.js
- [[{ Pool }]] - code - services/ingestion/src/config/db.js
- [[{ authenticate, authorize }]] - code - services/ingestion/src/routes/assignments.js
- [[{ authenticate, authorize }_1]] - code - services/ingestion/src/routes/candidates.js
- [[{ authenticate, authorize }_2]] - code - services/ingestion/src/routes/incidents.js
- [[{ authenticate, authorize }_3]] - code - services/ingestion/src/routes/units.js
- [[{ pool }_1]] - code - services/ingestion/src/routes/assignments.js
- [[{ pool }_2]] - code - services/ingestion/src/services/stateMachine.js
- [[{ pool }_3]] - code - services/ingestion/src/workers/escalationWorker.js
- [[{ query }]] - code - services/ingestion/src/routes/auth.js
- [[{ query }_1]] - code - services/ingestion/src/routes/reports.js
- [[{ query }_2]] - code - services/ingestion/src/routes/units.js
- [[{ query, pool }]] - code - services/ingestion/src/routes/candidates.js
- [[{ query, pool }_1]] - code - services/ingestion/src/routes/incidents.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Ingestion_API__State_Machine
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_Server Entry Point & WebSockets]]
- 5 edges to [[_COMMUNITY_Ingestion Dependencies & Config]]
- 1 edge to [[_COMMUNITY_Multer Media Upload Middleware]]
- 1 edge to [[_COMMUNITY_Phase 3 Verification Suite]]

## Top bridge nodes
- [[amqplib]] - degree 4, connects to 3 communities
- [[express_6]] - degree 8, connects to 2 communities
- [[jsonwebtoken]] - degree 4, connects to 2 communities
- [[db.js]] - degree 13, connects to 1 community
- [[reports.js]] - degree 10, connects to 1 community