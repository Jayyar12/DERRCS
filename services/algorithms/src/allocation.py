"""
DERRCS Modified Hungarian Algorithm for Emergency Resource Allocation
Optimizes response unit assignments to active incidents by minimizing total travel time.
Extends linear_sum_assignment with matrix padding to handle unbalanced unit/incident counts.
"""

import math
import numpy as np
from scipy.optimize import linear_sum_assignment


def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def optimize_allocations(units: list[dict], incidents: list[dict], average_speed_kmh: float = 40.0) -> list[dict]:
    """
    Finds optimal matching between available response units and active validated incidents.
    Pads cost matrix with large dummy values if unit count does not equal incident count.
    """
    if not units or not incidents:
        return []

    num_units = len(units)
    num_incidents = len(incidents)
    matrix_size = max(num_units, num_incidents)

    # Cost represents travel time in minutes: (distance_meters / (speed_kmh * 1000 / 60))
    speed_meters_per_minute = (average_speed_kmh * 1000.0) / 60.0
    cost_matrix = np.full((matrix_size, matrix_size), fill_value=1e6)  # High penalty for dummy padding

    for u_idx, unit in enumerate(units):
        for i_idx, inc in enumerate(incidents):
            dist = calculate_distance_meters(
                unit["latitude"], unit["longitude"],
                inc["latitude"], inc["longitude"]
            )
            travel_time_minutes = dist / speed_meters_per_minute
            cost_matrix[u_idx, i_idx] = travel_time_minutes

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    recommended_assignments = []
    for u_idx, i_idx in zip(row_ind, col_ind):
        # Exclude dummy padded pairings
        if u_idx < num_units and i_idx < num_incidents:
            travel_time = round(float(cost_matrix[u_idx, i_idx]), 2)
            recommended_assignments.append({
                "unitId": units[u_idx]["id"],
                "incidentId": incidents[i_idx]["id"],
                "estimatedTravelTimeMinutes": travel_time
            })

    return recommended_assignments


if __name__ == "__main__":
    # Smoke test: 2 units and 3 incidents (unbalanced condition)
    sample_units = [
        {"id": "RESCUE-01", "latitude": 8.5388, "longitude": 124.7525},
        {"id": "FIRE-01", "latitude": 8.5395, "longitude": 124.7518}
    ]
    sample_incidents = [
        {"id": "INC-001", "latitude": 8.5385, "longitude": 124.7533},  # ~100m from units
        {"id": "INC-002", "latitude": 8.5520, "longitude": 124.7650},  # ~2km away in Santa Ana
        {"id": "INC-003", "latitude": 8.5450, "longitude": 124.7480}   # ~1km away in Baluarte
    ]
    allocations = optimize_allocations(sample_units, sample_incidents)
    print("Hungarian Allocation Results:")
    for alloc in allocations:
        print(f"Assign {alloc['unitId']} to {alloc['incidentId']} (ETA: {alloc['estimatedTravelTimeMinutes']} mins)")
