---
type: community
cohesion: 0.17
members: 17
---

# Modified Hungarian Allocation

**Cohesion:** 0.17 - loosely connected
**Members:** 17 nodes

## Members
- [[dot-test_balanced_allocation_minimizes_total_travel_time()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_distance_calculation_accuracy()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_empty_units_or_incidents_returns_empty()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_unbalanced_more_incidents_than_units()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_unbalanced_more_units_than_incidents()]] - code - services/algorithms/tests/test_algorithms.py
- [[Calculates great-circle distance between two GPS coordinates in meters.]] - rationale - services/algorithms/src/allocation.py
- [[DERRCS Modified Hungarian Algorithm for Emergency Resource Allocation Optimizes…]] - rationale - services/algorithms/src/allocation.py
- [[Finds optimal matching between available response units and active validated…]] - rationale - services/algorithms/src/allocation.py
- [[RabbitMQ handler for incident.validated events. 1. Fetch the validated incident…]] - rationale - services/algorithms/src/allocation.py
- [[TestHungarianAllocationAlgorithm]] - code - services/algorithms/tests/test_algorithms.py
- [[Tests for Modified Hungarian resource dispatch optimization.]] - rationale - services/algorithms/tests/test_algorithms.py
- [[Unit and integration tests for DERRCS Algorithmic Services Tests both Streaming…]] - rationale - services/algorithms/tests/test_algorithms.py
- [[allocation.py]] - code - services/algorithms/src/allocation.py
- [[calculate_distance_meters()]] - code - services/algorithms/src/allocation.py
- [[handle_incident_validated()]] - code - services/algorithms/src/allocation.py
- [[optimize_allocations()]] - code - services/algorithms/src/allocation.py
- [[test_algorithms.py]] - code - services/algorithms/tests/test_algorithms.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Modified_Hungarian_Allocation
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Algorithms Worker & DB Access]]
- 1 edge to [[_COMMUNITY_AI & Fallback Incident Summarizer]]
- 1 edge to [[_COMMUNITY_Streaming DBSCAN Duplicate Detection]]

## Top bridge nodes
- [[test_algorithms.py]] - degree 7, connects to 3 communities
- [[allocation.py]] - degree 7, connects to 1 community
- [[handle_incident_validated()]] - degree 5, connects to 1 community