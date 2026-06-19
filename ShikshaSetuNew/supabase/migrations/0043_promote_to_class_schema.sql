-- Migration: 0043_promote_to_class_schema.sql
-- Additive only migrations for student promotion, section moves, and electives.

BEGIN;

-- 1. Lifecycle status on students
ALTER TABLE public.students
  ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'WITHDRAWN', 'GRADUATED'));

-- 2. Elective flag on class_subjects
ALTER TABLE public.class_subjects
  ADD COLUMN is_elective boolean NOT NULL DEFAULT false;

-- 3. Per-student elective selections (multi-select)
CREATE TABLE public.student_electives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  class_subject_id uuid NOT NULL REFERENCES public.class_subjects(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT student_electives_unique UNIQUE (student_id, class_subject_id)
);

-- 4. Audit trail: one row per bulk promotion action
CREATE TABLE public.promotion_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  from_academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  to_academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  performed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  performed_at timestamptz NOT NULL DEFAULT now(),
  is_undone boolean NOT NULL DEFAULT false,
  undone_at timestamptz NULL,
  undone_by uuid NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  PRIMARY KEY (id)
);

-- 5. Audit trail: one row per student within that batch
CREATE TABLE public.promotion_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promotion_batch_id uuid NOT NULL REFERENCES public.promotion_batches(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  outcome text NOT NULL CHECK (outcome IN ('PROMOTED', 'RETAINED', 'WITHDRAWN', 'GRADUATED')),
  old_enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  new_enrollment_id uuid NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

COMMIT;
