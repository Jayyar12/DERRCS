---
type: community
cohesion: 0.31
members: 9
---

# Disaster Simulator & Generator

**Cohesion:** 0.31 - loosely connected
**Members:** 9 nodes

## Members
- [[Applies small random distance jitter to a coordinate. One degree…]] - rationale - scripts/simulate_disaster.py
- [[Constructs a realistic emergency report payload matching DERRCS api-…]] - rationale - scripts/simulate_disaster.py
- [[DERRCS Disaster Simulation and Report Generator Simulates incoming citizen…]] - rationale - scripts/simulate_disaster.py
- [[Sends JSON report payload via HTTP POST using standard urllib.]] - rationale - scripts/simulate_disaster.py
- [[build_report_payload()]] - code - scripts/simulate_disaster.py
- [[generate_jittered_coordinate()]] - code - scripts/simulate_disaster.py
- [[main()_1]] - code - scripts/simulate_disaster.py
- [[send_report()]] - code - scripts/simulate_disaster.py
- [[simulate_disaster.py]] - code - scripts/simulate_disaster.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Disaster_Simulator__Generator
SORT file.name ASC
```
