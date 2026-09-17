---
type: community
cohesion: 0.28
members: 9
---

# AI & Fallback Incident Summarizer

**Cohesion:** 0.28 - loosely connected
**Members:** 9 nodes

## Members
- [[dot-test_empty_reports_returns_fallback_message()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_template_detects_trapped_individuals()]] - code - services/algorithms/tests/test_algorithms.py
- [[dot-test_template_handles_none_standardized_answers_without_crashing()]] - code - services/algorithms/tests/test_algorithms.py
- [[Generates structured fallback summary when Gemini API is unavailable.]] - rationale - services/algorithms/src/summarizer.py
- [[Summarizes multiple citizen reports into a single actionable paragraph. Uses…]] - rationale - services/algorithms/src/summarizer.py
- [[TestSummarizerModule]] - code - services/algorithms/tests/test_algorithms.py
- [[Tests for AI and Template incident summarization.]] - rationale - services/algorithms/tests/test_algorithms.py
- [[generate_template_summary()]] - code - services/algorithms/src/summarizer.py
- [[summarize_incident_cluster()]] - code - services/algorithms/src/summarizer.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/AI__Fallback_Incident_Summarizer
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Algorithms Worker & DB Access]]
- 1 edge to [[_COMMUNITY_Modified Hungarian Allocation]]

## Top bridge nodes
- [[generate_template_summary()]] - degree 5, connects to 1 community
- [[summarize_incident_cluster()]] - degree 5, connects to 1 community
- [[TestSummarizerModule]] - degree 5, connects to 1 community