-- Migration: 0049_add_homework_needs_regeneration_status.sql
-- ------------------------------------------------------------
-- Update homework_generation_status_check constraint to include 'needs_regeneration'
-- ------------------------------------------------------------

BEGIN;

-- Drop the old check constraint
ALTER TABLE homework 
DROP CONSTRAINT IF EXISTS homework_generation_status_check;

-- Re-create the check constraint with the new 'needs_regeneration' state included
ALTER TABLE homework 
ADD CONSTRAINT homework_generation_status_check 
CHECK (generation_status IN ('generating', 'generated', 'published', 'failed', 'needs_regeneration'));

COMMIT;
