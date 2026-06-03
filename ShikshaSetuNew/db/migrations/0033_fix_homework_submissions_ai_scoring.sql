-- Migration: 0033_fix_homework_submissions_ai_scoring.sql
-- ------------------------------------------------------------
-- Fix homework_submissions table for AI scoring & create ai_daily_quotas
-- ------------------------------------------------------------

-- PART A — Fix homework_submissions table

-- A1 — Handle ai_feedback column
DO $$ BEGIN
  -- If old column is named 'feedback', rename it to ai_feedback
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE homework_submissions RENAME COLUMN feedback TO ai_feedback;
  END IF;

  -- If ai_feedback still doesn't exist after rename attempt, add it fresh
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'ai_feedback'
  ) THEN
    ALTER TABLE homework_submissions ADD COLUMN ai_feedback JSONB DEFAULT NULL;
  END IF;

  -- If ai_feedback exists but is TEXT type (not JSONB), drop and re-add as JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions'
      AND column_name = 'ai_feedback'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE homework_submissions DROP COLUMN ai_feedback;
    ALTER TABLE homework_submissions ADD COLUMN ai_feedback JSONB DEFAULT NULL;
  END IF;
END $$;

-- A2 — Fix ai_score column
-- Scale down any existing scores > 10 to fit the 0-10 range and clamp negative scores to 0
UPDATE homework_submissions
SET ai_score = ai_score / 10.0
WHERE ai_score > 10;

UPDATE homework_submissions
SET ai_score = 0
WHERE ai_score < 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'ai_score'
  ) THEN
    ALTER TABLE homework_submissions
      ADD COLUMN ai_score NUMERIC(4,2)
      CONSTRAINT ai_score_range CHECK (ai_score >= 0 AND ai_score <= 10);
  ELSE
    -- Alter precision if column exists (safe — only changes type metadata)
    ALTER TABLE homework_submissions
      ALTER COLUMN ai_score TYPE NUMERIC(4,2);

    -- Add check constraint if not already there
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ai_score_range' AND conrelid = 'homework_submissions'::regclass
    ) THEN
      ALTER TABLE homework_submissions
        ADD CONSTRAINT ai_score_range CHECK (ai_score >= 0 AND ai_score <= 10);
    END IF;
  END IF;
END $$;

-- A3 — Add scored_at column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'scored_at'
  ) THEN
    ALTER TABLE homework_submissions ADD COLUMN scored_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- A4 — Add attachment_urls column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'attachment_urls'
  ) THEN
    ALTER TABLE homework_submissions ADD COLUMN attachment_urls TEXT[] DEFAULT NULL;
  END IF;
END $$;

-- A5 — Migrate file_url → attachment_urls, then drop file_url
-- Migrate any existing data first
UPDATE homework_submissions
SET attachment_urls = ARRAY[file_url]
WHERE file_url IS NOT NULL
  AND (attachment_urls IS NULL OR array_length(attachment_urls, 1) IS NULL);

-- Drop old column
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE homework_submissions DROP COLUMN file_url;
  END IF;
END $$;

-- A6 — Add UNIQUE constraint on (homework_id, student_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'homework_submissions_homework_id_student_id_key'
  ) THEN
    ALTER TABLE homework_submissions
      ADD CONSTRAINT homework_submissions_homework_id_student_id_key
      UNIQUE (homework_id, student_id);
  END IF;
END $$;

-- A7 — Document the ai_feedback JSONB shape in a comment
COMMENT ON COLUMN homework_submissions.ai_feedback IS
'AI evaluation breakdown stored as JSONB.

Standard plan shape:
{
  "completeness": 8.0,
  "concept_clarity": 7.0,
  "presentation": 8.0
}

Pro plan shape (includes Standard fields plus):
{
  "completeness": 8.0,
  "concept_clarity": 7.0,
  "presentation": 8.0,
  "insights": ["actionable tip 1", "actionable tip 2"],
  "wrong_answers": [{"question_number": 3, "description": "Explanation"}],
  "partial_answers": [{"question_number": 5, "description": "Explanation"}]
}

All numeric sub-scores are 0-10. insights is always exactly 2 strings for Pro.
wrong_answers and partial_answers are empty arrays [] if none found.';


-- PART B — Create ai_daily_quotas table

CREATE TABLE IF NOT EXISTS ai_daily_quotas (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID         NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  institution_id    UUID         NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  submission_date   DATE         NOT NULL,
  count             INTEGER      NOT NULL DEFAULT 0,
  plan_limit        INTEGER      NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- NOTE: No deleted_at. Quota rows are never soft-deleted.
  -- Quota resets naturally because each day gets its own row (keyed by submission_date).
);

-- Unique: one row per student per day
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_daily_quotas_student_id_submission_date_key'
  ) THEN
    ALTER TABLE ai_daily_quotas
      ADD CONSTRAINT ai_daily_quotas_student_id_submission_date_key
      UNIQUE (student_id, submission_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ai_daily_quotas_student_date_idx
  ON ai_daily_quotas(student_id, submission_date);

CREATE INDEX IF NOT EXISTS ai_daily_quotas_institution_idx
  ON ai_daily_quotas(institution_id);


-- PART C — RLS for ai_daily_quotas

ALTER TABLE ai_daily_quotas ENABLE ROW LEVEL SECURITY;

-- Drop policies first to make this re-runnable
DROP POLICY IF EXISTS "Students read own daily quota" ON ai_daily_quotas;
DROP POLICY IF EXISTS "Service role full access to ai_daily_quotas" ON ai_daily_quotas;

-- Students can only read their own quota row
CREATE POLICY "Students read own daily quota"
  ON ai_daily_quotas
  FOR SELECT
  USING (
    student_id IN (
      SELECT s.id
      FROM students s
      WHERE s.user_id = auth.uid()
    )
  );
