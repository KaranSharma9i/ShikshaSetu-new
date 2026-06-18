# Margam Institution Web Portal — Batch Plan
> Resume from here. Do not start from scratch. This file is the source of truth for what's been built and what's next on the **web portal** project.

---

## What This File Is

Margam's mobile app (`ShikshaSetuNew/`) has Student, Teacher, and Institution portals — but **no web login exists today**. This file plans a new, separate **Next.js web app** where institution admins log in on desktop to do back-office work (admissions, ID cards, admit cards, promotions, results, attendance, fees, circulars) that the mobile Institution Portal doesn't fully cover.

This is a **companion document** to `MARGAM_TENANT_CONTEXT.md` (mobile app multi-tenancy) and `AGENTS.md` (mobile app dev rules). Read all three before starting work on the web portal.

---

## Decisions Already Made (Do Not Re-Litigate)

| Decision | Answer |
|---|---|
| Who uses this site | Institution admins/staff only (not students, not teachers, not a Margam super-admin — for now) |
| Tech stack | **Next.js (App Router) + TypeScript + Tailwind CSS** |
| Backend | **Same Supabase project** as the mobile app — no new project, no new auth system |
| Codebase location | **New sibling folder**, e.g. `ShikshaSetu/margam-web/` — NOT inside `ShikshaSetuNew/app/` (Expo Router and Next.js both use `app/` with conflicting conventions) |
| Auth | Supabase Auth (`@supabase/ssr` for Next.js), same `auth.users` table. Institution admins may reuse mobile credentials or get separate web-only accounts — decide in Batch 1 |
| Tenant isolation | **RLS is intentionally OFF** during active development (per `AGENTS.md`). Isolation is enforced in a **server-side repository layer** (Server Actions / Route Handlers) that filters every query by `institution_id`, mirroring the pattern in `ShikshaSetuNew/src/repositories/*.ts`. Service-role key (if ever used) stays server-only, never shipped to the browser |
| New feature data (ID cards, admit cards, promote-to-class, consolidated marks) | New tables via new migration files, numbered onward from the existing `supabase/migrations/` sequence. **ALTER/CREATE only — never DROP**, same rule as the mobile app |
| Work style | Small batches (~10–15 total), one Claude Code / Antigravity session per batch, plan shown before changes are made |

---

## Inspiration Reference

Screenshots reviewed are from ERPs Online's "Demo SSMS School" product — used as **UX/flow inspiration only**, not a literal spec to clone. Modules referenced: Admission (add/list/search), Student Profile (fee due/paid), ID Cards (design picker + print), Admit Cards (datesheet), Promote to Class, Result Update (subject-wise marks entry), Consolidated Marks List, Staff Attendance Report.

---

## Batch Roadmap

> Each batch = one focused Claude Code / Antigravity session. Batches assume the previous batch is merged and working before starting the next. Numbers are a planning estimate — we may split or merge as we go.

### Foundation (must happen first, in order)

