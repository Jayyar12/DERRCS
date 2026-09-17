---
type: community
cohesion: 0.22
members: 9
---

# Multer Media Upload Middleware

**Cohesion:** 0.22 - loosely connected
**Members:** 9 nodes

## Members
- [[ALLOWED_MIME_TYPES]] - code - services/ingestion/src/middleware/upload.js
- [[UPLOADS_DIR]] - code - services/ingestion/src/middleware/upload.js
- [[fileFilter()]] - code - services/ingestion/src/middleware/upload.js
- [[multer_2]] - concept - services/ingestion/package.json
- [[multer_1]] - code - services/ingestion/src/middleware/upload.js
- [[path_2]] - code - services/ingestion/src/middleware/upload.js
- [[storage]] - code - services/ingestion/src/middleware/upload.js
- [[upload_1]] - code - services/ingestion/src/middleware/upload.js
- [[upload.js]] - code - services/ingestion/src/middleware/upload.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Multer_Media_Upload_Middleware
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Ingestion API & State Machine]]
- 1 edge to [[_COMMUNITY_Ingestion Dependencies & Config]]

## Top bridge nodes
- [[upload.js]] - degree 9, connects to 1 community
- [[multer_2]] - degree 2, connects to 1 community