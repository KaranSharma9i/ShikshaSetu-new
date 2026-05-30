# HOMEWORK AI IMPLEMENTATION PLAN

---

## Pricing Tiers (Source of Truth)

| Plan | Price | AI Evaluations / Day / Student | AI Features Unlocked |
|------|-------|-------------------------------|----------------------|
| **Free** | ₹0 / month | 0 — AI fully disabled | None |
| **Standard** | ₹35 / student / month | 6 | AI Checking, Auto Scoring, Homework Analytics |
| **Pro** | ₹50 / student / month | 10 | Everything in Standard + Student Feedback, Personalized Suggestions, Advanced Insights, Performance Analytics |

**Billing rules (confirmed):**
- Subscription is **per-student** — each student has their own independent plan
- Parent pays for their own child directly inside the app via Razorpay
- Payment is **manual** — parent recharges each month themselves (no auto-recurring)
- Plan duration is **30 rolling days** from the date of payment
- On Free tier or expired plan: student can still see and receive homework, but AI scoring is disabled

---

## 1. Current Folder Architecture Audit

### Area: Homework (Assignment creation, student submission, upload flow)

| File Path | Current Purpose | Status |
|-----------|----------------|--------|
| `app/homework/index.tsx` | Student homework dashboard. Tabbed list (All, Pending, Submitted, Graded) with simulated file selection and submission modal. | 🟡 Partial |
| `app/homework/[id].tsx` | Homework detail view. Renders instructions, status, attachment cards, and mocked file upload trigger. | 🟡 Partial |
| `src/types/homework.ts` | TypeScript type definitions for `HomeworkItem` and `HomeworkSubmission`. | ✅ Complete |
| `src/repositories/studentRepository.ts` | Supabase data-access layer — fetches assignment lists, single assignment detail, records submission row. Writes directly to Supabase (must be rerouted to Express backend for AI calls). | 🟡 Partial |
| `supabase/migrations/0019_create_homework.sql` | Creates core `homework` and `homework_submissions` tables. | ✅ Complete |
| `supabase/migrations/0028_homework_columns.sql` | Extends homework tables with difficulty, status flags, score columns. | ✅ Complete |

### Area: AI Scoring (Gemini calls, score storage, feedback generation)

| File Path | Current Purpose | Status |
|-----------|----------------|--------|
| `src/gemini_flash.ts` | Standalone Node.js test script. Connects to Gemini API, sends a hardcoded base64 image, prints grading output. Has wrong model string and hardcoded API key. | 🟡 Partial |
| `app/homework/score/[id].tsx` | Placeholder screen for displaying AI score, criteria breakdown, and feedback. No real data wiring. | ❌ Missing |
| `supabase/migrations/0027_create_ai_scores.sql` | Creates a standalone `ai_scores` table — currently unused and conflicts with storing scores directly on `homework_submissions`. | 🟡 Partial |

### Area: Daily Upload Quota / Rate Limiting

| File Path | Current Purpose | Status |
|-----------|----------------|--------|
| `supabase/migrations/0029_billing_schema.sql` | Creates `student_daily_usage` table and `enforce_scan_limits()` trigger. Limits are hardcoded in trigger (6/10/0 by plan_tier). Wrong level — trigger reads from `students.plan_tier`, not from student subscription table. | 🟡 Partial |
| Nightly Quota Reset Cron | Background scheduler to reset daily counters at midnight IST. | ❌ Missing |

### Area: Subscription & Payments (Parent → Student plan)

| File Path | Current Purpose | Status |
|-----------|----------------|--------|
| `student_subscriptions` table | Stores each student's active plan, expiry date, and Razorpay order reference. | ❌ Missing |
| `subscription_payments` table | Immutable audit log of every Razorpay payment made by a parent. | ❌ Missing |
| Razorpay order creation endpoint | Backend endpoint to create a Razorpay order before checkout. | ❌ Missing |
| Razorpay webhook receiver | Backend endpoint to validate payment and activate student plan. | ❌ Missing |
| Subscription screen in Expo | Parent-facing screen to view current plan, expiry, and trigger recharge. | ❌ Missing |

---

## 2. Supabase DB Audit (Read-Only)

### Table: `homework_assignments`
- **Exists:** No — table in DB is named `homework`
- **Status:** ❌ Name mismatch. Recommend keeping the existing `homework` name and updating all spec references to match, to avoid a breaking rename migration. Decide before writing any new migration.

### Table: `homework_submissions`
- **Exists:** Yes
- **Missing / Mismatched Columns:**

