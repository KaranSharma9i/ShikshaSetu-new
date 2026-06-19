# Batch 13 — Results: Entry + Consolidated View (Split into 5 Sessions)

> Source of truth for this feature. Read alongside `AGENTS.md` and `MARGAM_WEB_PORTAL_PLAN.md`.
> Replaces the single "Batch 13" line in the roadmap with five sub-batches: **13.0 → 13.4**.
> Do not skip ahead — each session assumes the previous one is merged and working.

---

## Carried-over rules for every session below (paste these with every prompt)

- This is the **margam-web** Next.js project (App Router + TS + Tailwind), same Supabase project as the mobile app.
- Every query must be scoped by `institution_id`, following the existing pattern in `src/lib/repositories/*.ts`. **`exam_results` has no `institution_id` column of its own** — scope it through `exam_results.exam_id → exams.institution_id`. Do not assume a direct column exists.
- RLS is OFF during active development — do not add RLS policies.
- Migrations are additive only: `ALTER TABLE` / `CREATE TABLE` are fine. **Never `DROP`, never `TRUNCATE`, never delete existing rows.** If a migration step looks like it would do either, stop and ask before running it.
- Show the exact migration SQL and wait for explicit approval before applying it to the database.
- **Puppeteer (or Playwright) is pre-approved** as a new dependency for PDF rendering — no need to ask again for that specific library. Do not install any *other* new npm packages without asking first.
- Never mix up `marks` (manual exam score, `exam_results.marks_obtained`) with `score` (AI homework score) — not directly relevant here, but keep the terms distinct in code/comments.
- Work in small steps within the session itself — plan, then implement, do not do everything in one shot.
- Number new migration files starting from the actual next number after the current latest in `supabase/migrations/` — confirm the real latest file before naming anything.
- Propose a clean, modern layout consistent with the existing admin list/table screens — no need to ask about visual design again for screens (not PDFs), just stay consistent with what's already built.

---

## Decisions Already Made (Do Not Re-Litigate)

