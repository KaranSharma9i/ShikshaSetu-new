-- 0025_add_auth_user_trigger.sql
-- Ensure auth schema and auth.users table exist (required for local development compatibility)
-- CREATE SCHEMA IF NOT EXISTS auth;

-- CREATE TABLE IF NOT EXISTS auth.users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   email TEXT UNIQUE,
--   raw_user_meta_data JSONB,
--   created_at TIMESTAMPTZ
-- );


-- Trigger function to update public.users.id when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  inst_id UUID;
  ay_id UUID;
  sec_id UUID;
  student_id UUID;
  existing_user_id UUID;
BEGIN
  -- Check if a public user record with this email already exists
  SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- If it exists, update the ID to match auth user ID
    UPDATE public.users
    SET id = NEW.id
    WHERE email = NEW.email;
  ELSE
    -- If it does not exist, and it's not admin-registered, create a default student profile
    IF (NEW.raw_user_meta_data->>'is_admin_registered') IS NULL OR (NEW.raw_user_meta_data->>'is_admin_registered')::boolean = false THEN
      -- Get default institution
      SELECT id INTO inst_id FROM public.institutions LIMIT 1;
      
      IF inst_id IS NOT NULL THEN
        -- Insert into public.users
        INSERT INTO public.users (id, institution_id, role, login_id, full_name, email, status, password_hash)
        VALUES (
          NEW.id,
          inst_id,
          'student',
          'GS-STU-' || substring(NEW.id::text, 1, 8),
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          NEW.email,
          'active',
          '$2b$10$defaultHashedPassword123456789012345678901234'
        ) ON CONFLICT DO NOTHING;

        -- Insert into public.students
        INSERT INTO public.students (user_id, institution_id, student_code, guardian_name, date_of_birth, gender, blood_group, address, admission_date)
        VALUES (
          NEW.id,
          inst_id,
          'STU-' || substring(NEW.id::text, 1, 8),
          'Parent of ' || COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          '2010-01-01',
          'other',
          'O+',
          'Auraiya, Uttar Pradesh',
          CURRENT_DATE
        ) ON CONFLICT DO NOTHING
        RETURNING id INTO student_id;

        -- Enroll student in the first section of active academic year
        SELECT id INTO ay_id FROM public.academic_years WHERE institution_id = inst_id AND is_current = true LIMIT 1;
        IF ay_id IS NOT NULL THEN
          SELECT id INTO sec_id FROM public.sections WHERE academic_year_id = ay_id LIMIT 1;
          IF sec_id IS NOT NULL AND student_id IS NOT NULL THEN
            INSERT INTO public.enrollments (student_id, section_id, academic_year_id, roll_number, enrolled_on, is_active)
            VALUES (
              student_id,
              sec_id,
              ay_id,
              'ROLL-' || substring(NEW.id::text, 1, 4),
              CURRENT_DATE,
              true
            ) ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger function to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();