| Column | Current State | Required State |
|--------|--------------|----------------|
| `ai_score` | `NUMERIC` (no precision) | `NUMERIC(4,2)` with `CHECK (ai_score BETWEEN 0 AND 10)` |
| `ai_feedback` | Missing — uses `feedback JSONB` instead | `TEXT` |
| `ai_suggestions` | Missing | `TEXT` |
| `scored_at` | Missing | `TIMESTAMPTZ` |
| `attachment_urls` | Uses `file_url TEXT` (single URL) | `TEXT[]` (array — supports multiple photos) |
| `status` | `TEXT` with check constraint | `submission_status` ENUM (`pending`, `submitted`, `scored`, `late_submitted`) |

### Table: `institutions`
- **Exists:** Yes — fully compliant. No subscription columns needed here since billing is per-student, not per-institution.

### Table: `users`
- **Exists:** Yes — fully compliant. No changes needed.

### Table: `students`
- **Exists:** Yes
- **Column to deprecate:**

| Column | Issue |
|--------|-------|
| `plan_tier` (if exists) | If this column exists, it is the wrong approach. Plan must live on `student_subscriptions`, not on the student row, because it changes monthly and needs payment history. |

### Table: `student_subscriptions` *(new)*
- **Exists:** No
- **Status:** ❌ Needs to be created
- **Purpose:** Stores each student's current active plan and its rolling 30-day expiry.

Required columns:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT` — UNIQUE (one active record per student)
- `institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT`
- `plan_tier plan_tier_type NOT NULL DEFAULT 'FREE'` — ENUM: `FREE`, `STANDARD`, `PRO`
- `plan_limit INTEGER NOT NULL DEFAULT 0` — derived from plan_tier at payment time (FREE → 0, STANDARD → 6, PRO → 10). Stored so plan changes mid-month don't retroactively change the current period's limit.
- `started_at TIMESTAMPTZ NOT NULL` — timestamp of payment / plan activation
- `expires_at TIMESTAMPTZ NOT NULL` — `started_at + 30 days`
- `razorpay_order_id VARCHAR(100)` — nullable, links to the payment that activated this plan
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `deleted_at TIMESTAMPTZ DEFAULT NULL`
- UNIQUE constraint on `student_id` — only one subscription row per student (upserted on each payment)

### Table: `subscription_payments` *(new)*
- **Exists:** No
- **Status:** ❌ Needs to be created
- **Purpose:** Immutable audit log. Every Razorpay payment a parent makes writes one row here. Never updated or deleted.

Required columns:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT`
- `institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT`
- `plan_tier plan_tier_type NOT NULL` — the plan that was purchased
- `amount_paise INTEGER NOT NULL` — amount paid in paise (₹35 = 3500, ₹50 = 5000). INTEGER not FLOAT.
- `razorpay_order_id VARCHAR(100) NOT NULL`
- `razorpay_payment_id VARCHAR(100)` — nullable until payment confirmed by webhook
- `payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'` — `pending`, `captured`, `failed`
- `paid_at TIMESTAMPTZ` — set when webhook confirms capture
- `plan_started_at TIMESTAMPTZ` — when the 30-day window begins
- `plan_expires_at TIMESTAMPTZ` — plan_started_at + 30 days
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- ⚠️ No `updated_at`, no `deleted_at` — this table is append-only. `payment_status` is the only mutable column (updated by webhook only).

### Table: `ai_daily_quotas` *(new — replaces `student_daily_usage`)*
- **Exists:** No — `student_daily_usage` exists but is structurally wrong
- **Status:** ❌ Needs to be created. `student_daily_usage` must be dropped.

| Issue with `student_daily_usage` | Detail |
|----------------------------------|--------|
| Missing `institution_id` | Needed for multi-tenant scoping |
| Missing `plan_limit` | Hardcoded in trigger instead of being stored per-row |
| Column named `upload_counter` | Must be `count` |
| Column named `usage_date` | Must be `submission_date` |
| Has `deleted_at` | Quota rows are never soft-deleted |
| Trigger reads `students.plan_tier` | Must read from `student_subscriptions.plan_limit` instead |

