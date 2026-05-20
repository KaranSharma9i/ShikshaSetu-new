-- Migration: 0018_create_exams.sql
-- ------------------------------------------------------------
-- Exams and Exam Results tables for the Margam ERP platform
-- ------------------------------------------------------------

-- Exams table stores information about each scheduled exam
CREATE TABLE exams (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id    UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  subject_id          UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  exam_name           TEXT NOT NULL,
  exam_type           TEXT,               -- e.g., "midterm", "final", "quiz"
  exam_date           DATE NOT NULL,
  start_time          TIME,
  end_time            TIME,
  total_marks         NUMERIC(6,2) DEFAULT 100,
  passing_marks       NUMERIC(6,2) DEFAULT 40,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date)
);

CREATE INDEX idx_exams_institution ON exams(institution_id);
CREATE INDEX idx_exams_academic_year ON exams(academic_year_id);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_exams_subject ON exams(subject_id);

-- Exam results table stores each student's performance for a particular exam
CREATE TABLE exam_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  marks_obtained      NUMERIC(6,2),
  grade               TEXT,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (exam_id, student_id)
);

CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);

-- Triggers to auto‑update updated_at column (PostgreSQL syntax)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exams_timestamp BEFORE UPDATE ON exams
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_exam_results_timestamp BEFORE UPDATE ON exam_results
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
