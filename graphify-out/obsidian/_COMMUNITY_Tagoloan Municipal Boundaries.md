---
type: community
cohesion: 1.00
members: 3
---

# Tagoloan Municipal Boundaries

**Cohesion:** 1.00 - tightly connected
**Members:** 3 nodes

## Members
- [[02-initial-seeds.sql]] - code - seeds/02-initial-seeds.sql
- [[idx_municipal_boundaries_geom]] - code - seeds/02-initial-seeds.sql
- [[municipal_boundaries]] - code - seeds/02-initial-seeds.sql

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Tagoloan_Municipal_Boundaries
SORT file.name ASC
```
