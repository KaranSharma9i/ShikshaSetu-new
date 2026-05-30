CREATE TABLE teachers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  employee_code     VARCHAR(30) NOT NULL,
  date_of_birth     DATE,
  gender            gender_type,              -- reuse enum from students domain
  qualification     TEXT,
  specialization    TEXT,
  date_of_joining   DATE,
  address           TEXT,
  emergency_contact TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, employee_code)
);

CREATE INDEX idx_teachers_institution ON teachers(institution_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
