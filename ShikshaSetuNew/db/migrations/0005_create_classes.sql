CREATE TABLE classes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,         -- e.g. 'Grade 10', 'Class 5'
  grade_number      SMALLINT NOT NULL CHECK (grade_number BETWEEN 1 AND 13),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, grade_number)
);

CREATE INDEX idx_classes_institution ON classes(institution_id);
