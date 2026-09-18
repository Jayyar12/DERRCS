-- Phase 4 frontend support
-- Adds the documented responder "En Route" operational status to assignments.
-- No tables or columns are introduced: the baseline response_units table
-- already supports EnRoute and the UI needs the assignment record to agree.

ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_status_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_status_check
  CHECK (status IN ('Dispatched', 'Acknowledged', 'EnRoute', 'OnScene', 'Completed', 'Cancelled'));

