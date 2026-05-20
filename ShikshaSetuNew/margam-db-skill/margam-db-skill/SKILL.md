---
name: margam-db
description: >
  Design and generate PostgreSQL database schemas, migrations, table definitions,
  and constraints for the Margam school ERP platform. Use this skill whenever the
  user asks to create, modify, extend, or review any database table, schema, ERD,
  migration, or data model related to Margam — including institutions, students,
  teachers, academics, homework, AI scoring, fees, transport, circulars, marketing,
  attendance, exams, or report cards. Also trigger when the user says things like
  "add a table for X", "how should I store Y", "design the DB for Z", or "what
  columns does the X table need?" in the context of Margam.
---

# Margam DB Skill

You are designing the PostgreSQL database for **Margam** — a professional school ERP platform.
Tagline: *Digital Backbone of Institutions.*

Always read this file fully before writing any SQL or schema. For detailed column
definitions per domain, refer to the reference files listed at the bottom.

---

## Project Constraints

- **One campus per institution** — no branch/multi-campus support needed.
- **Multi-year historical data** — all records are scoped to an `academic_year` (e.g. `'2024-25'`).
- **Three user roles**: Institution admin, Teacher, Student.
- **AI homework**: Single overall AI score per submission (out of 10). Not per question.
- **Marks vs Score**: `marks` = actual exam score. `score` = AI homework score. Never mix these terms.
- **Transport**: Store vehicle details, driver info, routes, and student-route assignments.
- **Fee**: Full fee structure + payment history per student.
- **Circulars**: Rich-text body (HTML/markdown) + file attachments stored as URLs/paths.
- **Marketing**: Fully inside Margam DB (campaigns, leads, enrollment conversions).

---

## Naming Conventions

| Rule | Example |
|------|---------|
| Table names: `snake_case`, plural | `students`, `exam_results` |
| Column names: `snake_case` | `created_at`, `academic_year` |
| Primary keys: `id UUID DEFAULT gen_random_uuid()` | always UUID, never serial |
| Foreign keys: `<table_singular>_id` | `student_id`, `teacher_id` |
| Timestamps: always include | `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()` |
| Soft deletes: use `deleted_at` | `deleted_at TIMESTAMPTZ DEFAULT NULL` |
| Enums: define as PostgreSQL ENUM types | `CREATE TYPE role_type AS ENUM (...)` |

---

## Global Rules

1. **Every table must have**: `id`, `created_at`, `updated_at`, `deleted_at`.
2. **Use UUIDs** for all primary keys — never `SERIAL` or `BIGSERIAL`.
3. **Foreign keys must have** `ON DELETE` behavior explicitly set (prefer `RESTRICT` unless cascade is clearly correct).
4. **Use CHECK constraints** for value ranges (e.g. marks cannot be negative).
5. **Index foreign keys** and any column used in frequent WHERE/JOIN clauses.
6. **Use ENUM types** for fixed-value columns (status fields, role types, etc.).
7. **academic_year column** (VARCHAR(7), e.g. `'2024-25'`) must appear in all records that are year-scoped.
8. **Never store passwords in plain text** — always hashed (note this in comments).
9. **Monetary values**: store as `NUMERIC(12,2)`, never FLOAT.
10. **Attachments**: store as `TEXT[]` of URLs or file paths — never binary blobs in DB.

---

## Domain Map

The Margam DB is split into these domains. Each has a reference file:

| Domain | Reference File | Key Tables |
|--------|---------------|------------|
| Core / Auth | `references/core.md` | `institutions`, `users`, `roles`, `sessions` |
| Academics | `references/academics.md` | `classes`, `sections`, `subjects`, `timetable` |
| Students | `references/students.md` | `students`, `enrollments`, `attendance`, `leaves` |
| Teachers | `references/teachers.md` | `teachers`, `teacher_subjects`, `teacher_attendance` |
| Exams & Results | `references/exams.md` | `exams`, `exam_results`, `report_cards` |
| Homework & AI | `references/homework.md` | `homework_assignments`, `homework_submissions` |
| Fees | `references/fees.md` | `fee_structures`, `fee_installments`, `fee_payments` |
| Circulars | `references/circulars.md` | `circulars`, `circular_attachments`, `circular_recipients` |
| Transport | `references/transport.md` | `vehicles`, `drivers`, `routes`, `student_transport` |
| Marketing | `references/marketing.md` | `campaigns`, `leads`, `enrollments_pipeline` |

---

## Workflow — How to Respond to DB Requests

### When asked to design a new table:
1. Identify the domain → read the relevant reference file.
2. Check if the table already exists in the reference — extend rather than duplicate.
3. Write the full `CREATE TABLE` SQL with all constraints.
4. Add indexes below the table definition.
5. If new ENUMs are needed, define them before the table.
6. End with a short note on relationships to other tables.

### When asked to modify an existing table:
1. Write an `ALTER TABLE` migration — never rewrite from scratch.
2. Note any data migration steps if column type changes.

### When asked for an ERD or overview:
1. Summarize all tables in the relevant domain(s).
2. Show relationships as a bullet list (or Mermaid ERD if asked).

### When unsure about a design decision:
- Ask the user before assuming. Reference the critical points from the project overview.

---

## Reference Files

Read the relevant file(s) before writing any schema for that domain:

- `references/core.md` — institutions, users, auth
- `references/academics.md` — classes, sections, subjects, timetable
- `references/students.md` — students, attendance, leaves
- `references/teachers.md` — teachers, assignments, attendance
- `references/exams.md` — exams, results, report cards
- `references/homework.md` — homework, AI scoring
- `references/fees.md` — fee structures, payments
- `references/circulars.md` — circulars, attachments
- `references/transport.md` — vehicles, drivers, routes
- `references/marketing.md` — campaigns, leads
