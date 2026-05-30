CREATE TABLE academic_years (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  label             VARCHAR(7) NOT NULL,   -- e.g. '2024-25'
  starts_on         DATE NOT NULL,
  ends_on           DATE NOT NULL,
  is_current        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, label)
);

CREATE INDEX idx_academic_years_institution ON academic_years(institution_id);
