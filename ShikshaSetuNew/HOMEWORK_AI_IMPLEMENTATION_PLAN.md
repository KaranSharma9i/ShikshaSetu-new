# HOMEWORK AI IMPLEMENTATION PLAN

This document provides a comprehensive audit and implementation plan for adding AI Homework grading, daily quota limits, wallets, and Razorpay payment flows to the Margam ERP platform.

---

## 1. Current Folder Architecture Audit

This section lists the files and folders found in the project related to homework management, AI scoring, daily upload quotas, and wallet/billing.

### Area: Homework (Assignment creation, student submission, upload flow)

| File Path (Relative to project root) | Current Purpose | Status |
| --- | --- | --- |
| app/homework/index.tsx | Expo Router screen representing the student's homework dashboard. Displays a tabbed list of active assignments (All, Pending, Submitted, Graded) and includes a modal with simulated file selection and submission. | 🟡 Partial |
| app/homework/[id].tsx | Expo Router screen representing the detailed view of a specific homework assignment. Displays instructions, reference question sheet download link, deadline warnings, and features a mocked file upload and submission trigger. | 🟡 Partial |
| src/types/homework.ts | TypeScript type definitions containing definitions for HomeworkItem and HomeworkSubmission schemas. | ✅ Complete |
| src/repositories/studentRepository.ts | Data-access layer using Supabase client to fetch homework assignments list, get details for a single homework, and record submission row updates. | 🟡 Partial |
| supabase/migrations/0019_create_homework.sql | SQL migration script creating the core homework and homework_submissions tables in the Supabase schema. | ✅ Complete |
| supabase/migrations/0028_homework_columns.sql | SQL migration script extending homework and homework_submissions tables with difficulty levels, status flags, and properties for score storage. | ✅ Complete |

### Area: AI Scoring (Gemini calls, score storage, feedback generation)

| File Path (Relative to project root) | Current Purpose | Status |
| --- | --- | --- |
| src/gemini_flash.ts | Standalone Node.js script testing connection to Gemini 3.5 Flash using the @google/genai SDK. Converts a local test asset to Base64 and executes a test grading prompt. | 🟡 Partial |
| app/homework/score/[id].tsx | Expo Router screen placeholder meant to display the graded homework score, criteria breakdown, and teacher/AI feedback. | ❌ Missing |
| supabase/migrations/0027_create_ai_scores.sql | SQL migration creating a standalone, unused ai_scores table (historic score logging). | 🟡 Partial |

### Area: Daily Upload Quota / Rate Limiting

| File Path (Relative to project root) | Current Purpose | Status |
| --- | --- | --- |
| supabase/migrations/0029_billing_schema.sql | SQL migration creating the student_daily_usage table and enforce_scan_limits() trigger function. | 🟡 Partial |
| Nightly Quota Reset Cron | Background cron scheduler to reset student evaluation counters at midnight. | ❌ Missing |

### Area: Wallet / Billing

| File Path (Relative to project root) | Current Purpose | Status |
| --- | --- | --- |
| supabase/migrations/0029_billing_schema.sql | SQL migration defining wallet_tx_type and plan_tier_type enums, and creating student_wallets and wallet_transactions tables. | 🟡 Partial |
| supabase/migrations/0030_billing_rls.sql | SQL migration implementing Row Level Security (RLS) policies for wallet, transaction, and daily usage tables. | ✅ Complete |
| Wallet Screens / Razorpay APIs | Code files for charging, initiating payments, viewing transactions, or Razorpay checkout callbacks. | ❌ Missing |

---

## 2. Supabase DB Audit (Read-Only)

This section reports the existence, current column definitions, and compliance with the specification for the core and newly planned database tables.

### Table: homework_assignments
* Exists: No
* Status: ❌ Needs to be created
* Note: The database currently has a table named "homework" that serves this purpose. To match the specification, the table must be created as homework_assignments or the codebase references must be updated to target the existing "homework" table.

### Table: homework_submissions
* Exists: Yes
* Current Columns in Database:
  * id [uuid] NOT NULL DEFAULT gen_random_uuid() (Primary Key)
  * homework_id [uuid] NOT NULL (Foreign Key -> homework(id))
  * student_id [uuid] NOT NULL (Foreign Key -> students(id))
  * submitted_at [timestamptz] NOT NULL DEFAULT now()
  * marks_obtained [numeric] NULL
  * feedback [jsonb] NULL (Stores criteria and overall feedback)
  * created_at [timestamptz] NOT NULL DEFAULT now()
  * updated_at [timestamptz] NOT NULL DEFAULT now()
  * deleted_at [timestamptz] NULL
  * status [text] NULL DEFAULT 'submitted'::text (Has check constraint for 'submitted', 'scored')
  * ai_score [numeric] NULL
  * file_url [text] NULL
