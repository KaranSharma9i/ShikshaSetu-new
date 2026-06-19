-- Migration: 0047_create_exam_terms_and_locks.sql
-- Additive only migration to set up exam terms, linkage to exams, and trigger-based locking.

BEGIN;

-- groups multiple subject-exams into one named term per class/year
CREATE TABLE public.exam_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  name text NOT NULL,
  term_type text NULL,
  starts_on date NULL,
  ends_on date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT exam_terms_unique UNIQUE (institution_id, academic_year_id, class_id, name)
);

-- link each subject-exam to its term (nullable so existing rows are untouched)
ALTER TABLE public.exams
  ADD COLUMN exam_term_id uuid NULL REFERENCES exam_terms(id) ON DELETE SET NULL;

-- row-level lock/finalize
ALTER TABLE public.exams
  ADD COLUMN is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN locked_at timestamptz NULL,
  ADD COLUMN locked_by uuid NULL REFERENCES users(id) ON DELETE RESTRICT;

-- DB-level enforcement: blocks writes to exam_results when the parent exam is locked,
-- regardless of whether mobile or web is doing the writing
CREATE OR REPLACE FUNCTION public.check_exam_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT is_locked INTO v_locked FROM public.exams WHERE id = NEW.exam_id;
  IF v_locked THEN
    RAISE EXCEPTION 'Cannot modify exam_results: exam % is locked', NEW.exam_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_results_lock_check
  BEFORE INSERT OR UPDATE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.check_exam_not_locked();

COMMIT;