Required columns for `ai_daily_quotas`:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT`
- `institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT`
- `submission_date DATE NOT NULL`
- `count INTEGER NOT NULL DEFAULT 0`
- `plan_limit INTEGER NOT NULL` — copied from `student_subscriptions.plan_limit` at first submission of the day
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- UNIQUE constraint on `(student_id, submission_date)`
- No `deleted_at`

## 3. What Is Already Done

### Database (Supabase)
- Base schema: `institutions`, `users`, `teachers`, `students`, `classes`, `subjects` — complete.
- `homework` (assignment table) and `homework_submissions` tables — created, need column additions.
- RLS policies on usage tables — complete (will need updating for new table names).

### Frontend (Expo / React Native)
- Homework Dashboard (`app/homework/index.tsx`) — filter tabs, assignment list, grading badge display.
- Homework Detail (`app/homework/[id].tsx`) — instructions, status, attachment cards.
- Repository layer (`src/repositories/studentRepository.ts`) — fetches homework, submits solution rows.
- Layout, Header, BottomNavBar — complete.

### Backend (Node.js)
- `src/gemini_flash.ts` — basic Gemini API connectivity proof-of-concept. Has issues (wrong model string, hardcoded key) but confirms the SDK and connection work.

---

## 4. What Needs To Be Done

### Phase 1 — Database Migrations (Supabase)

**1a. Create `plan_tier_type` ENUM:**
- Values: `FREE`, `STANDARD`, `PRO`
- Used by both `student_subscriptions` and `subscription_payments`

**1b. Create `student_subscriptions` table:**
- Full column spec listed in Section 2 above
- UNIQUE on `student_id` — upserted on each new payment

**1c. Create `subscription_payments` table:**
- Full column spec listed in Section 2 above
- Append-only — no `updated_at`, no `deleted_at`
- `payment_status` is the only column updated post-insert (by webhook)

**1d. Create `submission_status` ENUM and update `homework_submissions`:**
- Create ENUM: `pending`, `submitted`, `scored`, `late_submitted`
- Alter `status` column from `TEXT` to `submission_status` ENUM
- Alter `ai_score` to `NUMERIC(4,2)` with `CHECK (ai_score BETWEEN 0 AND 10)`
- Add `ai_feedback TEXT`
- Add `ai_suggestions TEXT`
- Add `scored_at TIMESTAMPTZ`
- Add `attachment_urls TEXT[]`
- Migrate data from `file_url` into `attachment_urls` as a single-element array, then drop `file_url`

---

### Phase 2 — Backend (Node.js / Express)

All AI evaluation requests must go through the Express backend. The Expo app never calls Gemini directly.

**Fix `src/gemini_flash.ts` immediately:**
- Change model string from `"gemini-3.5-flash"` to `"gemini-2.5-flash-lite"`
- Replace hardcoded API key string with `process.env.GEMINI_API_KEY!`
- Fix the broken image path (empty string at end of `path.join`)

**Plan resolver utility — single source of truth:**

```
FREE     → daily_limit = 0,  monthly_price_paise = 0
STANDARD → daily_limit = 6,  monthly_price_paise = 3500
PRO      → daily_limit = 10, monthly_price_paise = 5000
```

This must be one exported function/constant. Never hardcode these numbers anywhere else in the codebase.

---

**Endpoint: `GET /api/student/subscription`**

Touches: `student_subscriptions`

Returns the student's current plan tier, expiry date, daily limit, and remaining evaluations today. The Expo app calls this on launch to gate the UI correctly.

Response shape:
```
{
  plan_tier: 'FREE' | 'STANDARD' | 'PRO',
  expires_at: ISO timestamp | null,
  is_active: boolean,
  daily_limit: number,
  used_today: number,
  remaining_today: number
}
```

---

**Endpoint: `POST /api/homework/submit-evaluate`**

Touches: `homework_submissions`, `ai_daily_quotas`, `student_subscriptions`

| Step | Action | DB Tables Touched |
|------|--------|-------------------|
| 1 | Receive `{ student_id, assignment_id, base64_image }`. Validate JWT, extract `institution_id`. | — |
| 2 | **Subscription check.** Query `student_subscriptions` for `student_id`. If `plan_tier = 'FREE'` → `403 AI_NOT_AVAILABLE`. If `expires_at < NOW()` → `403 SUBSCRIPTION_EXPIRED`. | `student_subscriptions` |
| 3 | **Quota check.** Query `ai_daily_quotas` for `(student_id, today)`. If row missing → create it with `plan_limit` from `student_subscriptions.plan_limit`. If `count >= plan_limit` → `429 DAILY_LIMIT_REACHED`. | `ai_daily_quotas` |
| 4 | **Gemini call.** Send compressed base64 image + homework context to `gemini-2.5-flash-lite`. Params: `maxOutputTokens: 300`, `temperature: 0.15`, `responseMimeType: "application/json"`. | — |
| 5 | **Score write.** Update `homework_submissions`: set `ai_score`, `ai_feedback` (Standard+Pro), `ai_suggestions` (Pro only), `scored_at`, `status = 'scored'`. For Standard plan, write `null` for `ai_suggestions`. | `homework_submissions` |
| 6 | **Quota increment.** `UPDATE ai_daily_quotas SET count = count + 1` for `(student_id, today)`. | `ai_daily_quotas` |
| 7 | Return score payload to Expo including `plan_tier` so frontend can gate which fields to show. | — |

---

**Endpoint: `POST /api/payments/recharge/order`**

Touches: `subscription_payments` (inserts pending row)

- Validate student JWT
- Validate requested `plan_tier` is `STANDARD` or `PRO` (cannot purchase FREE)
- Look up price from plan resolver utility
- Call Razorpay `orders.create` with correct amount in paise, currency `INR`
- Insert a row in `subscription_payments` with `payment_status = 'pending'`, store `razorpay_order_id`
- Return `{ razorpay_order_id, amount_paise, currency }` to Expo

---

**Endpoint: `POST /api/payments/webhook`**

Touches: `subscription_payments`, `student_subscriptions`

- Receive raw POST body from Razorpay
- Validate HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET` from `.env`
- If signature invalid → return `400` immediately, log the attempt
- If valid and `event = 'payment.captured'`:
  - Find the `subscription_payments` row by `razorpay_order_id`
  - Update `payment_status = 'captured'`, set `razorpay_payment_id`, set `paid_at = NOW()`
  - Set `plan_started_at = NOW()`, `plan_expires_at = NOW() + INTERVAL '30 days'`
  - Upsert `student_subscriptions` for this `student_id`:
    - Set `plan_tier`, `plan_limit` (from resolver), `started_at`, `expires_at`, `razorpay_order_id`
  - Return `200`
