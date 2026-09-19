"""
DERRCS Streaming DBSCAN Duplicate Detection Service
Groups nearby citizen reports in real time without requiring cluster counts upfront.
Wired into the report.ingested RabbitMQ queue in Phase 2.
"""

import os
import math
import json
import datetime
import numpy as np
from collections import defaultdict
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
            c_type: str | None = candidate.get("emergencyType") or candidate.get("emergency_type")
            r_type: str | None = report.get("emergencyType") or report.get("emergency_type")
            if c_type and r_type and c_type == r_type:
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


def handle_report_ingested(payload, publish):
    """
    RabbitMQ handler for report.ingested events.
    1. Query active candidates and recent unclustered reports from PostgreSQL.
    2. Try to attach the new report to an existing candidate within 100m (same emergency type).
    3. If no match, gather all recent unclustered reports of the same type and run DBSCAN.
    4. Insert new clusters into incident_candidates AND create linked incidents at Reported.
    5. Publish candidate.created or candidate.updated back to RabbitMQ.
    """
    from db import query, query_one, get_connection, put_connection

    report_id = payload.get('reportId')
    emergency_type = payload.get('emergencyType')
    latitude = payload.get('latitude')
    longitude = payload.get('longitude')

    epsilon = float(os.getenv('DBSCAN_EPSILON_METERS', 100))
    min_pts = int(os.getenv('DBSCAN_MIN_POINTS', 2))
    time_window = int(os.getenv('CLUSTER_TIME_WINDOW_HOURS', 12))

    print(f"[Clustering] Processing report {report_id} ({emergency_type}) at ({latitude}, {longitude})")

    # 1. Fetch active candidates of the same emergency type
    candidates = query(
        """SELECT id, emergency_type,
                  ST_Y(center_location) AS latitude,
                  ST_X(center_location) AS longitude,
                  report_count
           FROM incident_candidates
           WHERE status = 'Pending'
             AND emergency_type = %s
             AND created_at > NOW() - make_interval(hours := %s)""",
        (emergency_type, time_window)
    )

    # 2. Try to attach to an existing candidate within epsilon
    for candidate in candidates:
        dist = haversine_distance_meters(
            latitude, longitude,
            float(candidate['latitude']), float(candidate['longitude'])
        )
        if dist <= epsilon:
            candidate_id = candidate['id']
            new_count = candidate['report_count'] + 1

            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    # Update report to point at this candidate and its linked incident
                    cur.execute(
                        """UPDATE reports
                           SET candidate_id = %s,
                               incident_id = (SELECT id FROM incidents WHERE candidate_id = %s LIMIT 1),
                               status = 'Clustered'
                           WHERE id = %s""",
                        (candidate_id, candidate_id, report_id)
                    )

                    # Recalculate centroid from all attached reports
                    cur.execute(
                        """UPDATE incident_candidates SET
                             report_count = %s,
                             center_location = (
                               SELECT ST_Centroid(ST_Collect(emergency_location))
                               FROM reports WHERE candidate_id = %s
                             ),
                             updated_at = NOW()
                           WHERE id = %s""",
                        (new_count, candidate_id, candidate_id)
                    )
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                put_connection(conn)

            print(f"[Clustering] Attached report {report_id} to existing candidate {candidate_id} (count: {new_count})")
            publish('candidate.updated', {
                'candidateId': str(candidate_id),
                'reportId': str(report_id),
                'reportCount': new_count,
                'emergencyType': emergency_type,
            })
            return

    # 3. No existing candidate matched. Gather recent unclustered reports of the same type.
    unclustered = query(
        """SELECT id,
                  ST_Y(emergency_location) AS latitude,
                  ST_X(emergency_location) AS longitude
           FROM reports
           WHERE status = 'Received'
             AND emergency_type = %s
             AND created_at > NOW() - make_interval(hours := %s)
           ORDER BY created_at DESC""",
        (emergency_type, time_window)
    )

    if len(unclustered) < min_pts:
        print(f"[Clustering] Only {len(unclustered)} unclustered reports for {emergency_type}. Waiting for more.")
        return

    # 4. Run DBSCAN on the unclustered reports
    reports_for_dbscan = [
        {'id': str(r['id']), 'emergencyType': emergency_type,
         'latitude': float(r['latitude']), 'longitude': float(r['longitude'])}
        for r in unclustered
    ]
    results = cluster_reports(reports_for_dbscan, epsilon_meters=epsilon, min_points=min_pts)

    # Group results by cluster label
    clusters = defaultdict(list)
    for result in results:
        if result['clusterId'] != -1:
            clusters[result['clusterId']].append(result['reportId'])

    if not clusters:
        print(f"[Clustering] DBSCAN found no clusters among {len(unclustered)} reports.")
        return

    # 5. For each new cluster, insert into incident_candidates and create a linked incident
    conn = get_connection()
    try:
        created_events: list[dict] = []
        with conn.cursor() as cur:
            for cluster_label, member_report_ids in clusters.items():
                # Compute cluster centroid from member reports
                cur.execute(
                    """SELECT ST_Y(ST_Centroid(ST_Collect(emergency_location))) AS lat,
                              ST_X(ST_Centroid(ST_Collect(emergency_location))) AS lng
                       FROM reports WHERE id = ANY(%s::uuid[])""",
                    (member_report_ids,)
                )
                centroid = cur.fetchone()
                c_lat, c_lng = centroid[0], centroid[1]

                label = f"CLUSTER-{emergency_type[:3].upper()}-{int(datetime.datetime.now().timestamp())}-{cluster_label}"

                # Insert incident_candidate
                cur.execute(
                    """INSERT INTO incident_candidates
                         (cluster_label, emergency_type, status, center_location, report_count)
                       VALUES
                         (%s, %s, 'Pending', ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)
                       RETURNING id""",
                    (label, emergency_type, c_lng, c_lat, len(member_report_ids))
                )
                candidate_id = cur.fetchone()[0]

                # Attach reports to the new candidate
                cur.execute(
                    "UPDATE reports SET candidate_id = %s, status = 'Clustered' WHERE id = ANY(%s::uuid[])",
                    (candidate_id, member_report_ids)
                )

                # Generate incident code: INC-YYYY-NNNN
                year = datetime.datetime.now().year
                cur.execute(
                    """SELECT COALESCE(MAX(SUBSTRING(incident_code FROM 10)::int), 0) + 1
                       FROM incidents
                       WHERE incident_code LIKE %s""",
                    (f'INC-{year}-%',)
                )
                seq: str = str(cur.fetchone()[0]).zfill(4)
                incident_code: str = f"INC-{year}-{seq}"

                # Create linked incident at 'Reported' (preserves 6-stage lifecycle)
                cur.execute(
                    """INSERT INTO incidents
                         (candidate_id, incident_code, emergency_type, severity, status, location)
                       VALUES
                         (%s, %s, %s, 'Moderate', 'Reported',
                          ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                       RETURNING id""",
                    (candidate_id, incident_code, emergency_type, c_lng, c_lat)
                )
                incident_id = cur.fetchone()[0]

                # Link reports to the incident too
                cur.execute(
                    "UPDATE reports SET incident_id = %s WHERE candidate_id = %s",
                    (incident_id, candidate_id)
                )

                print(f"[Clustering] New candidate {candidate_id} ({label}) with {len(member_report_ids)} reports. Incident {incident_code} created at Reported.")

                created_events.append({
                    'candidateId': str(candidate_id),
                    'incidentId': str(incident_id),
                    'incidentCode': incident_code,
                    'emergencyType': emergency_type,
                    'reportCount': len(member_report_ids),
                    'latitude': c_lat,
                    'longitude': c_lng,
                })

            conn.commit()

        # Publish events only after database transaction commits
        for event in created_events:
            publish('candidate.created', event)
    except Exception as e:
        conn.rollback()
        print(f"[Clustering] DB error during cluster insertion: {e}")
        raise
    finally:
        put_connection(conn)


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
