# Margam ERP — AI Homework Generation: Session Context
> Last updated: June 2, 2026 — All 4 batches complete
> Use this file at the start of every new Claude Code session for the AI homework generation feature.

---

## 1. Project Overview

**Project name:** Margam ERP
**Tagline:** Digital Backbone of Institutions
**Repo folder:** `ShikshaSetuNew/`
**Stack:** React Native + Expo, Supabase (DB + Storage), Express (Node.js backend), Gemini AI

### Three user spaces:
- **Institution** — admin dashboard, circulars, fee management, add students/teachers
- **Teacher** — homework generation (AI), student performance, marks
- **Student** — homework submission, AI scoring, report cards, fee reminders

### Terminology (critical):
- `marks` = actual exam scores
- `score` = AI-evaluated homework score (out of 10)

---

## 2. AI Homework Generation Feature — What We Are Building

### The full flow:
```
Teacher fills create.tsx form
(Grade → Subject → Title → Topic Description → Question Config)
        ↓
Taps "Generate Questions →"
        ↓
[Batch A ✅] DB Migration — adds 5 columns to homework table
        ↓
[Batch B ✅] Express Server — POST /api/teacher/homework/generate
  → Calls Gemini (CBSE style) → generates questions JSON
  → pdfkit generates PDF → uploads to Supabase Storage
  → Inserts homework row with ai_generated = true
        ↓
[Batch C ✅] Preview + Edit Screen
  → app/(teacher)/teacher-homework/preview.tsx
  → Teacher edits questions inline
  → Taps "Publish" → saves to DB + updates generation_status
        ↓
[Batch D ✅] Wire create.tsx → server → preview.tsx
  → generateHomework() added to teacherRepository.ts
  → create.tsx calls server on button press with loading state
  → Navigates to preview.tsx with real API response as params
  → On publish: updates homework row status to 'published'
```

---

## 3. Key Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Backend location | `ShikshaSetuNew/server/` | No existing backend, built from scratch |
| AI model | `gemini-2.5-flash-lite` | Correct model string (NOT gemini-3.5-flash) |
| Curriculum style | CBSE | Indian school standard |
| Marking scheme | Not generated | Teacher doesn't need it |
| PDF library | pdfkit | Works naturally in Node.js |
| PDF storage | Supabase Storage bucket `homework-pdfs` | Persistent, accessible via public URL |
| PDF path | `{institution_id}/{class_id}/{homework_id}.pdf` | Multi-tenant scoping |
| Preview screen | Inline editable before publish | Teacher reviews and edits each question |
| Auth middleware | Built but NOT wired to routes yet | Wired in Batch D |
| API key safety | Server-side only, never in Expo bundle | `GEMINI_API_KEY` in `.env`, Express only |

---

## 4. Batch A — DB Migration ✅ COMPLETE

**File created:**
- `supabase/migrations/0031_homework_ai_generation.sql`
- `db/migrations/0031_homework_ai_generation.sql` (mirror)

**5 columns added to `homework` table:**

| Column | Type | Purpose |
|---|---|---|
| `ai_generated` | BOOLEAN NOT NULL DEFAULT false | Flags AI-created assignments |
| `generated_content` | JSONB DEFAULT NULL | Raw AI output (questions array + metadata) |
| `pdf_url` | TEXT DEFAULT NULL | Supabase Storage public URL of generated PDF |
| `generation_status` | TEXT DEFAULT NULL | `generating` / `generated` / `published` / `failed` |
| `question_config` | JSONB DEFAULT NULL | Teacher's question count inputs per type |

**homework table now has 23 columns** (was 18).

**Types updated:** `src/types/homework.ts` — HomeworkItem type has all 5 new fields.

### generated_content JSON shape:
```json
{
  "questions": [
    {
      "question_number": 1,
      "type": "MCQ",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
    },
    {
      "question_number": 2,
      "type": "SHORT",
      "question": "...",
      "options": null
    }
  ],
  "metadata": {
    "subject": "Mathematics",
    "grade": "Class 8",
    "title": "Algebra - Linear Equations",
    "topic": "...",
    "total_questions": 5,
    "generated_at": "ISO timestamp"
  }
}
```

### question_config JSON shape:
```json
{
  "mcq": 2,
  "very_short": 2,
  "short": 1,
  "long": 0,
  "case_study": 0,
  "assertion_reason": 0
}
```

---

## 5. Batch B — Express Server ✅ COMPLETE

**Server location:** `ShikshaSetuNew/server/`

