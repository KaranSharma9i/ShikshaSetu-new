# Students Domain

## ENUMs

```sql
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
```

## Tables

### students
```sql
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
```

### enrollments
Links a student to a section for a given academic year.
```sql
CREATE TABLE enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  roll_number       VARCHAR(20),
  enrolled_on       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (student_id, academic_year_id)   -- one active enrollment per year
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_academic_year ON enrollments(academic_year_id);
```

### student_attendance
Daily attendance per student per subject.
```sql
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
```

### leaves
Student leave requests.
```sql
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
```

### holidays
School-wide holidays and non-working days.
```sql
CREATE TABLE holidays (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  date              DATE NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, date)
);

CREATE INDEX idx_holidays_institution ON holidays(institution_id);
CREATE INDEX idx_holidays_date ON holidays(date);
```

## Relationships
- `students` → `users` (1:1), `institutions`
- `enrollments` → `students`, `sections`, `academic_years`
- `student_attendance` → `students`, `class_subjects`, `academic_years`
- `leaves` → `students`, `academic_years`
- `holidays` → `institutions`, `academic_years`
