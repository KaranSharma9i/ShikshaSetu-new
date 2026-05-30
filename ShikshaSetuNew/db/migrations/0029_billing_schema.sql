-- Section: BLOCK 1 — ENUM DECLARATIONS

DO $$ BEGIN
  CREATE TYPE plan_tier_type AS ENUM ('FREE', 'STANDARD', 'PRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_tx_type AS ENUM ('MANUAL_ADMIN_RECHARGE', 'PLAN_UPGRADE_DEDUCTION', 'SYSTEM_REFUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Section: BLOCK 2 — ALTER students TABLE

ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS plan_tier plan_tier_type NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Section: BLOCK 3 — CREATE student_wallets

CREATE TABLE IF NOT EXISTS public.student_wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  balance_paisa   BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT unique_student_wallet UNIQUE (student_id),
  CONSTRAINT check_positive_balance CHECK (balance_paisa >= 0)
);

CREATE INDEX IF NOT EXISTS idx_student_wallets_student ON public.student_wallets(student_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_institution ON public.student_wallets(institution_id);

-- Section: BLOCK 4 — CREATE wallet_transactions

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ DEFAULT NULL,
  student_wallet_id    UUID NOT NULL REFERENCES public.student_wallets(id) ON DELETE RESTRICT,
  transaction_type     wallet_tx_type NOT NULL,
  amount_paisa         BIGINT NOT NULL CONSTRAINT check_positive_amount CHECK (amount_paisa > 0),
  balance_after_paisa  BIGINT NOT NULL,
  performed_by         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(student_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_performed_by ON public.wallet_transactions(performed_by);

-- Section: BLOCK 5 — CREATE student_daily_usage

CREATE TABLE IF NOT EXISTS public.student_daily_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  usage_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_counter  INT NOT NULL DEFAULT 0 CONSTRAINT check_nonnegative_counter CHECK (upload_counter >= 0),
  CONSTRAINT unique_student_usage_date UNIQUE (student_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_student_daily_usage_composite ON public.student_daily_usage(student_id, usage_date);

-- Section: BLOCK 6 — TRIGGER FUNCTION

CREATE OR REPLACE FUNCTION public.enforce_scan_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_tier plan_tier_type;
BEGIN
  SELECT plan_tier INTO v_plan_tier
  FROM public.students
  WHERE id = NEW.student_id;

  IF v_plan_tier = 'FREE' THEN
    IF NEW.upload_counter > 0 THEN
      RAISE EXCEPTION 'AI scanning is disabled on the FREE plan.';
    END IF;
  ELSIF v_plan_tier = 'STANDARD' THEN
    IF NEW.upload_counter > 6 THEN
      RAISE EXCEPTION 'Daily upload limit of 6 reached for STANDARD tier.';
    END IF;
  ELSIF v_plan_tier = 'PRO' THEN
    IF NEW.upload_counter > 10 THEN
      RAISE EXCEPTION 'Daily upload limit of 10 reached for PRO tier.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Section: BLOCK 7 — TRIGGER ATTACHMENT

DROP TRIGGER IF EXISTS check_scan_limits ON public.student_daily_usage;
CREATE TRIGGER check_scan_limits
BEFORE INSERT OR UPDATE ON public.student_daily_usage
FOR EACH ROW EXECUTE FUNCTION public.enforce_scan_limits();
