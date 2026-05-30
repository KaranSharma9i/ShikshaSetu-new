-- Migration: 0028_homework_columns.sql
-- ------------------------------------------------------------
-- Add new columns to homework and homework_submissions tables
-- ------------------------------------------------------------

-- ============================================================
-- homework table alterations
-- ============================================================

-- Add difficulty column
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS difficulty TEXT
CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
DEFAULT 'Medium';

-- Add file_url for question sheet/attachment
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add status column
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS status TEXT
CHECK (status IN ('draft', 'active', 'archived'))
DEFAULT 'active';

-- ============================================================
-- homework_submissions table alterations
-- ============================================================

-- Add status column
ALTER TABLE homework_submissions
ADD COLUMN IF NOT EXISTS status TEXT
CHECK (status IN ('submitted', 'scored'))
DEFAULT 'submitted';

-- Add ai_score column
ALTER TABLE homework_submissions
ADD COLUMN IF NOT EXISTS ai_score NUMERIC;

-- Add file_url for student uploaded file
ALTER TABLE homework_submissions
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Alter feedback from text to jsonb (or add ai_feedback jsonb)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM homework_submissions
    WHERE feedback IS NOT NULL
  ) THEN
    RAISE NOTICE 'feedback column has data — adding ai_feedback jsonb instead';
    ALTER TABLE homework_submissions
    ADD COLUMN IF NOT EXISTS ai_feedback JSONB;
  ELSE
    RAISE NOTICE 'feedback column is empty — altering to jsonb';
    ALTER TABLE homework_submissions
    ALTER COLUMN feedback TYPE JSONB
    USING feedback::jsonb;
  END IF;
END $$;
