-- WARNING: service_role key bypasses all RLS policies by design.
-- All backend calls using service_role must enforce institution_id
-- scoping at the application layer. Do not rely on RLS for service_role paths.

-- Section: BLOCK 0 — SECURITY DEFINER HELPER FUNCTION

CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'student'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_institution_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM public.users
  WHERE id = auth.uid();
$$;


-- Section: BLOCK 1 — students TABLE

DO $$ BEGIN
  CREATE POLICY billing_students_admin_update_tier
    ON public.students
    FOR UPDATE
    TO authenticated
    USING (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    )
    WITH CHECK (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_students_self_select_tier
    ON public.students
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Section: BLOCK 2 — student_wallets TABLE

ALTER TABLE public.student_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY billing_wallets_admin_select
    ON public.student_wallets
    FOR SELECT
    TO authenticated
    USING (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallets_admin_insert
    ON public.student_wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallets_admin_update
    ON public.student_wallets
    FOR UPDATE
    TO authenticated
    USING (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    )
    WITH CHECK (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'institution_admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallets_teacher_select
    ON public.student_wallets
    FOR SELECT
    TO authenticated
    USING (
      institution_id = (
        SELECT institution_id FROM public.users
        WHERE id = auth.uid() AND role = 'teacher'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallets_student_select
    ON public.student_wallets
    FOR SELECT
    TO authenticated
    USING (
      student_id = public.get_current_student_id()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Section: BLOCK 3 — wallet_transactions TABLE

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY billing_wallet_tx_admin_select
    ON public.wallet_transactions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.student_wallets w
        WHERE w.id = student_wallet_id
        AND w.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallet_tx_admin_insert
    ON public.wallet_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.student_wallets w
        WHERE w.id = student_wallet_id
        AND w.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_wallet_tx_teacher_select
    ON public.wallet_transactions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.student_wallets w
        WHERE w.id = student_wallet_id
        AND w.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'teacher'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Section: BLOCK 4 — student_daily_usage TABLE

ALTER TABLE public.student_daily_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_admin_select
    ON public.student_daily_usage
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
        AND s.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_admin_insert
    ON public.student_daily_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
        AND s.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_admin_update
    ON public.student_daily_usage
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
        AND s.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
        AND s.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'institution_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_teacher_select
    ON public.student_daily_usage
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
        AND s.institution_id = (
          SELECT institution_id FROM public.users
          WHERE id = auth.uid() AND role = 'teacher'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_student_select
    ON public.student_daily_usage
    FOR SELECT
    TO authenticated
    USING (
      student_id = public.get_current_student_id()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_student_update
    ON public.student_daily_usage
    FOR UPDATE
    TO authenticated
    USING (
      student_id = public.get_current_student_id()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    )
    WITH CHECK (
      student_id = public.get_current_student_id()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY billing_daily_usage_student_insert
    ON public.student_daily_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (
      student_id = public.get_current_student_id()
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
