-- Migration: 0032_add_homework_section.sql
-- ------------------------------------------------------------
-- Add section_id column to homework table and update RLS policies
-- ------------------------------------------------------------

BEGIN;

-- 1. Add section_id column (nullable initially to support existing data)
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE RESTRICT;

-- 2. Populate section_id for existing homework rows by matching their class_id
UPDATE homework h
SET section_id = (
  SELECT s.id 
  FROM sections s 
  WHERE s.class_id = h.class_id 
  LIMIT 1
)
WHERE h.section_id IS NULL;

-- 3. Set the section_id column constraint to NOT NULL
ALTER TABLE homework
ALTER COLUMN section_id SET NOT NULL;

-- 4. Create index on section_id
CREATE INDEX IF NOT EXISTS idx_homework_section ON homework(section_id);

-- 5. Recreate RLS Policy for students to filter by section_id instead of class_id
DROP POLICY IF EXISTS homework_student_read ON homework;

CREATE POLICY homework_student_read ON homework
FOR SELECT
TO public
USING (
  is_student() 
  AND (institution_id = auth_institution_id()) 
  AND (EXISTS (
    SELECT 1
    FROM enrollments e
    WHERE e.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
      AND e.is_active = true
      AND e.section_id = homework.section_id
  ))
);

COMMIT;
