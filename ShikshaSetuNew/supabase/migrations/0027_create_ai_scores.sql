-- Migration: 0027_create_ai_scores.sql
-- ------------------------------------------------------------
-- AI Score history table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score               NUMERIC(5,2) NOT NULL,
  date                DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_scores_student ON ai_scores(student_id);
