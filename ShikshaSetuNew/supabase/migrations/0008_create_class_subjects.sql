CREATE TABLE class_subjects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  subject_id        UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  teacher_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  max_marks         NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (section_id, subject_id, academic_year_id)
);

CREATE INDEX idx_class_subjects_section ON class_subjects(section_id);
CREATE INDEX idx_class_subjects_teacher ON class_subjects(teacher_id);