- ⚠️ Wallet balance must NEVER be updated from the Expo success callback — webhook only

---

**Nightly cron — quota reset:**
- Schedule at 00:00 IST (18:30 UTC)
- `UPDATE ai_daily_quotas SET count = 0, updated_at = NOW() WHERE submission_date = CURRENT_DATE`
- Use `node-cron` or Supabase Edge Function scheduled job
- Log number of rows reset for monitoring

---

### Phase 3 — Frontend (Expo)

**Image optimization pipeline (runs on device before sending to backend):**
- `expo-image-picker` → capture or select image
- Pass URI to `expo-image-manipulator`:
  - Resize longest edge → 800px
  - Compress quality → 0.35
  - Convert to grayscale: `actions: [{ grayscale: true }]`
  - Export as Base64 string
- POST `{ student_id, assignment_id, base64_image }` to Express backend

**New screen: `app/student/subscription/index.tsx`**

Parent-facing subscription management screen. Shows:
- Current plan badge (Free / Standard / Pro)
- Expiry date (e.g. "Active until 28 June 2026") or "No active plan"
- Daily usage bar (e.g. "4 of 6 evaluations used today")
- Upgrade / Recharge button → triggers Razorpay checkout
- Payment history list (last 3–5 payments from `subscription_payments`)

**Update: `app/homework/[id].tsx`**
- Replace mocked file picker with real `expo-image-picker` + optimization pipeline
- Show upload progress indicator during backend call
- If `plan_tier = 'FREE'` → show "Upgrade to Standard to enable AI scoring" banner, no upload button
- If `count >= plan_limit` for today → show "Daily limit reached. Try again tomorrow.", no upload button
- If `expires_at` within 7 days → show "Your plan expires on [date]. Tap to renew." banner

**New screen: `app/homework/score/[id].tsx`**
- Overall AI score out of 10 with visual ring/bar indicator
- `ai_feedback` text block — shown for Standard and Pro
- `ai_suggestions` text block — shown for Pro only (hidden for Standard)
- `scored_at` timestamp
- If Standard plan and `ai_suggestions` is null → show "Upgrade to Pro for personalized improvement suggestions"

**Update: `src/repositories/studentRepository.ts`**
- Add `getSubscription()` → calls `GET /api/student/subscription`
- Add `submitForEvaluation(assignmentId, base64Image)` → calls `POST /api/homework/submit-evaluate`
- Add `createRechargeOrder(planTier)` → calls `POST /api/payments/recharge/order`
- Remove any direct Supabase write calls for homework submission — those now go through Express

---

### Phase 4 — Subscription Screen UI States (All cases to handle)

