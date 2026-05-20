-- Create ENUM for Teacher Attendance Status
CREATE TYPE teacher_attendance_status AS ENUM ('present', 'absent', 'late', 'on_leave');

-- Create teacher_attendance table
CREATE TABLE teacher_attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  date              DATE NOT NULL,
  status            teacher_attendance_status NOT NULL DEFAULT 'present',
  check_in_at       TIMESTAMPTZ,
  check_out_at      TIMESTAMPTZ,
  remarks           TEXT,
  marked_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (teacher_id, date)
);

CREATE INDEX idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance(date);
