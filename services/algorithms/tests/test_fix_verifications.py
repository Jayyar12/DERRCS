"""
Unit and integration verification tests for algorithmic fixes.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from clustering import cluster_reports, haversine_distance_meters


class TestFixVerifications(unittest.TestCase):
    def test_emergency_type_snake_and_camel_case_matching(self):
        # Existing candidate from PostgreSQL with snake_case 'emergency_type'
        existing_candidates = [
            {
                "id": "cand-001",
                "emergency_type": "Fire",
                "latitude": 8.5385,
                "longitude": 124.7533
            }
        ]
        # Incoming report with camelCase 'emergencyType'
        incoming_report = [
            {
                "id": "rep-new",
                "emergencyType": "Fire",
                "latitude": 8.5386,
                "longitude": 124.7534
            }
        ]
        results = cluster_reports(incoming_report, existing_candidates=existing_candidates, epsilon_meters=100.0)
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["isDuplicate"])
        self.assertEqual(results[0]["clusterId"], "cand-001")

    def test_emergency_type_mismatch_prevents_clustering(self):
        # Fire vs Flood at same GPS coordinates
        existing_candidates = [
            {
                "id": "cand-002",
                "emergency_type": "Flood",
                "latitude": 8.5385,
                "longitude": 124.7533
            }
        ]
        incoming_report = [
            {
                "id": "rep-fire",
                "emergencyType": "Fire",
                "latitude": 8.5385,
                "longitude": 124.7533
            }
        ]
        results = cluster_reports(incoming_report, existing_candidates=existing_candidates, epsilon_meters=100.0)
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["isDuplicate"])
        self.assertEqual(results[0]["clusterId"], -1)


if __name__ == "__main__":
    unittest.main()
