---
type: community
cohesion: 0.17
members: 12
---

# Phase 3 Verification Suite

**Cohesion:** 0.17 - loosely connected
**Members:** 12 nodes

## Members
- [[amqp_2]] - code - scripts/verify_phase3.js
- [[dotenv_3]] - concept - services/ingestion/package.json
- [[dotenv_2]] - code - scripts/verify_phase3.js
- [[http_1]] - code - scripts/verify_phase3.js
- [[jsonPost()]] - code - scripts/verify_phase3.js
- [[path_1]] - code - scripts/verify_phase3.js
- [[test1_invalidTransition()]] - code - scripts/verify_phase3.js
- [[test2_escalation()]] - code - scripts/verify_phase3.js
- [[test3_rabbitMQRouting()]] - code - scripts/verify_phase3.js
- [[verify_phase3.js]] - code - scripts/verify_phase3.js
- [[wait()]] - code - scripts/verify_phase3.js
- [[{ io ioClient }]] - code - scripts/verify_phase3.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Phase_3_Verification_Suite
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Ingestion API & State Machine]]
- 1 edge to [[_COMMUNITY_Ingestion Dependencies & Config]]
- 1 edge to [[_COMMUNITY_Server Entry Point & WebSockets]]

## Top bridge nodes
- [[dotenv_3]] - degree 3, connects to 2 communities
- [[verify_phase3.js]] - degree 12, connects to 1 community