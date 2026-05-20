# Academics Domain

## ENUMs

```sql
CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
```

## Tables

### academic_years
```sql
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
```

### classes
A "class" is a grade level (e.g. Grade 1, Grade 10).
```sql
CREATE TABLE classes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,         -- e.g. 'Grade 10', 'Class 5'
  grade_number      SMALLINT NOT NULL CHECK (grade_number BETWEEN 1 AND 13),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, grade_number)
);

CREATE INDEX idx_classes_institution ON classes(institution_id);
```

### sections
A section is a division within a class (e.g. 10-A, 10-B).
```sql
CREATE TABLE sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name              VARCHAR(10) NOT NULL,  -- e.g. 'A', 'B', 'Rose'
  capacity          SMALLINT CHECK (capacity > 0),
  class_teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (class_id, academic_year_id, name)
);

CREATE INDEX idx_sections_class_id ON sections(class_id);
CREATE INDEX idx_sections_academic_year ON sections(academic_year_id);
```

### subjects
```sql
CREATE TABLE subjects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  code              VARCHAR(20),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (institution_id, code)
);

CREATE INDEX idx_subjects_institution ON subjects(institution_id);
```

### class_subjects
Which subjects are taught in which class for an academic year.
```sql
CREATE TABLE class_subjects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  subject_id        UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  teacher_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  max_marks         NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (section_id, subject_id, academic_year_id)
);

CREATE INDEX idx_class_subjects_section ON class_subjects(section_id);
CREATE INDEX idx_class_subjects_teacher ON class_subjects(teacher_id);
```

### timetable
```sql
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
```

## Relationships
- `classes` → `institutions`
- `sections` → `classes` + `academic_years`
- `class_subjects` links `sections`, `subjects`, `teachers`, `academic_years`
- `timetable` → `sections` + `class_subjects`
