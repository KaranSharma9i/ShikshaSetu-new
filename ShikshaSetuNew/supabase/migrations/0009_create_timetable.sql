-- Create day_of_week ENUM type
CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');

-- Create timetable table
CREATE TABLE timetable (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  class_subject_id  UUID NOT NULL REFERENCES class_subjects(id) ON DELETE RESTRICT,
  day               day_of_week NOT NULL,
  period_number     SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  starts_at         TIME NOT NULL,
  ends_at           TIME NOT NULL,
  room              TEXT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (section_id, day, period_number, academic_year_id),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_timetable_section ON timetable(section_id);
CREATE INDEX idx_timetable_day ON timetable(day);
