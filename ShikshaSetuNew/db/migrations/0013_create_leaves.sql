CREATE TABLE leaves (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  from_date         DATE NOT NULL,
  to_date           DATE NOT NULL,
  reason            TEXT NOT NULL,
  status            leave_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  CHECK (to_date >= from_date)
);

CREATE INDEX idx_leaves_student ON leaves(student_id);
CREATE INDEX idx_leaves_status ON leaves(status);
