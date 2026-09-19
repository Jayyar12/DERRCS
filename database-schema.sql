-- Digital Emergency Reporting and Response Coordination System (DERRCS)
-- Database Schema Definition for PostgreSQL with PostGIS Extension

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & PERMISSIONS
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id INT NOT NULL REFERENCES roles(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INCIDENT CANDIDATES (CLUSTERS IDENTIFIED BY DBSCAN)
CREATE TABLE incident_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_label VARCHAR(100),
    emergency_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Dismissed')),
    center_location GEOMETRY(Point, 4326) NOT NULL,
    report_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INCIDENTS (CONFIRMED EMERGENCIES)
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES incident_candidates(id),
    incident_code VARCHAR(20) UNIQUE NOT NULL,
    emergency_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Moderate' CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical')),
    status VARCHAR(30) DEFAULT 'Reported' CHECK (status IN ('Reported', 'Validated', 'Dispatched', 'Active', 'Resolved', 'Closed')),
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,
    escalation_level INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 5. REPORTS (CITIZEN SUBMISSIONS)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES incident_candidates(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    emergency_type VARCHAR(50) NOT NULL,
    description TEXT,
    reporter_location GEOMETRY(Point, 4326),
    emergency_location GEOMETRY(Point, 4326) NOT NULL,
    photo_url TEXT,
    standardized_answers JSONB,
    status VARCHAR(30) DEFAULT 'Received' CHECK (status IN ('Received', 'Clustered', 'Attached', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SUMMARIES (AI GENERATED BRIEFS)
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES incident_candidates(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    summary_type VARCHAR(30) NOT NULL CHECK (summary_type IN ('ClusterIntake', 'HandoverDebrief')),
    content TEXT NOT NULL,
    is_fallback BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. RESPONSE UNITS
CREATE TABLE response_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    unit_code VARCHAR(50) UNIQUE NOT NULL,
    unit_type VARCHAR(50) NOT NULL CHECK (unit_type IN ('Ambulance', 'FireTruck', 'RescueTeam', 'PolicePatrol')),
    current_status VARCHAR(30) DEFAULT 'Available' CHECK (current_status IN ('Available', 'Assigned', 'EnRoute', 'OnScene', 'Maintenance')),
    current_location GEOMETRY(Point, 4326),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ASSIGNMENTS
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES response_units(id),
    assigned_by UUID REFERENCES users(id),
    dispatch_recommended_by_algorithm BOOLEAN DEFAULT TRUE,
    status VARCHAR(30) DEFAULT 'Dispatched' CHECK (status IN ('Dispatched', 'Acknowledged', 'EnRoute', 'OnScene', 'Completed', 'Cancelled')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. FIELD ASSESSMENTS (PRE-HOSPITAL CARE REPORTS)
CREATE TABLE field_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id),
    responder_id UUID NOT NULL REFERENCES users(id),
    patient_name VARCHAR(100),
    approximate_age INT,
    gender VARCHAR(20),
    consciousness_level VARCHAR(30) CHECK (consciousness_level IN ('Alert', 'Verbal', 'Pain', 'Unresponsive')),
    injuries_observed TEXT[],
    interventions_rendered TEXT[],
    disposition VARCHAR(50) CHECK (disposition IN ('TreatedOnScene', 'TransportedHealthCenter', 'TransportedNMMC', 'RefusedCare', 'Deceased')),
    destination_facility VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. ACTIVITY LOGS (AUDIT TRAIL)
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SPATIAL INDEXES (GIST)
CREATE INDEX idx_reports_emergency_loc ON reports USING GIST (emergency_location);
CREATE INDEX idx_reports_reporter_loc ON reports USING GIST (reporter_location);
CREATE INDEX idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX idx_incident_candidates_center ON incident_candidates USING GIST (center_location);
CREATE INDEX idx_response_units_location ON response_units USING GIST (current_location);

-- STANDARD B-TREE INDEXES
CREATE INDEX idx_reports_incident ON reports(incident_id);
CREATE INDEX idx_reports_candidate ON reports(candidate_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_assignments_incident ON assignments(incident_id);
CREATE INDEX idx_assignments_unit ON assignments(unit_id);
CREATE INDEX idx_field_assessments_incident ON field_assessments(incident_id);
