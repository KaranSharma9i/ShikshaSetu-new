-- Migration: 0019_create_homework.sql
-- ------------------------------------------------------------
-- Homework assignments and submissions tables
-- ------------------------------------------------------------

CREATE TABLE homework (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id    UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  subject_id          UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id          UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT,
  assign_date         DATE NOT NULL,
  due_date            DATE NOT NULL,
  total_marks         NUMERIC(6,2) DEFAULT 100,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, academic_year_id, class_id, subject_id, title, assign_date)
);

CREATE INDEX idx_homework_institution ON homework(institution_id);
CREATE INDEX idx_homework_academic_year ON homework(academic_year_id);
CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_homework_subject ON homework(subject_id);
CREATE INDEX idx_homework_teacher ON homework(teacher_id);

CREATE TABLE homework_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id         UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marks_obtained      NUMERIC(6,2),
  feedback            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (homework_id, student_id)
);

CREATE INDEX idx_hw_sub_homework ON homework_submissions(homework_id);
CREATE INDEX idx_hw_sub_student ON homework_submissions(student_id);
