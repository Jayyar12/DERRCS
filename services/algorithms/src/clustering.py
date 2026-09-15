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


def cluster_reports(reports: list[dict], epsilon_meters: float = 100.0, min_points: int = 2) -> list[dict]:
    """
    Clusters a list of reports by emergency location using DBSCAN.
    Coordinates must be in degrees [latitude, longitude].
    """
    if not reports:
        return []

    # Earth radius in meters used to convert epsilon to radians for haversine metric
    kms_per_radian = 6371000.0
    epsilon_radians = epsilon_meters / kms_per_radian

    # Extract coordinates in radians for scikit-learn haversine metric: [lat_rad, lon_rad]
    coords_rad = np.array([[math.radians(r["latitude"]), math.radians(r["longitude"])] for r in reports])

    db = DBSCAN(eps=epsilon_radians, min_samples=min_points, metric="haversine")
    labels = db.fit_predict(coords_rad)

    clustered_results = []
    for idx, report in enumerate(reports):
        clustered_results.append({
            "reportId": report["id"],
            "clusterId": int(labels[idx]),  # -1 represents noise / single unclustered report
            "isDuplicate": bool(labels[idx] != -1)
        })

    return clustered_results


if __name__ == "__main__":
    # Smoke test with sample Tagoloan coordinates
    sample_reports = [
        {"id": "rep-1", "latitude": 8.5385, "longitude": 124.7533},
        {"id": "rep-2", "latitude": 8.5386, "longitude": 124.7534},  # ~15 meters away
        {"id": "rep-3", "latitude": 8.5450, "longitude": 124.7480},  # ~800 meters away in Baluarte
    ]
    results = cluster_reports(sample_reports, epsilon_meters=100.0, min_points=2)
    print("DBSCAN Test Results:")
    for res in results:
        print(f"Report: {res['reportId']} -> Cluster: {res['clusterId']} (Duplicate: {res['isDuplicate']})")
