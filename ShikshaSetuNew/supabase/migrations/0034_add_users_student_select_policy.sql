-- Migration: 0034_add_users_student_select_policy.sql
-- ------------------------------------------------------------
-- Add SELECT policy for students on users table
-- ------------------------------------------------------------

BEGIN;

DROP POLICY IF EXISTS users_student_select ON users;

CREATE POLICY users_student_select ON users
FOR SELECT
TO public
USING (
  is_student()
  AND institution_id = auth_institution_id()
);

COMMIT;
