CREATE TABLE student_attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_subject_id  UUID NOT NULL REFERENCES class_subjects(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  date              DATE NOT NULL,
  status            attendance_status NOT NULL DEFAULT 'present',
  marked_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (student_id, class_subject_id, date)
);

CREATE INDEX idx_attendance_student ON student_attendance(student_id);
CREATE INDEX idx_attendance_date ON student_attendance(date);
CREATE INDEX idx_attendance_class_subject ON student_attendance(class_subject_id);
