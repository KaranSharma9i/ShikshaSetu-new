CREATE TABLE teacher_performance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  academic_year_id      UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  avg_student_marks     NUMERIC(5,2),        -- average marks of students in their subjects
  homework_assigned     INTEGER DEFAULT 0,
  homework_scored       INTEGER DEFAULT 0,   -- how many submissions were AI-scored
  attendance_rate       NUMERIC(5,2),        -- teacher's own attendance %
  classes_taken         INTEGER DEFAULT 0,
  classes_scheduled     INTEGER DEFAULT 0,
  notes                 TEXT,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (teacher_id, academic_year_id)
);

CREATE INDEX idx_teacher_performance_teacher ON teacher_performance(teacher_id);
CREATE INDEX idx_teacher_performance_year ON teacher_performance(academic_year_id);
