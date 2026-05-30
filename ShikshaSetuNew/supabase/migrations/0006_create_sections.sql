CREATE TABLE sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name              VARCHAR(10) NOT NULL,  -- e.g. 'A', 'B', 'Rose'
  capacity          SMALLINT CHECK (capacity > 0),
  class_teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (class_id, academic_year_id, name)
);

CREATE INDEX idx_sections_class_id ON sections(class_id);
CREATE INDEX idx_sections_academic_year ON sections(academic_year_id);
