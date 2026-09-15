"""
DERRCS Streaming DBSCAN Duplicate Detection Service
Groups nearby citizen reports in real time without requiring cluster counts upfront.
"""

import math
import numpy as np
from sklearn.cluster import DBSCAN


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on earth in meters."""
    r = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def cluster_reports(reports: list[dict], existing_candidates: list[dict] = None, epsilon_meters: float = 100.0, min_points: int = 2) -> list[dict]:
    """
    Clusters reports by location. Matches against existing candidates first, 
    then runs DBSCAN on remaining reports grouped by emergencyType.
    """
    if not reports:
        return []
        
    existing_candidates = existing_candidates or []
    clustered_results = []
    unclustered = []

    for report in reports:
        attached = False
        for candidate in existing_candidates:
            if candidate.get("emergencyType") == report.get("emergencyType"):
                dist = haversine_distance_meters(
                    report["latitude"], report["longitude"],
                    candidate["latitude"], candidate["longitude"]
                )
                if dist <= epsilon_meters:
                    clustered_results.append({
                        "reportId": report["id"],
                        "clusterId": candidate.get("id"),
                        "isDuplicate": True
                    })
                    attached = True
                    break
        if not attached:
            unclustered.append(report)

    if unclustered:
        from collections import defaultdict
        grouped = defaultdict(list)
        for r in unclustered:
            grouped[r.get("emergencyType")].append(r)
            
        kms_per_radian = 6371000.0
        epsilon_radians = epsilon_meters / kms_per_radian
        new_cluster_offset = 0
        
        for e_type, group_reps in grouped.items():
            if len(group_reps) < min_points:
                for r in group_reps:
                    clustered_results.append({
                        "reportId": r["id"],
                        "clusterId": -1,
                        "isDuplicate": False
                    })
                continue

            coords_rad = np.array([[math.radians(r["latitude"]), math.radians(r["longitude"])] for r in group_reps])
            db = DBSCAN(eps=epsilon_radians, min_samples=min_points, metric="haversine")
            labels = db.fit_predict(coords_rad)
            
            for idx, r in enumerate(group_reps):
                lbl = int(labels[idx])
                clustered_results.append({
                    "reportId": r["id"],
                    "clusterId": (new_cluster_offset + lbl) if lbl != -1 else -1,
                    "isDuplicate": bool(lbl != -1)
                })
            if max(labels) >= 0:
                new_cluster_offset += max(labels) + 1

    return clustered_results


if __name__ == "__main__":
    # Smoke test with sample Tagoloan coordinates
    sample_reports = [
        {"id": "rep-1", "emergencyType": "Fire", "latitude": 8.5385, "longitude": 124.7533},
        {"id": "rep-2", "emergencyType": "Fire", "latitude": 8.5386, "longitude": 124.7534},  # ~15 meters away
        {"id": "rep-3", "emergencyType": "Flood", "latitude": 8.5385, "longitude": 124.7533}, # Same place, different type
    ]
    results = cluster_reports(sample_reports, epsilon_meters=100.0, min_points=2)
    print("DBSCAN Test Results:")
    for res in results:
        print(f"Report: {res['reportId']} -> Cluster: {res['clusterId']} (Duplicate: {res['isDuplicate']})")