* Missing/Mismatched Columns vs. Specification:
  * ai_score: Currently NUMERIC. Spec requires NUMERIC(4,2) (score out of 10).
  * ai_feedback: Missing. Currently, only feedback [jsonb] exists. Spec requires ai_feedback TEXT.
  * ai_suggestions: Missing. Spec requires ai_suggestions TEXT.
  * scored_at: Missing. Spec requires scored_at TIMESTAMPTZ.
  * attachment_urls: Missing. DB uses file_url TEXT instead of attachment_urls TEXT[].
  * status: Currently TEXT. Spec requires ENUM type submission_status (pending, submitted, scored, late_submitted).

### Table: institutions
* Exists: Yes
* Current Columns in Database:
  * id [uuid] NOT NULL DEFAULT gen_random_uuid() (Primary Key)
  * name [text] NOT NULL
  * code [varchar] NOT NULL (Unique)
  * address [text] NULL
  * city [text] NULL
  * state [text] NULL
  * pincode [varchar] NULL
  * phone [text] NULL
  * email [text] NULL
  * logo_url [text] NULL
  * status [account_status] NOT NULL DEFAULT 'active'
  * subscription_ends_at [timestamptz] NULL
  * created_at [timestamptz] NOT NULL DEFAULT now()
  * updated_at [timestamptz] NOT NULL DEFAULT now()
  * deleted_at [timestamptz] NULL
* Missing/Mismatched Columns vs. Specification:
  * None. Complies with requirements.

### Table: users
* Exists: Yes
* Current Columns in Database:
  * id [uuid] NOT NULL DEFAULT gen_random_uuid() (Primary Key)
  * institution_id [uuid] NOT NULL (Foreign Key -> institutions(id))
  * role [user_role] NOT NULL
  * login_id [text] NOT NULL (Unique combined with institution_id)
  * password_hash [text] NOT NULL
  * full_name [text] NOT NULL
  * email [text] NULL
  * phone [text] NULL
  * profile_photo_url [text] NULL
  * status [account_status] NOT NULL DEFAULT 'active'
  * last_login_at [timestamptz] NULL
  * created_at [timestamptz] NOT NULL DEFAULT now()
  * updated_at [timestamptz] NOT NULL DEFAULT now()
  * deleted_at [timestamptz] NULL
* Missing/Mismatched Columns vs. Specification:
  * None. Complies with requirements.

### Table: ai_daily_quotas
* Exists: No
* Status: ❌ Needs to be created
* Note: A table named "student_daily_usage" exists in the database, but it differs significantly from the specification. To align with requirements, the table must be created as ai_daily_quotas, or student_daily_usage must be altered to add missing fields (institution_id, plan_limit), rename usage_date to submission_date, rename upload_counter to count, and drop deleted_at.

### Table: school_wallets
* Exists: No
* Status: ❌ Needs to be created

### Table: student_wallets
* Exists: Yes
* Current Columns in Database:
  * id [uuid] NOT NULL DEFAULT gen_random_uuid() (Primary Key)
  * created_at [timestamptz] NOT NULL DEFAULT now()
  * updated_at [timestamptz] NOT NULL DEFAULT now()
  * deleted_at [timestamptz] NULL (Extra column)
  * student_id [uuid] NOT NULL (Unique, Foreign Key -> students(id))
  * institution_id [uuid] NOT NULL (Foreign Key -> institutions(id))
  * balance_paisa [bigint] NOT NULL DEFAULT 0 (Has positive check constraint)
* Missing/Mismatched Columns vs. Specification:
  * None. Required columns exist (contains additional deleted_at).

### Table: wallet_transactions
* Exists: Yes
* Current Columns in Database:
  * id [uuid] NOT NULL DEFAULT gen_random_uuid() (Primary Key)
  * created_at [timestamptz] NOT NULL DEFAULT now()
  * updated_at [timestamptz] NOT NULL DEFAULT now() (Breaks append-only ledger rule)
  * deleted_at [timestamptz] NULL (Breaks append-only ledger rule)
  * student_wallet_id [uuid] NOT NULL (Foreign Key -> student_wallets(id))
  * transaction_type [wallet_tx_type] NOT NULL
  * amount_paisa [bigint] NOT NULL (Has check_positive_amount constraint)
  * balance_after_paisa [bigint] NOT NULL
  * performed_by [uuid] NOT NULL (Foreign Key -> users(id))
