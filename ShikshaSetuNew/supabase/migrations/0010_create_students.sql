-- Create ENUMs for Students Domain
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create students table
CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  student_code      VARCHAR(30) NOT NULL,        -- institution-assigned student ID
  date_of_birth     DATE,
  gender            gender_type,
  guardian_name     TEXT,
  guardian_phone    TEXT,
  guardian_email    TEXT,
  blood_group       VARCHAR(5),
  address           TEXT,
  admission_date    DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, student_code)
);

CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_students_user_id ON students(user_id);