| State | What parent sees |
|-------|-----------------|
| `plan_tier = 'FREE'` | "No AI plan active. Choose a plan below." + Standard and Pro cards with prices |
| `plan_tier = 'STANDARD'`, active | Green badge "Standard — Active until [date]". Daily bar. Recharge / Upgrade to Pro button. |
| `plan_tier = 'PRO'`, active | Gold badge "Pro — Active until [date]". Daily bar. Recharge button. |
| `expires_at < NOW()` | Red badge "Plan Expired". "Renew now to restore AI scoring." + plan cards |
| `expires_at` within 7 days | Yellow warning banner inline on homework screens |
| Payment in progress (order created, webhook not yet received) | "Payment processing... Your plan will activate shortly." |

---

## 5. Anomalies & Ambiguities Found

| # | Anomaly | Severity | Resolution |
|---|---------|----------|------------|
| 1 | **Wrong Gemini model string** — `src/gemini_flash.ts` uses `"gemini-3.5-flash"`. Neither `gemini-3.5-flash` nor `gemini-3.1-flash-lite` exist. | 🔴 High | Use `"gemini-2.5-flash-lite"` everywhere |
| 2 | **Hardcoded API key** in `src/gemini_flash.ts`. Key embedded in source — will be exposed if pushed to git. | 🔴 High | Move to `.env` as `GEMINI_API_KEY`. Add `.env` to `.gitignore` immediately. |
| 3 | **Direct client-side Gemini risk** — if `gemini_flash.ts` logic is ported to Expo, the API key is exposed in the app bundle. | 🔴 High | All Gemini calls go through Express only |
| 4 | **Plan gating at wrong entity level** — existing trigger reads `students.plan_tier`. The subscription is per-student but stored separately on `student_subscriptions`, not as a static column on `students`. | 🔴 High | Drop the trigger. Gate at application layer using `student_subscriptions` |
| 5 | **Razorpay webhook secret not in `.env`** — if Razorpay integration is attempted without validating the webhook signature, any HTTP POST to the webhook URL could fake a payment. | 🔴 High | `RAZORPAY_WEBHOOK_SECRET` must be in `.env`. Validate HMAC before any DB write. |
| 6 | **Table naming mismatch** — DB has `homework`, spec says `homework_assignments`. | 🟡 Medium | Recommend keeping `homework` and updating spec references. Avoid a breaking rename migration. |
| 7 | **`homework_submissions.file_url`** is a single TEXT column — cannot store multiple attachment photos. | 🟡 Medium | Migrate to `attachment_urls TEXT[]` |
| 8 | **`ai_scores` standalone table** is unused and conflicts with storing scores on `homework_submissions`. | 🟡 Medium | Drop this table |
| 9 | **`wallet_transactions.amount_paisa > 0` constraint** — blocks negative deductions. Moot since table is being dropped. | 🟡 Medium | Drop entire table |
| 10 | **Pro-only fields (`ai_feedback`, `ai_suggestions`) not gated** — currently stored and returned for all tiers. | 🟡 Medium | Backend: write `null` for `ai_suggestions` on Standard. Frontend: conditionally render based on `plan_tier` returned with score. |
| 11 | **No expiry warning flow exists** — nothing currently alerts parents when a plan is about to expire. | 🟡 Medium | Add 7-day banner on homework screens. Future: push notification via FCM. |


---

## 6. Pricing & Feature Gating Alignment Check

| Feature | Free | Standard | Pro | Gating Status |
|---------|------|----------|-----|---------------|
| View Student Marks | ✅ | ✅ | ✅ | ✅ Works |
| Receive Homework | ✅ | ✅ | ✅ | ✅ Works |
| Fee Payment Through App | ✅ | ✅ | ✅ | ✅ Works |
| Student Profile Access | ✅ | ✅ | ✅ | ✅ Works |
| AI Homework Checking | ❌ | ✅ | ✅ | ❌ Not gated — needs subscription check middleware |
| Automatic AI Scoring | ❌ | ✅ | ✅ | ❌ Not gated |
| Homework Analytics | ❌ | ✅ | ✅ | ❌ Not built |
| Daily AI Evaluations | 0/day | 6/day | 10/day | 🟡 Partial — trigger exists but reads wrong table |
| Student Feedback (`ai_feedback`) | ❌ | ✅ | ✅ | ❌ Not gated — returned for all tiers |
| Personalized Suggestions (`ai_suggestions`) | ❌ | ❌ | ✅ | ❌ Not gated — not even stored separately yet |
| Advanced Academic Insights | ❌ | ❌ | ✅ | ❌ Not built |
| Performance Analytics | ❌ | ❌ | ✅ | ❌ Not built |

**Overall Status: 🟡 Partial**

No application-layer subscription gating exists. The DB trigger reads the wrong table and has hardcoded limits. Pro-only fields are not separated in the response. None of the subscription or payment tables exist yet.