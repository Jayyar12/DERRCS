---
type: community
cohesion: 0.36
members: 8
---

# Streaming DBSCAN Duplicate Detection

**Cohesion:** 0.36 - loosely connected
**Members:** 8 nodes

## Members
- [[dot-test_clustering_execution_speed_under_100ms()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_distant_reports_remain_unclustered_noise()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_empty_reports_returns_empty_list()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_nearby_reports_clustered_as_duplicates()]] - code - services/algorithms/tests/test_algorithms.py
- [[Clusters reports by location. Matches against existing candidates first, then…]] - rationale - services/algorithms/src/clustering.py
- [[TestClusteringAlgorithm]] - code - services/algorithms/tests/test_algorithms.py
- [[Tests for DBSCAN duplicate report detection.]] - rationale - services/algorithms/tests/test_algorithms.py
- [[cluster_reports()]] - code - services/algorithms/src/clustering.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Streaming_DBSCAN_Duplicate_Detection
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Algorithms Worker & DB Access]]
- 1 edge to [[_COMMUNITY_Modified Hungarian Allocation]]

## Top bridge nodes
- [[cluster_reports()]] - degree 8, connects to 1 community
- [[TestClusteringAlgorithm]] - degree 6, connects to 1 community