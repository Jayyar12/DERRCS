---
type: community
cohesion: 1.00
members: 1
---

# Sample Emergency Dataset

**Cohesion:** 1.00 - tightly connected
**Members:** 1 nodes

## Members
- [[03-sample-emergencies.sql]] - code - seeds/03-sample-emergencies.sql

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Sample_Emergency_Dataset
SORT file.name ASC
```
