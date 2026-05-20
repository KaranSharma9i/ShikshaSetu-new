# Teachers Domain

## ENUMs

```sql
CREATE TYPE teacher_attendance_status AS ENUM ('present', 'absent', 'late', 'on_leave');
```

## Tables

### teachers
```sql
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
```

### teacher_attendance
Daily attendance for teaching staff.
```sql
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
```

### teacher_performance
Aggregated performance metrics per teacher per academic year (used in Power BI dashboard).
```sql
CREATE TABLE teacher_performance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  academic_year_id      UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  avg_student_marks     NUMERIC(5,2),        -- average marks of students in their subjects
  homework_assigned     INTEGER DEFAULT 0,
  homework_scored       INTEGER DEFAULT 0,   -- how many submissions were AI-scored
  attendance_rate       NUMERIC(5,2),        -- teacher's own attendance %
  classes_taken         INTEGER DEFAULT 0,
  classes_scheduled     INTEGER DEFAULT 0,
  notes                 TEXT,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (teacher_id, academic_year_id)
);

CREATE INDEX idx_teacher_performance_teacher ON teacher_performance(teacher_id);
CREATE INDEX idx_teacher_performance_year ON teacher_performance(academic_year_id);
```

## Relationships
- `teachers` → `users` (1:1), `institutions`
- `teacher_attendance` → `teachers`, `academic_years`
- `teacher_performance` → `teachers`, `academic_years`
- Teachers are linked to subjects via `class_subjects.teacher_id` (see academics domain)