| Decision | Answer |
|---|---|
| Mobile teacher entry vs. web admin entry | Both write to the same `exam_results` table. Conflicts are resolved via lock/finalize, not optimistic locking, not audit-only logging |
| Lock granularity | Per individual `exams` row (one class+subject+exam_date), **not** per section, **not** per whole term |
| Lock enforcement mechanism | Database trigger on `exam_results` checking the parent `exams.is_locked` — works regardless of which app (mobile or web) writes, no app-side duplication needed |
| Rank basis | Core (non-elective) subjects only, for fairness across students with different electives |
| Pass/Fail rule | **Aggregate only**: `sum(marks_obtained, core subjects) >= sum(passing_marks, core subjects)`. No individual-subject-fails-the-student rule |
| Grading scale | Fixed % bands (table below), hardcoded default for now, configurable later |
| Subject-level `grade` computation | From the fixed % bands of `marks_obtained / exams.total_marks`, **independent of** that exam's own `passing_marks`. `passing_marks` is used only as a visual "below pass mark" flag in the entry grid and in the aggregate Pass/Fail calc — not for the letter grade itself |
| Term grouping | New `exam_terms` table + `exam_term_id` FK added to `exams`. The old approach of matching free-text `exam_name` was too fragile (typos silently split a term into two) |
| Legacy exam rows | Left with `exam_term_id = NULL` — no automatic backfill by text-matching. A one-time admin utility screen lets staff manually assign old exams to a term |
| Electives in reports | Core subjects shown as one fixed block. Electives shown in a separate block — only the subject(s) that specific student actually selected via `student_electives` |
| PDF outputs | **Two separate documents**: (1) per-student Report Card with full subject detail, (2) class/section-wide Summary Sheet with only uniform aggregate columns (no per-subject columns, so electives don't make it ragged) |
| PDF technology | Puppeteer/Playwright — render an HTML+Tailwind template server-side to PDF, for the best visual fidelity |

**Grading scale:**

| % Range | Grade |
|---|---|
| 90–100 | A+ |
| 80–89 | A |
| 70–79 | B+ |
| 60–69 | B |
| 50–59 | C+ |
| 40–49 | C |
| 33–39 | D (Pass) |
| Below 33 | F (Fail) |

---

## Reference: Current Schema (confirmed live)

```sql
create table public.exams (
  id uuid not null default gen_random_uuid (),
  institution_id uuid not null,
  academic_year_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  exam_name text not null,
  exam_type text null,
  exam_date date not null,
  start_time time without time zone null,
  end_time time without time zone null,
  total_marks numeric(6, 2) null default 100,
  passing_marks numeric(6, 2) null default 40,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone null,
  syllabus_file_url text null,
  venue text null,
  constraint exams_pkey primary key (id),
  constraint exams_institution_id_academic_year_id_class_id_subject_id_e_key unique (
    institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date
  ),
  constraint exams_academic_year_id_fkey foreign KEY (academic_year_id) references academic_years (id) on delete RESTRICT,
  constraint exams_class_id_fkey foreign KEY (class_id) references classes (id) on delete RESTRICT,
  constraint exams_institution_id_fkey foreign KEY (institution_id) references institutions (id) on delete RESTRICT,
  constraint exams_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete RESTRICT
);

create table public.exam_results (
  id uuid not null default gen_random_uuid (),
  exam_id uuid not null,
  student_id uuid not null,
  marks_obtained numeric(6, 2) null,
  grade text null,
  remarks text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone null,
  constraint exam_results_pkey primary key (id),
  constraint exam_results_exam_id_student_id_key unique (exam_id, student_id),
  constraint exam_results_exam_id_fkey foreign KEY (exam_id) references exams (id) on delete CASCADE,
  constraint exam_results_student_id_fkey foreign KEY (student_id) references students (id) on delete RESTRICT
);
```

Note: an exam row already groups one subject for one whole class (not per-section). The same `exam_name` can repeat across multiple `subject_id` rows for the same class — that's how a "term" spanning several subjects is represented today (loosely, by text match — which Batch 13.0 fixes).

---

## 13.0 — Schema Migration: Exam Terms + Locking (no UI)

**Goal:** Add the structures this whole feature depends on — proper term grouping and exam-row locking enforced at the database level. Pure migration + one small utility screen, verified before any entry/report screens touch it.

**Prompt:**

> Create a new migration file (next number after the current latest in `supabase/migrations/`) with the following, additive only:
>
> ```sql
> -- groups multiple subject-exams into one named term per class/year
> CREATE TABLE public.exam_terms (
>   id uuid NOT NULL DEFAULT gen_random_uuid(),
>   institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
>   academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
>   class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
>   name text NOT NULL,
>   term_type text NULL,
>   starts_on date NULL,
>   ends_on date NULL,
>   created_at timestamptz NOT NULL DEFAULT now(),
>   updated_at timestamptz NOT NULL DEFAULT now(),
>   PRIMARY KEY (id),
>   CONSTRAINT exam_terms_unique UNIQUE (institution_id, academic_year_id, class_id, name)
> );
>
> -- link each subject-exam to its term (nullable so existing rows are untouched)
> ALTER TABLE public.exams
>   ADD COLUMN exam_term_id uuid NULL REFERENCES exam_terms(id) ON DELETE SET NULL;
>
> -- row-level lock/finalize
> ALTER TABLE public.exams
>   ADD COLUMN is_locked boolean NOT NULL DEFAULT false,
>   ADD COLUMN locked_at timestamptz NULL,
>   ADD COLUMN locked_by uuid NULL REFERENCES users(id) ON DELETE RESTRICT;
>
> -- DB-level enforcement: blocks writes to exam_results when the parent exam is locked,
> -- regardless of whether mobile or web is doing the writing
> CREATE OR REPLACE FUNCTION public.check_exam_not_locked()
> RETURNS TRIGGER AS $$
> DECLARE
>   v_locked boolean;
> BEGIN
>   SELECT is_locked INTO v_locked FROM public.exams WHERE id = NEW.exam_id;
>   IF v_locked THEN
>     RAISE EXCEPTION 'Cannot modify exam_results: exam % is locked', NEW.exam_id;
>   END IF;
>   RETURN NEW;
> END;
> $$ LANGUAGE plpgsql;
>
> CREATE TRIGGER trg_exam_results_lock_check
>   BEFORE INSERT OR UPDATE ON public.exam_results
>   FOR EACH ROW EXECUTE FUNCTION public.check_exam_not_locked();
> ```
>
> Show me this exact SQL before applying it.
>
> Existing `exams` rows must keep `exam_term_id = NULL` — do **not** attempt to auto-backfill by matching `exam_name` text. That fragile matching is exactly what we're moving away from.
>
> After the migration, build one small admin utility screen: "Assign legacy exams to a term." List distinct `(academic_year_id, class_id, exam_name)` combinations among exams where `exam_term_id IS NULL`. For each, let the admin either pick an existing `exam_terms` row or create a new one, then assign it to all matching `exams` rows. Show a preview ("This will assign N exam rows to term 'X'") before committing.
>
> After applying the migration, verify: row counts on `exams` and `exam_results` are unchanged; the new trigger actually rejects an update when you manually set `is_locked = true` on a test exam and try to modify its `exam_results`. Do not build any marks-entry or report UI in this session.

---

## 13.1 — Subject-wise Marks Entry (Web)

**Goal:** The entry screen institution staff use to key in marks for one subject's exam, respecting the lock state and computing the subject-level grade.

**Prompt:**

> Build a "Marks Entry" screen for institution admins in margam-web, scoped by `institution_id` end-to-end.
>
> Flow:
> 1. Selectors: Academic Year → Class → Term (`exam_term_id`; include an "Ungrouped (legacy)" option for exams still at NULL) → Subject → the specific exam row (an exam_name + exam_date combination — there can be more than one exam per subject/term, so be explicit about which one is selected).
> 2. If the selected exam's `is_locked = true`: render the whole grid read-only with a banner showing who locked it and when, plus an "Unlock" action (confirm before unlocking) that clears `is_locked` / `locked_at` / `locked_by`.
> 3. If unlocked: load every student with an active enrollment in that class for that academic year (across all sections — `exams` is class-wide, not section-wide). Show their section as a column and allow sorting/filtering by it for usability, but don't restrict the underlying list to one section.
> 4. Grid columns: Student Name, Roll No, Section, Marks Obtained (editable numeric input, max-validated against `exams.total_marks`), computed %, computed Grade. Pre-fill from any existing `exam_results` row for that `(exam_id, student_id)` pair.
> 5. Visually flag (e.g. amber/red row highlight) any entered mark below `exams.passing_marks` — informational only at this level, does not block saving.
> 6. On save, upsert into `exam_results` on the `(exam_id, student_id)` unique constraint. Compute `grade` from the fixed % band table using `marks_obtained / exams.total_marks` — independent of `passing_marks`. Confirm with me before changing this rule if you think subject-level grading should work differently.
> 7. The DB trigger from 13.0 will reject writes to a locked exam — catch that specific error in the UI and show a clean "This exam is locked" message rather than a raw Postgres error.
> 8. Show me the plan (screens + repository functions, and how you're scoping every query through `exam_id → exams.institution_id`) before writing code.

---

## 13.2 — Individual Report Card PDF

**Goal:** The polished, "modern, best-quality" per-student document — this is where full subject + elective detail lives.

**Prompt:**

> Build "Generate Report Card" for institution admins in margam-web — a per-student PDF, rendered via Puppeteer from an HTML+Tailwind template.
>
> Flow:
> 1. Selectors: Academic Year → Class → Term → Section → Student. Also support "generate for the whole section" — before building that batch path, tell me whether you'd produce one PDF per student (zip/download list) or one combined multi-page PDF, and let's confirm before you build it.
> 2. Data for the chosen student:
>    - Their active enrollment for that academic year → `section_id`, `class_id`.
>    - Core subjects: `class_subjects` where `section_id` = their section, `academic_year_id` matches, `is_elective = false`.
>    - Their electives: `student_electives` for that student + academic year, joined to `class_subjects` for subject details.
>    - For each subject (core + their selected electives), find the matching `exams` row (`class_id`, `subject_id`, `academic_year_id`, `exam_term_id`) and the `exam_results` row for marks/grade. If no exam exists yet for that subject under this term, or no result has been entered, show "—" / "Pending" — never treat missing as zero.
> 3. Aggregate (core subjects only): Total Obtained, Total Max, Percentage, Overall Grade (fixed band table), Pass/Fail (`sum(marks_obtained core) >= sum(passing_marks core)`).
> 4. Rank within the section: order all students by core total, descending, standard competition ranking (ties share a rank; the next distinct score skips ahead accordingly). If any student in the section is missing a core-subject result, show "Rank pending" instead of computing a misleading number.
> 5. Template must follow `AGENTS.md` theming rules exactly: institution logo/colors/name/tagline from the `theme` JSONB with `??` fallbacks, no hardcoded brand colors, Poppins/Inter/Open Sans loaded the same way as the rest of the app.
> 6. Suggested layout (confirm/adjust with me before building): header with branding + student photo/name/roll/class-section; a clean core-subjects table; a visually distinct "Electives" block below it; a footer band with Total / Percentage / Grade / Rank / Pass-Fail prominently displayed; space for remarks and signature lines.
> 7. Show me the plan — exact layout sections, the rendering approach, and the batch-generation decision from step 1 — before writing code.

---

## 13.3 — Class/Section Summary Sheet PDF

**Goal:** The administrator's at-a-glance, printable roster for a whole section — deliberately kept to uniform columns only, so differing electives don't make it ragged.

**Prompt:**

> Build "Class Result Summary" for institution admins in margam-web — one PDF, all students in a section, uniform columns.
>
> Flow:
> 1. Selectors: Academic Year → Class → Term → Section.
> 2. One table: Roll No | Student Name | Total (core) | Max Total (core) | Percentage | Grade | Rank | Pass/Fail. No per-subject columns — full subject-level detail lives in the 13.2 report card, not here.
> 3. Default sort by Rank; allow re-sort by name or roll no.
> 4. Same missing-data handling as 13.2: flag any row with incomplete core-subject results rather than guessing, and show a banner if rank can't be finalized for the whole section yet.
> 5. Reuse the theming + Puppeteer rendering approach from 13.2. Check whether a shared PDF-template helper is worth factoring out once you see how 13.2 turned out, rather than duplicating render logic — your call, just flag it.
> 6. Show me the plan before writing code.

---

## 13.4 — Lock/Unlock Management Dashboard

**Goal:** Oversight screen, since locking now happens at the individual exam-row level rather than per term or section.

**Prompt:**

> Build a "Manage Exam Locks" screen for institution admins in margam-web.
>
> Flow:
> 1. Selectors: Academic Year → Class → Term (or an "all exams" view). List every matching `exams` row: subject, exam_name, exam_date, lock status, `locked_by`/`locked_at` if locked, and a count of entered vs. enrolled (`exam_results` rows vs. active enrollments for that class).
> 2. Bulk-select rows → Lock or Unlock in one action, with a confirmation step listing exactly which exams will change state.
> 3. Locking stays granular at the exam-row level in storage — this screen's bulk action is a UI convenience for selecting many rows at once, not a new grouping mechanism.
> 4. Each lock/unlock updates `locked_by`/`locked_at` (set on lock, cleared on unlock) — columns already exist from 13.0, no schema changes needed here.
> 5. Show me the plan before writing code.

---

## Roadmap table update

Replace the single "13 | Results: Entry + Consolidated View" row in `MARGAM_WEB_PORTAL_PLAN.md` with:

| # | Batch | Status |
|---|---|---|
| 13.0 | Results — Schema Migration: Exam Terms + Locking | [ ] Not started |
| 13.1 | Results — Subject-wise Marks Entry | [ ] Not started |
| 13.2 | Results — Individual Report Card PDF | [ ] Not started |
| 13.3 | Results — Class/Section Summary Sheet PDF | [ ] Not started |
| 13.4 | Results — Lock/Unlock Management Dashboard | [ ] Not started |

Batches 14/15 (Permissions/Pre-Pilot) remain numbered as-is, following after 13.4.
