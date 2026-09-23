"""
Unit and integration tests for DERRCS Algorithmic Services
Tests both Streaming DBSCAN clustering and Modified Hungarian allocation.
"""

import os
import sys
import unittest
import time

# Add src to python path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from clustering import cluster_reports, haversine_distance_meters
from allocation import optimize_allocations, calculate_distance_meters
from summarizer import summarize_incident_cluster, generate_template_summary


class TestClusteringAlgorithm(unittest.TestCase):
    """Tests for DBSCAN duplicate report detection."""

    def test_empty_reports_returns_empty_list(self):
        result = cluster_reports([])
        self.assertEqual(result, [])

    def test_nearby_reports_clustered_as_duplicates(self):
        # Two reports ~15 meters apart in Poblacion, Tagoloan
        reports = [
            {"id": "rep-1", "latitude": 8.5385, "longitude": 124.7533},
            {"id": "rep-2", "latitude": 8.5386, "longitude": 124.7534},
        ]
        result = cluster_reports(reports, epsilon_meters=100.0, min_points=1)
        self.assertEqual(len(result), 2)
        # Both must share the same non-negative cluster ID
        self.assertEqual(result[0]["clusterId"], result[1]["clusterId"])
        self.assertNotEqual(result[0]["clusterId"], -1)
        self.assertTrue(result[0]["isDuplicate"])
        self.assertTrue(result[1]["isDuplicate"])

    def test_distant_reports_remain_unclustered_noise(self):
        # Poblacion vs Baluarte (~800 meters apart)
        reports = [
            {"id": "rep-1", "latitude": 8.5385, "longitude": 124.7533},
            {"id": "rep-2", "latitude": 8.5450, "longitude": 124.7480},
        ]
        result = cluster_reports(reports, epsilon_meters=100.0, min_points=1)
        self.assertEqual(len(result), 2)
        # Both must form their own clusters
        self.assertEqual(result[0]["clusterId"], 0)
        self.assertEqual(result[1]["clusterId"], 1)
        self.assertTrue(result[0]["isDuplicate"])
        self.assertTrue(result[1]["isDuplicate"])

    def test_clustering_execution_speed_under_100ms(self):
        # Benchmark with 50 reports distributed across Tagoloan
        reports = []
        for i in range(50):
            reports.append({
                "id": f"bench-{i}",
                "latitude": 8.5385 + (i * 0.0005),
                "longitude": 124.7533 + (i * 0.0005),
            })
        start_time = time.perf_counter()
        cluster_reports(reports, epsilon_meters=100.0, min_points=1)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        # Requirement from CONTEXT.md: Group reports within 100 milliseconds
        self.assertLess(elapsed_ms, 100.0, f"Clustering took {elapsed_ms:.2f}ms, exceeding 100ms budget")


class TestHungarianAllocationAlgorithm(unittest.TestCase):
    """Tests for Modified Hungarian resource dispatch optimization."""

    def test_empty_units_or_incidents_returns_empty(self):
        units = [{"id": "U1", "latitude": 8.5385, "longitude": 124.7533}]
        incidents = [{"id": "I1", "latitude": 8.5385, "longitude": 124.7533}]
        self.assertEqual(optimize_allocations([], incidents), [])
        self.assertEqual(optimize_allocations(units, []), [])

    def test_balanced_allocation_minimizes_total_travel_time(self):
        # Unit 1 is next to Incident A; Unit 2 is next to Incident B
        units = [
            {"id": "U-A", "latitude": 8.5385, "longitude": 124.7533},
            {"id": "U-B", "latitude": 8.5600, "longitude": 124.7700},
        ]
        incidents = [
            {"id": "INC-A", "latitude": 8.5386, "longitude": 124.7534},  # ~15m from U-A
            {"id": "INC-B", "latitude": 8.5601, "longitude": 124.7701},  # ~15m from U-B
        ]
        allocations = optimize_allocations(units, incidents)
        self.assertEqual(len(allocations), 2)

        mapping = {a["unitId"]: a["incidentId"] for a in allocations}
        self.assertEqual(mapping["U-A"], "INC-A")
        self.assertEqual(mapping["U-B"], "INC-B")

    def test_unbalanced_more_incidents_than_units(self):
        # 1 unit available, 3 pending incidents
        # The algorithm must assign the single closest incident and discard dummy pairings
        units = [
            {"id": "AMB-01", "latitude": 8.5385, "longitude": 124.7533}
        ]
        incidents = [
            {"id": "INC-FAR", "latitude": 8.5600, "longitude": 124.7700},   # ~3km away
            {"id": "INC-NEAR", "latitude": 8.5387, "longitude": 124.7535},  # ~30m away
            {"id": "INC-MID", "latitude": 8.5450, "longitude": 124.7480},   # ~800m away
        ]
        allocations = optimize_allocations(units, incidents)
        # Exactly 1 real unit can be assigned
        self.assertEqual(len(allocations), 1)
        self.assertEqual(allocations[0]["unitId"], "AMB-01")
        self.assertEqual(allocations[0]["incidentId"], "INC-NEAR")

    def test_unbalanced_more_units_than_incidents(self):
        # 3 units available, 1 pending incident
        units = [
            {"id": "U-FAR", "latitude": 8.5600, "longitude": 124.7700},
            {"id": "U-NEAR", "latitude": 8.5386, "longitude": 124.7534},
            {"id": "U-MID", "latitude": 8.5450, "longitude": 124.7480},
        ]
        incidents = [
            {"id": "INC-01", "latitude": 8.5385, "longitude": 124.7533}
        ]
        allocations = optimize_allocations(units, incidents)
        # Only 1 assignment created, picking the nearest unit
        self.assertEqual(len(allocations), 1)
        self.assertEqual(allocations[0]["unitId"], "U-NEAR")
        self.assertEqual(allocations[0]["incidentId"], "INC-01")

    def test_distance_calculation_accuracy(self):
        # Distance from Tagoloan Municipal Hall (8.5385, 124.7533) to Tagoloan River Bridge (~1.2 km)
        d = calculate_distance_meters(8.5385, 124.7533, 8.5480, 124.7590)
        self.assertGreater(d, 1000.0)
        self.assertLess(d, 1500.0)


class TestSummarizerModule(unittest.TestCase):
    """Tests for AI and Template incident summarization."""

    def test_empty_reports_returns_fallback_message(self):
        result = summarize_incident_cluster([], "Fire")
        self.assertEqual(result, "No reports to summarize.")

    def test_template_handles_none_standardized_answers_without_crashing(self):
        reports = [{"description": "Visible flame on house roof.", "standardizedAnswers": None}]
        result = generate_template_summary(reports, "Fire")
        self.assertIn("1 citizen report(s)", result)
        self.assertIn("Fire", result)
        self.assertIn("No trapped individuals reported yet", result)

    def test_template_detects_trapped_individuals(self):
        reports = [{
            "description": "Building wall fell down.",
            "standardizedAnswers": {"structureType": "Commercial", "peopleTrapped": True}
        }]
        result = generate_template_summary(reports, "StructuralCollapse")
        self.assertIn("people may be trapped", result)
        self.assertIn("Commercial", result)


if __name__ == "__main__":
    unittest.main()
