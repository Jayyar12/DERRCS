-- =============================================================================
-- DERRCS — Phase 3 Migration
-- State Machine, Escalation Tracking & Activity Log Enhancement
-- =============================================================================
-- Run order: apply AFTER the baseline schema (database-schema.sql).
-- Safe to run multiple times — all statements use IF NOT EXISTS guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure escalation_level column exists on incidents
--    (already present in baseline schema as INT DEFAULT 0)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'escalation_level'
  ) THEN
    ALTER TABLE incidents ADD COLUMN escalation_level INT NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added escalation_level to incidents.';
  ELSE
    RAISE NOTICE 'escalation_level already exists on incidents — skipping.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Ensure updated_at column exists on incidents
--    (needed by the escalation worker's UPDATE statement)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE incidents
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added updated_at to incidents.';
  ELSE
    RAISE NOTICE 'updated_at already exists on incidents — skipping.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Validate the status CHECK constraint includes all 6 lifecycle states
--    PostgreSQL CHECK constraints cannot be altered in-place; drop + recreate
--    if the existing constraint does not already cover all states.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO v_constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'incidents'
     AND c.contype = 'c'
     AND c.conname LIKE '%status%'
   LIMIT 1;

  -- Only re-create if missing or does not include 'Closed'
  IF v_constraint_def IS NULL OR v_constraint_def NOT LIKE '%Closed%' THEN
    -- Drop old constraint if it exists (name may vary)
    EXECUTE (
      SELECT 'ALTER TABLE incidents DROP CONSTRAINT IF EXISTS ' || quote_ident(conname)
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'incidents'
         AND c.contype = 'c'
         AND pg_get_constraintdef(c.oid) LIKE '%status%'
       LIMIT 1
    );

    ALTER TABLE incidents
      ADD CONSTRAINT incidents_status_check
      CHECK (status IN ('Reported', 'Validated', 'Dispatched', 'Active', 'Resolved', 'Closed'));

    RAISE NOTICE 'Recreated incidents.status CHECK constraint with all 6 states.';
  ELSE
    RAISE NOTICE 'incidents.status CHECK constraint already includes all 6 states — skipping.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Indexes for escalation worker queries
--    The worker queries WHERE status IN ('Reported','Validated') frequently.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_incidents_status_escalation
  ON incidents (status, created_at, validated_at)
  WHERE status IN ('Reported', 'Validated');

CREATE INDEX IF NOT EXISTS idx_incidents_escalation_level
  ON incidents (escalation_level);

-- ---------------------------------------------------------------------------
-- 5. Indexes for activity_logs queries
--    The state machine and worker insert here constantly; we need fast lookups
--    by entity for auditing and the UI log feed.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_name, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON activity_logs (action);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Helper view: incident_audit_trail
--    Joins activity_logs with users for easy incident timeline queries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW incident_audit_trail AS
  SELECT
    al.id,
    al.entity_id                          AS incident_id,
    al.action,
    al.details->>'previousState'          AS previous_state,
    al.details->>'newState'               AS new_state,
    al.details->>'previousLevel'          AS previous_escalation_level,
    al.details->>'newLevel'               AS new_escalation_level,
    al.details->>'changedBy'              AS changed_by_id,
    COALESCE(u.full_name, 'system')       AS changed_by_name,
    al.created_at                         AS occurred_at
  FROM activity_logs al
  LEFT JOIN users u ON u.id::TEXT = al.details->>'changedBy'
  WHERE al.entity_name = 'incidents'
    AND al.action IN ('STATE_TRANSITION', 'ESCALATION')
  ORDER BY al.created_at DESC;

-- ---------------------------------------------------------------------------
-- 7. Verification queries (run manually to confirm migration success)
-- ---------------------------------------------------------------------------
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'incidents'
--   ORDER BY ordinal_position;
--
-- SELECT * FROM incident_audit_trail LIMIT 20;
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'incidents';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'activity_logs';