**Batch 1 — Project Scaffold + Auth**
- Create `margam-web/` Next.js (App Router, TS, Tailwind) project alongside `ShikshaSetuNew/`
- Connect to existing Supabase project (env vars, `@supabase/ssr` client setup — server + browser clients)
- Build login page for institution admins (Supabase Auth)
- Decide: reuse mobile admin accounts vs. separate web accounts
- Confirm real current migration number in `supabase/migrations/` (this plan assumes new ones start after whatever's latest)
- Basic authenticated shell: header, sidebar nav placeholder, logout

**Batch 2 — Institution Theming on Web**
- Reuse the same `institutions.theme` JSONB (colors, fonts) the mobile app already has
- Server-side fetch of institution theme/logo/name on login, pass down via React context
- Wire Tailwind CSS variables so `bg-primary`, `text-secondary` etc. work, with hardcoded fallbacks (same discipline as mobile)
- Load Poppins/Inter/Open Sans via `next/font` (web equivalent of `expo-google-fonts`)

**Batch 3 — Server-Side Repository Layer + Dashboard**
- Build `lib/repositories/` mirroring mobile's repository pattern, every function scoped by `institution_id`
- Institution dashboard: key counts (students, teachers, fees today, attendance %) — read-only, pulls from existing tables
- Confirm the `institution_id`-scoping pattern works end-to-end before building more screens on top of it

### Core Admin Modules (mobile feature parity on desktop)

**Batch 4 — Student Management (List + Profile)**
- Students list with filters (class, section, status) — uses existing `students`/`enrollments` tables
- Student profile view (read)

**Batch 5 — Student Management (Add/Edit + Admissions)**
- New admission form
- Edit existing student
- Admission stats report (class-wise counts)

**Batch 6 — Teacher Management**
- Teacher list + profile (read)
- Add/edit teacher

**Batch 7 — Fees**
- Fee due/paid view per student (reuse existing `fees` table)
- Fee collection dashboard view
- Record a payment

**Batch 8 — Circulars**
- Circular generator (create/broadcast)
- Circular list/history

**Batch 9 — Attendance**
- Student attendance view/report
- Staff attendance view/report

### New Modules (not in mobile app yet — need new schema)

**Batch 10 — ID Cards (new feature)**
- New migration: ID card template/design data if needed
- Student ID card generation (select class/section → preview → print/PDF)
- Staff ID card generation

**Batch 11 — Admit Cards (new feature)**
- New migration if needed (exam datesheet linkage)
- Generate admit card per student (datesheet + student info)

**Batch 12 — Promote to Class (new feature)**
- Bulk promote students from one class/section to another, with current-session subject re-assignment option
- Uses existing `enrollments`/`academic_years` tables — confirm schema supports this before any new migration

**Batch 13 — Results: Entry + Consolidated View**
- Subject-wise marks entry (reuse existing `exams`/marks schema from mobile's AI scoring + teacher marks entry, if compatible)
- Consolidated marks list per class/section (printable)

### Polish

**Batch 14 — Permissions & Polish**
- Confirm 3 institution_admins-per-institution model from mobile carries over correctly (any admin vs. role-restricted actions)
- Loading states, error states, empty states across all modules built so far

**Batch 15 — Pre-Pilot Review**
- Full pass: verify every server query filters by `institution_id`
- Decide if/when RLS gets turned on (per `AGENTS.md`, this happens only before pilot/deployment, as a separate non-data migration)
- Cross-browser/responsive check

---

## Batch Tracking

| # | Batch | Status |
|---|---|---|
| 1 | Project Scaffold + Auth | [x] Completed |
| 2 | Institution Theming on Web | [x] Completed |
| 3 | Server-Side Repository Layer + Dashboard | [x] Completed |
| 4 | Student Management (List + Profile) | [x] Completed |
| 5 | Student Management (Add/Edit + Admissions) | [x] Completed |
| 6 | Teacher Management | [x] Completed |
| 7 | Fees | [x] Completed |
| 8 | Circulars | [x] Completed |
| 9 | Attendance | [ ] Not started |
| 10 | ID Cards (new) | [ ] Not started |
| 11 | Admit Cards (new) | [ ] Not started |
| 12 | Promote to Class (new) | [ ] Not started |
| 13 | Results: Entry + Consolidated View | [ ] Not started |
| 14 | Permissions & Polish | [ ] Not started |
| 15 | Pre-Pilot Review | [ ] Not started |

---

## Rules Carried Over From AGENTS.md (apply to web portal too)

- Never hardcode institution colors/logo/name — always from `theme` JSONB with fallbacks
- ALTER TABLE is safe; DROP TABLE is not — stop and ask if a migration unexpectedly drops anything
- Do NOT add RLS during active development — only before pilot/deployment
- Do not mix `marks` (manual exam score) and `score` (AI homework score, out of 10) — different fields
- Do not install new libraries without approval/discussion first
- Work in small batches, show a plan before making changes
- Do not hardcode institution names anywhere in the web portal either

---

## Open Questions To Resolve in Batch 1

- [x] Do web admin accounts reuse mobile `institution_admin` auth users, or are they separate? (Confirmed: They reuse the same mobile admin accounts in auth.users)
- [x] What is the actual current highest migration number in `supabase/migrations/` right now? (Confirmed: The actual highest migration is 38)
- [x] Repo structure: separate git repo for `margam-web/`, or monorepo alongside `ShikshaSetuNew/`? (Confirmed: Sibling directory inside the same Git repository)
