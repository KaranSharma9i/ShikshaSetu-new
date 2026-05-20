# Homework & AI Scoring Domain

## Key Rule
- `score` = AI homework score (out of 10). NEVER use `marks` here.
- `marks` belongs only in the exams domain.

## ENUMs

```sql
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'scored', 'late_submitted');
```

## Tables

### homework_assignments
Created by teachers. Subject, chapter, and difficulty are teacher-selected.
```sql
CREATE TABLE homework_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id  UUID NOT NULL REFERENCES class_subjects(id) ON DELETE RESTRICT,
  section_id        UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  created_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- teacher
  title             TEXT NOT NULL,
  chapter           TEXT NOT NULL,          -- teacher-specified chapter
  difficulty        difficulty_level NOT NULL,
  instructions      TEXT,
  ai_prompt         TEXT,                   -- prompt sent to AI to generate the homework
  due_date          DATE NOT NULL,
  max_score         NUMERIC(4,2) NOT NULL DEFAULT 10 CHECK (max_score > 0),
  is_ai_generated   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_hw_assignments_section ON homework_assignments(section_id);
CREATE INDEX idx_hw_assignments_subject ON homework_assignments(class_subject_id);
CREATE INDEX idx_hw_assignments_due ON homework_assignments(due_date);
CREATE INDEX idx_hw_assignments_created_by ON homework_assignments(created_by);
```

### homework_submissions
Student submissions. AI scores them with a single overall score (out of 10).
```sql
CREATE TABLE homework_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE RESTRICT,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id    UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  status              submission_status NOT NULL DEFAULT 'pending',
  submitted_at        TIMESTAMPTZ,
  attachment_urls     TEXT[],               -- uploaded files (images, PDFs, docs)
  response_text       TEXT,                 -- optional typed response
  ai_score            NUMERIC(4,2) CHECK (ai_score BETWEEN 0 AND 10),   -- score out of 10
  ai_feedback         TEXT,                 -- AI-generated feedback for the student
  ai_suggestions      TEXT,                 -- AI suggestions to improve performance
  scored_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_hw_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX idx_hw_submissions_student ON homework_submissions(student_id);
CREATE INDEX idx_hw_submissions_status ON homework_submissions(status);
CREATE INDEX idx_hw_submissions_academic_year ON homework_submissions(academic_year_id);
```

## Relationships
- `homework_assignments` → `class_subjects`, `sections`, `academic_years`, `users` (teacher)
- `homework_submissions` → `homework_assignments`, `students`, `academic_years`
- AI score is stored directly on `homework_submissions.ai_score` — no separate score table needed.
