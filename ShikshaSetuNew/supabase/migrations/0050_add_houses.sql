-- SAFE: CREATE TABLE only — no DROP, no TRUNCATE, no DELETE
CREATE TABLE IF NOT EXISTS houses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  color           TEXT        NOT NULL CHECK (color IN ('red', 'green', 'yellow', 'blue')),
  display_order   INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, color)
);

-- Add house_id to students (NULLABLE — existing rows unaffected)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE SET NULL;

-- Add house_id to teachers (NULLABLE — existing rows unaffected)
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE SET NULL;

-- Seed default houses for all existing institutions
-- SAFE: INSERT only, ON CONFLICT DO NOTHING — no existing rows are modified or deleted
INSERT INTO houses (institution_id, name, color, display_order)
SELECT
  i.id,
  h.name,
  h.color,
  h.display_order
FROM institutions i
CROSS JOIN (
  VALUES
    ('Tagore House', 'red',    1),
    ('Gandhi House', 'green',  2),
    ('Azad House',   'yellow', 3),
    ('Ashoka House', 'blue',   4)
) AS h(name, color, display_order)
ON CONFLICT (institution_id, color) DO NOTHING;