### File structure created:
```
server/
  index.ts                  ← Express entry, port 3001
  routes/
    homework.ts             ← POST /api/teacher/homework/generate
  services/
    gemini.ts               ← Gemini call + CBSE prompt builder
    pdf.ts                  ← pdfkit PDF generation + Supabase Storage upload
  middleware/
    auth.ts                 ← JWT validation (built, not yet wired to routes)
  types/
    generation.ts           ← TypeScript types for server
```

### npm scripts added to package.json:
```json
"server": "tsx watch server/index.ts",
"server:start": "tsx server/index.ts"
```

### Packages installed:
- `express`, `cors`, `pdfkit`
- `@types/express`, `@types/cors`, `@types/pdfkit` (devDependencies)
- `tsx` (devDependency, TypeScript runner)

### Endpoint:
`POST /api/teacher/homework/generate`

**Request body:**
```typescript
{
  grade: string;            // "Class 8"
  subject: string;          // "Mathematics"
  title: string;            // "Algebra — Quadratic Equations"
  topic_description: string;
  question_config: {
    mcq: number;
    very_short: number;
    short: number;
    long: number;
    case_study: number;
    assertion_reason: number;
  };
  teacher_id: string;       // UUID
  class_id: string;         // UUID
  subject_id: string;       // UUID
  institution_id: string;   // UUID
  academic_year_id: string; // UUID
  due_date: string;         // ISO date
}
```

**Success response (200):**
```json
{
  "homework_id": "uuid",
  "generated_content": { "questions": [...], "metadata": {...} },
  "pdf_url": "https://supabase-storage-url/homework-pdfs/...",
  "generation_status": "generated"
}
```

**Error handling:**
- Gemini fails → homework row saved with `generation_status: 'failed'`, returns 500
- PDF upload fails → returns 200 with `pdf_url: null`, questions still returned

### Supabase Storage:
- Bucket: `homework-pdfs`
- Path: `{institution_id}/{class_id}/{homework_id}.pdf`
- Public URL returned and stored on homework row

### .env variables used by server:
```
GEMINI_API_KEY=...
EXPO_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   ← NOTE: NO EXPO_PUBLIC_ prefix (would expose key)
SERVER_PORT=3001                ← optional, defaults to 3001
```

### PDF layout (pdfkit, A4):
- Header: institution placeholder, "HOMEWORK ASSIGNMENT", grade/subject/title, due date
- Sections A–F grouped by question type (only rendered if count > 0)
- Section A: MCQ, B: Very Short, C: Short, D: Long, E: Case Study, F: Assertion-Reason
- Footer: "Page X of Y" on every page
- Font: Helvetica-Bold / Helvetica (built-in, no external fonts)

---

## 6. Batch C — Preview + Edit Screen ✅ COMPLETE

**File created:** `app/(teacher)/teacher-homework/preview.tsx`

**What it does:**
- Receives `homework_id`, `generated_content`, `pdf_url` from navigation params
- Displays all questions grouped by type with section headers (Sections A–F)
- Teacher can tap any question to edit text inline (one card at a time)
- MCQ options are also editable inline with lettered prefix handling
- Non-editing cards dim to 0.6 opacity while one is in edit mode
- "Publish" button at bottom:
  - Saves edited questions back to `generated_content` on the homework row
  - Updates `generation_status` to `'published'`
  - Updates `status` to `'active'` (makes it visible to students)
  - Navigates to the existing `published.tsx` success screen
- "Regenerate" button — shows confirmation alert then goes back to create.tsx
- Dismissible gold info banner: "Tap any question to edit it before publishing."
- theme.ts tokens used throughout — no hardcoded colors

---

## 7. Batch D — Wire create.tsx → Server → preview.tsx ✅ COMPLETE

**What was changed:**

**`src/types/homework.ts`**
- Extracted `QuestionType`, `GeneratedQuestion`, `GeneratedContent` as separate
  exported interfaces (reused by both client and server)

**`src/repositories/teacherRepository.ts`**
- Added `generateHomework(payload)` function
- Calls `POST $EXPO_PUBLIC_SERVER_URL/api/teacher/homework/generate`
- Returns `{ homework_id, generated_content, pdf_url, generation_status }`

**`.env`**
- Added `EXPO_PUBLIC_SERVER_URL=http://localhost:3001`
- Note: use machine's local IP (e.g. `http://192.168.x.x:3001`) for physical device testing

