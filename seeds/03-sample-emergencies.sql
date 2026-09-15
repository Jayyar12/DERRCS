-- DERRCS Sample Emergency Data Seed Script
-- Inserts realistic sample reports, candidate clusters, incidents, and assignments in Tagoloan.

-- 1. INSERT SAMPLE CITIZEN REPORTS
INSERT INTO reports (id, session_id, emergency_type, description, reporter_location, emergency_location, standardized_answers, status)
VALUES
(
    'c1111111-1111-1111-1111-111111111111',
    'anon-sess-001',
    'Fire',
    'Black smoke coming from residential house near Tagoloan Plaza.',
    ST_SetSRID(ST_MakePoint(124.7530, 8.5383), 4326),
    ST_SetSRID(ST_MakePoint(124.7533, 8.5385), 4326),
    '{"structureType": "Residential", "peopleTrapped": false, "roadPassable": true}'::jsonb,
    'Clustered'
),
(
    'c2222222-2222-2222-2222-222222222222',
    'anon-sess-002',
    'Fire',
    'Roof on fire near plaza. Flames visible from street.',
    ST_SetSRID(ST_MakePoint(124.7535, 8.5387), 4326),
    ST_SetSRID(ST_MakePoint(124.7534, 8.5386), 4326),
    '{"structureType": "Residential", "peopleTrapped": false, "roadPassable": true}'::jsonb,
    'Clustered'
),
(
    'c3333333-3333-3333-3333-333333333333',
    'anon-sess-003',
    'Flood',
    'Tagoloan River overflowing near Baluarte spillway. Water knee-deep.',
    ST_SetSRID(ST_MakePoint(124.7482, 8.5452), 4326),
    ST_SetSRID(ST_MakePoint(124.7480, 8.5450), 4326),
    '{"peopleTrapped": true, "roadPassable": false}'::jsonb,
    'Received'
)
ON CONFLICT (id) DO NOTHING;

-- 2. INSERT AN INCIDENT CANDIDATE (DBSCAN Cluster from the two fire reports)
INSERT INTO incident_candidates (id, cluster_label, emergency_type, status, center_location, report_count)
VALUES
(
    'e1111111-1111-1111-1111-111111111111',
    'cluster-fire-poblacion-01',
    'Fire',
    'Confirmed',
    ST_SetSRID(ST_MakePoint(124.75335, 8.53855), 4326),
    2
)
ON CONFLICT (id) DO NOTHING;

-- Link reports to the candidate
UPDATE reports SET candidate_id = 'e1111111-1111-1111-1111-111111111111'
WHERE id IN ('c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222');

-- 3. INSERT AN ACTIVE VALIDATED INCIDENT
INSERT INTO incidents (id, candidate_id, incident_code, emergency_type, severity, status, location, address_text, created_at, validated_at)
VALUES
(
    'f1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'INC-2026-0001',
    'Fire',
    'High',
    'Validated',
    ST_SetSRID(ST_MakePoint(124.75335, 8.53855), 4326),
    'Zone 2, Barangay Poblacion, Tagoloan, Misamis Oriental',
    CURRENT_TIMESTAMP - INTERVAL '3 minutes',
    CURRENT_TIMESTAMP - INTERVAL '1 minute'
)
ON CONFLICT (id) DO NOTHING;

UPDATE reports SET incident_id = 'f1111111-1111-1111-1111-111111111111'
WHERE candidate_id = 'e1111111-1111-1111-1111-111111111111';

-- 4. INSERT AN AI INTAKE SUMMARY FOR THE INCIDENT
INSERT INTO summaries (id, candidate_id, incident_id, summary_type, content, is_fallback, version)
VALUES
(
    'd1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'ClusterIntake',
    'Two citizen reports indicate a residential structure fire in Zone 2, Poblacion near Tagoloan Plaza. Callers observed heavy black smoke and visible flames on the roof. No persons reported trapped at this time. Road access remains open.',
    FALSE,
    1
)
ON CONFLICT (id) DO NOTHING;
