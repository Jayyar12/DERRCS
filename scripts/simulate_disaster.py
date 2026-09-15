#!/usr/bin/env python3
"""
DERRCS Disaster Simulation and Report Generator
Simulates incoming citizen reports during a disaster in Tagoloan, Misamis Oriental.
Uses standard Python 3 libraries to avoid external dependency requirements.
"""

import argparse
import json
import random
import time
import urllib.error
import urllib.request
import uuid


# Tagoloan barangay reference epicenters
EPICENTERS = {
    "Poblacion": {"lat": 8.5385, "lng": 124.7533},
    "Baluarte": {"lat": 8.5450, "lng": 124.7480},
    "Casinglot": {"lat": 8.5280, "lng": 124.7610},
    "Natumolan": {"lat": 8.5350, "lng": 124.7450},
    "SantaAna": {"lat": 8.5520, "lng": 124.7650},
}

REPORT_DESCRIPTIONS = [
    "Two-story building collapsed near the highway crossing. Debris blocking road.",
    "Structure collapse reported. Loud crashing sound heard, dust everywhere.",
    "Building wall gave way. Several pedestrians ran, someone may be trapped.",
    "Heavy damage to concrete structure. People calling for help from inside.",
    "Partial roof collapse on commercial building near market area.",
    "Collapsed building, visible dust cloud. Neighbors gathering to help.",
    "Wall fell onto the sidewalk. Road access blocked for vehicles.",
    "Severe structural damage observed. Need rescue personnel urgently.",
]


def generate_jittered_coordinate(center_coord: float, max_offset_meters: float = 100.0) -> float:
    """
    Applies small random distance jitter to a coordinate.
    One degree latitude/longitude roughly equals 111,000 meters.
    """
    offset_degrees = (max_offset_meters / 111000.0) * random.uniform(-1.0, 1.0)
    return round(center_coord + offset_degrees, 6)


def build_report_payload(epicenter_name: str, emergency_type: str) -> dict:
    """Constructs a realistic emergency report payload matching DERRCS api-contracts.md."""
    base_location = EPICENTERS.get(epicenter_name, EPICENTERS["Poblacion"])

    emergency_lat = generate_jittered_coordinate(base_location["lat"], max_offset_meters=80.0)
    emergency_lng = generate_jittered_coordinate(base_location["lng"], max_offset_meters=80.0)

    # Reporter position differs slightly from actual incident site
    reporter_lat = generate_jittered_coordinate(emergency_lat, max_offset_meters=50.0)
    reporter_lng = generate_jittered_coordinate(emergency_lng, max_offset_meters=50.0)

    return {
        "sessionId": f"sim-sess-{uuid.uuid4().hex[:8]}",
        "emergencyType": emergency_type,
        "description": random.choice(REPORT_DESCRIPTIONS),
        "reporterCoordinates": {
            "latitude": reporter_lat,
            "longitude": reporter_lng,
        },
        "emergencyCoordinates": {
            "latitude": emergency_lat,
            "longitude": emergency_lng,
        },
        "photoUrl": "https://storage.local/uploads/sim-collapse-01.jpg",
        "standardizedAnswers": {
            "structureType": random.choice(["Commercial", "Residential", "PublicBuilding"]),
            "peopleTrapped": random.choice([True, False, True]),
            "hazardousMaterialsNearby": False,
            "roadPassable": False,
        },
    }


def send_report(endpoint_url: str, payload: dict) -> tuple[bool, int, str]:
    """Sends JSON report payload via HTTP POST using standard urllib."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint_url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "DERRCS-Simulator/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return True, resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode("utf-8")
    except urllib.error.URLError as e:
        return False, 0, str(e.reason)


def main():
    parser = argparse.ArgumentParser(description="Simulate mass citizen emergency reporting for DERRCS.")
    parser.add_argument("--count", type=int, default=30, help="Number of reports to send (default: 30)")
    parser.add_argument("--barangay", type=str, default="Poblacion", choices=list(EPICENTERS.keys()), help="Target barangay epicenter")
    parser.add_argument("--type", type=str, default="StructuralCollapse", help="Emergency category")
    parser.add_argument("--endpoint", type=str, default="http://localhost:5000/api/v1/reports", help="Ingestion API endpoint")
    parser.add_argument("--delay", type=float, default=0.08, help="Delay in seconds between reports")
    parser.add_argument("--dry-run", action="store_true", help="Print payloads to console without sending network requests")

    args = parser.parse_args()

    print("==========================================================")
    print("DERRCS Disaster Load & Clustering Simulator")
    print(f"Target Barangay: {args.barangay}")
    print(f"Emergency Type:  {args.type}")
    print(f"Report Volume:   {args.count} reports")
    print(f"Target Endpoint: {args.endpoint}")
    print(f"Dry Run Mode:    {args.dry_run}")
    print("==========================================================")

    successful_count = 0
    start_time = time.time()

    for idx in range(1, args.count + 1):
        payload = build_report_payload(args.barangay, args.type)

        if args.dry_run:
            print(f"\n[DRY RUN - Report #{idx}]")
            print(json.dumps(payload, indent=2))
            successful_count += 1
        else:
            success, status_code, response_body = send_report(args.endpoint, payload)
            if success:
                successful_count += 1
                print(f"[{idx}/{args.count}] Status: {status_code} - Report accepted.")
            else:
                print(f"[{idx}/{args.count}] Failed (Status {status_code}): {response_body}")

        time.sleep(args.delay)

    total_duration = round(time.time() - start_time, 2)
    print("\n==========================================================")
    print(f"Simulation Complete.")
    print(f"Total Sent:     {successful_count} / {args.count}")
    print(f"Total Duration: {total_duration} seconds")
    if successful_count > 0:
        rate = round(successful_count / total_duration, 1)
        print(f"Throughput:     {rate} reports/second")
    print("==========================================================")


if __name__ == "__main__":
    main()