**`app/(teacher)/teacher-homework/create.tsx`**
- Added `isGenerating` state
- Added `academicYearId` state — fetched from DB on mount via `useEffect`
- Added `validateForm()` — validates grade, subject, title, topic, question count
- "Generate Questions →" button calls `generateHomework()` with all form fields + auth context IDs
- Button shows "Generating..." spinner during API call
- Button dims when form is invalid (`isFormValid` computed value)
- On success: navigates to `preview.tsx` with all params
- On error: shows `Alert.alert` with server error message

---

## 8. What Is NOT In Scope For This Feature (Do Later)

- AI scoring of student submissions (separate feature, separate session)
- Subscription / billing / Razorpay integration
- Student-facing homework screens
- Auth middleware wiring to Express routes (auth.ts is built but not connected)
- Nightly quota reset cron
- Push notifications for expiry warnings

---

## 9. Existing File Reference

### Teacher homework screens (all complete):
| File | Purpose | Status |
|---|---|---|
| `app/(teacher)/teacher-homework/create.tsx` | Form: grade, subject, title, topic, question config | ✅ Complete — wired to server |
| `app/(teacher)/teacher-homework/index.tsx` | Homework list dashboard | ✅ Complete |
| `app/(teacher)/teacher-homework/published.tsx` | Success screen after publish | ✅ Complete |
| `app/(teacher)/teacher-homework/preview.tsx` | Preview + edit generated questions | ✅ Complete — created in Batch C |

### Relevant existing source files:
| File | Purpose |
|---|---|
| `src/types/homework.ts` | HomeworkItem + HomeworkSubmission types (updated in Batch A) |
| `src/repositories/teacherRepository.ts` | Teacher data access layer (update in Batch D) |
| `src/lib/supabase.ts` | Supabase client (use for reference) |
| `src/gemini_flash.ts` | Old test script — DO NOT MODIFY |
| `constants/theme.ts` | App color theme (use for consistent UI) |
| `components/teacher/Header.tsx` | Teacher header component |
| `components/teacher/BottomNavBar.tsx` | Teacher bottom nav |

### Database tables relevant to this feature:
| Table | Status |
|---|---|
| `homework` | ✅ 23 columns, includes all AI generation columns |
| `homework_submissions` | ✅ Exists, needs column fixes (separate session) |
| `teachers` | ✅ Complete |
| `students` | ✅ Complete |
| `classes` | ✅ Complete |
| `subjects` | ✅ Complete |
| `institutions` | ✅ Complete |

---

## 10. Anomalies To Fix In A Future Session (Not This Feature)

These are from `HOMEWORK_AI_IMPLEMENTATION_PLAN.md` — logged here so they aren't forgotten:

| # | Issue | Severity |
|---|---|---|
| 1 | `homework_submissions.file_url` is single TEXT — needs migration to `attachment_urls TEXT[]` | 🟡 Medium |
| 2 | `ai_scores` standalone table is unused, conflicts with storing scores on submissions | 🟡 Medium |
| 3 | `student_daily_usage` table is structurally wrong — needs replacing with `ai_daily_quotas` | 🔴 High |
| 4 | No `student_subscriptions` or `subscription_payments` tables exist yet | 🔴 High |
| 5 | No Razorpay integration exists | 🔴 High |
| 6 | Plan gating trigger reads wrong table (`students.plan_tier` instead of `student_subscriptions`) | 🔴 High |

---

## 11. How To Start The Server (For Reference)

```bash
cd ShikshaSetuNew
npm run server:start       # production-like start
# or
npm run server             # watch mode (auto-restarts on file change)
```

Health check:
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"margam-server"}
```

---

## 12. Session Handoff Checklist

**All 4 batches for AI homework generation are complete.**
Next session topic: AI scoring of student submissions (separate feature).

When starting the next session, tell Claude Code:
1. Read this file first: `MARGAM_AI_HOMEWORK_CONTEXT.md`
2. Read `AGENTS.md` for project-wide rules
3. Read `HOMEWORK_AI_IMPLEMENTATION_PLAN.md` for full billing/scoring context
4. The AI homework generation feature is fully done — do not touch those files
5. Migration 0031 is already applied — do not re-run it
6. Server is already built at `server/` — do not rebuild it
7. Next feature to build: **AI scoring of student homework submissions**
   - Student uploads photo of completed homework
   - Express server sends image to Gemini for evaluation
   - Returns score (0–10) + feedback stored on `homework_submissions`
   - Gated by subscription plan (Free / Standard / Pro)
   - See `HOMEWORK_AI_IMPLEMENTATION_PLAN.md` sections 3 and 4 for full spec
