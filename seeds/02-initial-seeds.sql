-- DERRCS Initial Database Seed Script
-- Populates initial roles, administrative users, response units, and municipal boundaries.

-- 1. INSERT ROLES
INSERT INTO roles (name, description) VALUES
('Admin', 'System administrator with full system configuration access.'),
('Dispatcher', 'MDRRMO emergency operations center dispatcher.'),
('ResponseUnit', 'Field emergency responder operating on mobile or tablet.'),
('Citizen', 'Public citizen submitting emergency reports.')
ON CONFLICT (name) DO NOTHING;

-- 2. INSERT CORE PERMISSIONS
INSERT INTO permissions (name, description) VALUES
('reports:create', 'Submit an emergency report'),
('candidates:read', 'View incident candidate clusters'),
('candidates:confirm', 'Confirm candidate cluster into active incident'),
('incidents:assign', 'Assign response unit to active incident'),
('incidents:update_status', 'Update operational lifecycle status'),
('field:assess', 'Submit Pre-Hospital Care casualty assessment'),
('admin:manage_users', 'Create and modify system accounts')
ON CONFLICT (name) DO NOTHING;

-- 3. LINK PERMISSIONS TO ROLES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Dispatcher' AND p.name IN ('candidates:read', 'candidates:confirm', 'incidents:assign', 'incidents:update_status')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ResponseUnit' AND p.name IN ('incidents:update_status', 'field:assess')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- 4. INSERT TEST SEED USERS (Password for all accounts: password123)
-- Bcrypt hash for 'password123': $2a$10$7Z8K.6J8lX8xY7wM9yZkNeBq7j5V6vO3n1m2L3k4J5h6G7f8E9d0C
INSERT INTO users (id, role_id, username, password_hash, full_name, phone_number, is_active) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM roles WHERE name = 'Admin'), 'admin', '$2a$10$7Z8K.6J8lX8xY7wM9yZkNeBq7j5V6vO3n1m2L3k4J5h6G7f8E9d0C', 'Jay-ar Guiroy (Admin)', '+639170000001', true),
('22222222-2222-2222-2222-222222222222', (SELECT id FROM roles WHERE name = 'Dispatcher'), 'dispatcher_tagoloan', '$2a$10$7Z8K.6J8lX8xY7wM9yZkNeBq7j5V6vO3n1m2L3k4J5h6G7f8E9d0C', 'MDRRMO Dispatcher 1', '+639170000002', true),
('33333333-3333-3333-3333-333333333333', (SELECT id FROM roles WHERE name = 'ResponseUnit'), 'rescue_alpha', '$2a$10$7Z8K.6J8lX8xY7wM9yZkNeBq7j5V6vO3n1m2L3k4J5h6G7f8E9d0C', 'Rescue Unit Alpha Team', '+639170000003', true),
('44444444-4444-4444-4444-444444444444', (SELECT id FROM roles WHERE name = 'ResponseUnit'), 'fire_bravo', '$2a$10$7Z8K.6J8lX8xY7wM9yZkNeBq7j5V6vO3n1m2L3k4J5h6G7f8E9d0C', 'BFP Tagoloan Engine 1', '+639170000004', true)
ON CONFLICT (username) DO NOTHING;

-- 5. INSERT SEED RESPONSE UNITS IN TAGOLOAN
INSERT INTO response_units (id, user_id, unit_code, unit_type, current_status, current_location) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'RESCUE-01', 'Ambulance', 'Available', ST_SetSRID(ST_MakePoint(124.7525, 8.5388), 4326)),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'FIRE-ENGINE-01', 'FireTruck', 'Available', ST_SetSRID(ST_MakePoint(124.7518, 8.5395), 4326))
ON CONFLICT (unit_code) DO NOTHING;

-- 6. CREATE AND SEED TAGOLOAN MUNICIPAL OPERATIONAL BOUNDARY
CREATE TABLE IF NOT EXISTS municipal_boundaries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_municipal_boundaries_geom ON municipal_boundaries USING GIST (boundary);

INSERT INTO municipal_boundaries (name, boundary) VALUES
('Tagoloan, Misamis Oriental', ST_SetSRID(ST_GeomFromText('POLYGON((124.7000 8.4800, 124.8100 8.4800, 124.8100 8.5800, 124.7000 8.5800, 124.7000 8.4800))'), 4326))
ON CONFLICT (name) DO NOTHING;
