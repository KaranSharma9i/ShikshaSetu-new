# Exams & Results Domain

## ENUMs

```sql
CREATE TYPE exam_type AS ENUM ('unit_test', 'midterm', 'final', 'mock', 'internal', 'other');
CREATE TYPE exam_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
```

## Tables

### exams
```sql
CREATE TABLE exams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,               -- e.g. 'Unit Test 1', 'Half Yearly'
  exam_type         exam_type NOT NULL,
  starts_on         DATE NOT NULL,
  ends_on           DATE NOT NULL,
  status            exam_status NOT NULL DEFAULT 'scheduled',
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  CHECK (ends_on >= starts_on)
);

CREATE INDEX idx_exams_institution ON exams(institution_id);
CREATE INDEX idx_exams_academic_year ON exams(academic_year_id);
CREATE INDEX idx_exams_status ON exams(status);
```

### exam_schedules
Individual subject-level schedule within an exam event.
```sql
CREATE TABLE exam_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_subject_id  UUID NOT NULL REFERENCES class_subjects(id) ON DELETE RESTRICT,
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  exam_date         DATE NOT NULL,
  starts_at         TIME NOT NULL,
  ends_at           TIME NOT NULL,
  room              TEXT,
  max_marks         NUMERIC(6,2) NOT NULL CHECK (max_marks > 0),
  passing_marks     NUMERIC(6,2) CHECK (passing_marks >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (exam_id, class_subject_id, section_id),
  CHECK (ends_at > starts_at),
  CHECK (passing_marks <= max_marks)
);

CREATE INDEX idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX idx_exam_schedules_section ON exam_schedules(section_id);
CREATE INDEX idx_exam_schedules_date ON exam_schedules(exam_date);
```

### exam_results
Actual marks scored by each student in each exam subject.
NOTE: `marks` = actual exam score. Never use `score` here — that is for AI homework.
```sql
CREATE TABLE exam_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id  UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  marks_obtained    NUMERIC(6,2) CHECK (marks_obtained >= 0),
  is_absent         BOOLEAN NOT NULL DEFAULT FALSE,
  remarks           TEXT,
  entered_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (exam_schedule_id, student_id)
);

CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_schedule ON exam_results(exam_schedule_id);
CREATE INDEX idx_exam_results_academic_year ON exam_results(academic_year_id);
```

### report_cards
Aggregated final report card per student per academic year.
```sql
CREATE TABLE report_cards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id      UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  section_id            UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  total_marks_obtained  NUMERIC(8,2) CHECK (total_marks_obtained >= 0),
  total_max_marks       NUMERIC(8,2) CHECK (total_max_marks > 0),
  percentage            NUMERIC(5,2) GENERATED ALWAYS AS
                          (CASE WHEN total_max_marks > 0
                           THEN ROUND((total_marks_obtained / total_max_marks) * 100, 2)
                           ELSE NULL END) STORED,
  grade                 VARCHAR(5),
  rank_in_section       SMALLINT CHECK (rank_in_section > 0),
  attendance_percentage NUMERIC(5,2) CHECK (attendance_percentage BETWEEN 0 AND 100),
  remarks               TEXT,
  generated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (student_id, academic_year_id)
);

CREATE INDEX idx_report_cards_student ON report_cards(student_id);
CREATE INDEX idx_report_cards_section ON report_cards(section_id);
CREATE INDEX idx_report_cards_academic_year ON report_cards(academic_year_id);
```

## Relationships
- `exams` → `institutions`, `academic_years`
- `exam_schedules` → `exams`, `class_subjects`, `sections`
- `exam_results` → `exam_schedules`, `students`, `academic_years`
- `report_cards` → `students`, `sections`, `academic_years`