* Missing/Mismatched Columns vs. Specification:
  * institution_id: Missing. Spec requires institution_id UUID -> institutions(id).
  * wallet_type: Missing. Spec requires wallet_type VARCHAR(20).
  * target_id: Missing. Spec requires target_id UUID (links to student_id or school_wallet_id).
  * razorpay_order_id: Missing. Spec requires razorpay_order_id VARCHAR(100) (nullable).
  * amount_paisa: Mismatch. Current table enforces positive amount constraint (amount_paisa > 0). The spec requires negative values for deductions and positive values for recharges.
  * transaction_type: Mismatch. Uses custom ENUM wallet_tx_type (which lacks AI-related values) instead of VARCHAR(30).
  * Immutability: Table currently has updated_at and deleted_at columns, which must be removed to remain strictly append-only.

---

## 3. What Is Already Done

The following features have been successfully implemented:

### Database (Supabase)
* Base data structure including institutions, users, teachers, students, classes, and subjects.
* Homework table and core homework_submissions table schemas created.
* student_wallets table schema created.
* wallet_transactions schema created (referencing student_wallet_id).
* student_daily_usage schema created to record daily student upload counts.
* enforce_scan_limits() trigger function and check_scan_limits trigger implemented to check limits (6 for STANDARD tier, 10 for PRO tier, 0 for FREE tier) based on student plan tier.
* Row Level Security (RLS) policies implemented for wallets and usage tables.

### Frontend (Expo / React Native)
* Homework Dashboard (app/homework/index.tsx) displaying student homework, filters (All, Pending, Submitted, Graded), assignment meta info, and custom grading badge displays.
* Homework Details (app/homework/[id].tsx) rendering assignment instructions, status, and attachment cards.
* Repository endpoints (src/repositories/studentRepository.ts) fetching active homeworks, detail records, and submitting solutions.
* Layout structure, Header, and BottomNavBar elements.

### Backend (Node.js / Express)
* Test script (src/gemini_flash.ts) verifying basic connection to Gemini API by sending an OCR handwriting evaluation payload.

---

## 4. What Needs To Be Done

This section outlines the remaining tasks to implement the full production pipeline, grouped by phase.

### Phase 1 — Database (Supabase migrations needed)

* Create enum type submission_status (pending, submitted, scored, late_submitted).
* Alter homework_submissions table:
  * Change type of status to submission_status.
  * Alter ai_score column type to NUMERIC(4,2).
  * Add column ai_feedback TEXT.
  * Add column ai_suggestions TEXT.
  * Add column scored_at TIMESTAMPTZ.
  * Add column attachment_urls TEXT[].
* Drop student_daily_usage table (or migration schema) and trigger.
* Create table ai_daily_quotas:
  * id UUID (Primary Key, default gen_random_uuid())
  * student_id UUID REFERENCES students(id) ON DELETE RESTRICT
  * institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT
  * submission_date DATE
  * count INTEGER DEFAULT 0
  * plan_limit INTEGER DEFAULT 6
  * created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
  * Add UNIQUE constraint on (student_id, submission_date).
* Create table school_wallets:
  * id UUID (Primary Key, default gen_random_uuid())
  * institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT (Unique)
  * balance_paisa BIGINT DEFAULT 0
  * status ENUM('ACTIVE', 'LOW_BALANCE', 'PAUSED')
  * created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
* Modify/Recreate wallet_transactions table:
  * id UUID (Primary Key, default gen_random_uuid())
  * institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT
  * wallet_type VARCHAR(20) CHECK (wallet_type IN ('STUDENT', 'SCHOOL'))
  * target_id UUID (foreign key checked at app level for student_id or school_wallet_id)
  * amount_paisa INTEGER NOT NULL (allows positive and negative numbers)
  * transaction_type VARCHAR(30) (e.g. 'AI_RECHARGE', 'AI_EVALUATION_DEDUCTION')
  * razorpay_order_id VARCHAR(100) (Nullable)
  * created_at TIMESTAMPTZ DEFAULT NOW()
  * Ensure table is append-only: do NOT include updated_at or deleted_at columns.

### Phase 2 — Backend (Node.js)

* Initialize Express app in TypeScript inside a backend service directory.
* Implement API endpoint POST /api/homework/submit-evaluate (touches homework_submissions, ai_daily_quotas, student_wallets, and wallet_transactions):
  * Step 1: Image upload. Log metadata of image.
  * Step 2: Quota check. Query ai_daily_quotas for student_id and current date. Check count < plan_limit. Block if limit exceeded.
  * Step 3: Wallet check. Query student_wallets. Verify balance_paisa >= 10 (10 paisa evaluation cost floor). Block if insufficient balance.
  * Step 4: Gemini API call. Call model gemini-2.5-flash-lite using parameters: maxOutputTokens: 300, temperature: 0.15, responseMimeType: "application/json".
  * Step 5: Score write. Update homework_submissions setting ai_score, ai_feedback, ai_suggestions, scored_at, and status = 'scored'.
  * Step 6: Quota increment. Upsert ai_daily_quotas incrementing count by 1.
  * Step 7: Wallet deduction. Atomic database transaction subtracting 10 paisa from student_wallets.balance_paisa and inserting a deduction row (-10) in wallet_transactions.
* Setup cron job (using pg-boss, node-cron, or serverless scheduler) to run nightly at 00:00 IST (18:30 UTC):
  * Executes query: UPDATE ai_daily_quotas SET count = 0 WHERE submission_date = CURRENT_DATE.

### Phase 3 — Frontend (Expo)

* Replace placeholder screen app/homework/score/[id].tsx with the actual AI score detail screen. Render overall score out of 10, AI feedback text, improvement suggestions, and criteria breakdown.
* Replace simulated file pickers with expo-image-picker in app/homework/index.tsx and app/homework/[id].tsx.
* Add image optimization helper using expo-image-manipulator:
  * Select image -> crop/compress to 0.35 quality -> resize longest edge to 800px -> convert to grayscale -> convert to Base64.
* Modify studentRepository.ts to direct submission requests to the new Express backend API evaluation endpoint instead of writing directly to Supabase.

### Phase 4 — Payments (Razorpay)

* Create backend endpoint POST /api/payments/recharge/order (touches wallet_transactions):
  * Instantiates Razorpay SDK, calls orders.create, and returns order ID, currency, and amount.
* Integrate Razorpay Standard Checkout in the Expo application:
  * Install razorpay-custom-ui or use standard Webview Checkout wrapper. Collect payment options and capture responses.
* Create backend endpoint POST /api/payments/webhook:
  * Validates HMAC hex digest signature using the Razorpay webhook secret and the raw request body.
  * If valid, extract order metadata and run atomic database transaction:
    * Query student_id or school_wallet_id related to order.
    * Add amount_paisa to student_wallets or school_wallets balance.
    * Insert positive credit row in wallet_transactions recording transaction_type = 'AI_RECHARGE'.

---

## 5. Anomalies & Ambiguities Found

The following inconsistencies and potential risks were identified during the codebase audit:

* Direct Client-Side Gemini Risk: The test script src/gemini_flash.ts instantiates the GoogleGenAI client directly. If this logic is ported directly to the client mobile application, it would expose the API key to users. All AI evaluation calls must route through the Node.js backend.
* Hardcoded API Keys: The file src/gemini_flash.ts contains a hardcoded developer API key. All keys must be loaded from environment variables (.env).
* Incorrect Gemini Model: The specification document references "gemini-3.1-flash-lite", which does not exist. The correct identifier is "gemini-2.5-flash-lite". Additionally, src/gemini_flash.ts references "gemini-3.5-flash", which is also incorrect.
* Non-Append-Only Transaction Table: The database table wallet_transactions currently includes updated_at and deleted_at columns. This violates the audit logging requirement that transactions must be strictly immutable and append-only.
* Mismatched Deduction Constraint: The database table wallet_transactions contains a check constraint check_positive_amount CHECK (amount_paisa > 0). This prevents recording negative values, which makes recording deductions (e.g. -10 paisa for AI evaluation) fail at the database level.
* Missing Webhook Enforcement: The payment integration must enforce updates exclusively via secure signature-verified webhooks. The frontend must not directly update balances upon successful checkout callback, as this is prone to client tampering.
* Non-Existent Tables Reference: The specification references a "homework_questions" table, which is not present in the database. Margam models assignment questions directly inside the "homework" table using description and file_url columns.
* Inflexible Quota Gating: Daily quota enforcement is currently handled by a database trigger checking hardcoded limits based on the students.plan_tier column. This should be refactored to read plan_limit from a dynamic database field on the quota table, allowing plan limit modifications without database migration changes.

---

## 6. Pricing Model Alignment Check

The pricing tiers shown in the plan screenshots are defined as follows:
* Free: ₹0/month — 0 daily evaluations (AI homework features disabled).
* Standard: ₹35/student/month — up to 6 daily AI evaluations.
* Pro: ₹50/student/month — up to 10 daily AI evaluations.

### Plan Gating Logic Check

* Codebase Status: 🟡 Partial
* Check Details:
  * The database contains a trigger enforce_scan_limits() that checks the student's plan_tier on student_daily_usage updates. It correctly restricts Standard students to 6 uploads and Pro students to 10.
  * However, there is no application-layer logic in the Node.js backend or Expo frontend that is aware of these plans or communicates active plan limits.
  * The plan_limit column requested by the spec in the daily quota table is completely missing because the table does not exist. Limits are hardcoded inside the database trigger rather than being dynamically read from a plan/subscription configuration.
