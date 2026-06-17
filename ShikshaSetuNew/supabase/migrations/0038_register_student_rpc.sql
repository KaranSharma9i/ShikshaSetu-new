-- Migration: 0038_register_student_rpc.sql
-- Create database function (RPC) for atomic student registration transaction

CREATE OR REPLACE FUNCTION register_student_transaction(
  p_auth_user_id UUID,
  p_institution_id UUID,
  p_student_code VARCHAR,
  p_name TEXT,
  p_email TEXT,
  p_guardian_name TEXT,
  p_guardian_phone TEXT,
  p_guardian_email TEXT,
  p_gender TEXT,
  p_date_of_birth DATE,
  p_address TEXT,
  p_grade TEXT,
  p_section TEXT,
  p_transport TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_student_id UUID;
  v_ay_id UUID;
  v_class_id UUID;
  v_section_id UUID;
  v_roll_number VARCHAR;
  v_class_code VARCHAR;
  v_next_num INTEGER;
  v_is_pre_primary BOOLEAN;
  v_gender_enum gender_type;
  v_route_id UUID;
  v_vehicle_id UUID;
  v_result JSONB;
BEGIN
  -- Safe casting for gender enum
  BEGIN
    v_gender_enum := lower(p_gender)::gender_type;
  EXCEPTION WHEN OTHERS THEN
    v_gender_enum := 'prefer_not_to_say'::gender_type;
  END;

  -- 1. Insert user profile into public.users
  INSERT INTO public.users (
    id,
    institution_id,
    role,
    login_id,
    full_name,
    email,
    phone,
    status
  ) VALUES (
    p_auth_user_id,
    p_institution_id,
    'student',
    p_student_code,
    p_name,
    p_email,
    p_guardian_phone,
    'active'
  ) RETURNING id INTO v_user_id;

  -- 2. Insert student details into public.students
  INSERT INTO public.students (
    user_id,
    institution_id,
    student_code,
    date_of_birth,
    gender,
    guardian_name,
    guardian_phone,
    guardian_email,
    blood_group,
    address,
    admission_date
  ) VALUES (
    v_user_id,
    p_institution_id,
    p_student_code,
    p_date_of_birth,
    v_gender_enum,
    p_guardian_name,
    p_guardian_phone,
    p_guardian_email,
    'O+',
    p_address,
    CURRENT_DATE
  ) RETURNING id INTO v_student_id;

  -- 3. Query current active academic year
  SELECT id INTO v_ay_id 
  FROM public.academic_years 
  WHERE institution_id = p_institution_id 
    AND is_current = true 
  LIMIT 1;

  -- 4. Query matching class
  SELECT id INTO v_class_id 
  FROM public.classes 
  WHERE institution_id = p_institution_id 
    AND name = p_grade 
  LIMIT 1;

  IF v_class_id IS NULL THEN
    SELECT id INTO v_class_id 
    FROM public.classes 
    WHERE institution_id = p_institution_id 
      AND name = regexp_replace(p_grade, '^(Grade|Class)\s+', '', 'i') 
    LIMIT 1;
  END IF;

  -- 5. Query section for class
  IF v_class_id IS NOT NULL AND v_ay_id IS NOT NULL THEN
    SELECT id INTO v_section_id 
    FROM public.sections 
    WHERE class_id = v_class_id 
      AND academic_year_id = v_ay_id 
      AND name = p_section 
    LIMIT 1;
  END IF;

  -- 6. Insert enrollment if section was resolved
  IF v_section_id IS NOT NULL AND v_ay_id IS NOT NULL THEN
    BEGIN
      -- Extract next number from student code (e.g. GS-STU-0012 -> 12)
      v_next_num := NULLIF(regexp_replace(p_student_code, '^[^-]+-[^-]+-', ''), '')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_next_num := 1;
    END;
    IF v_next_num IS NULL THEN
      v_next_num := 1;
    END IF;

    v_class_code := replace(p_grade, 'Grade ', '');
    v_is_pre_primary := v_class_code IN ('Nursery', 'LKG', 'UKG');
    
    IF v_is_pre_primary THEN
      v_roll_number := v_class_code || '-' || p_section || '-' || LPAD((v_next_num % 60)::text, 2, '0');
    ELSE
      v_roll_number := v_class_code || p_section || '-' || LPAD((v_next_num % 60)::text, 2, '0');
    END IF;

    INSERT INTO public.enrollments (
      student_id,
      section_id,
      academic_year_id,
      roll_number,
      enrolled_on,
      is_active
    ) VALUES (
      v_student_id,
      v_section_id,
      v_ay_id,
      v_roll_number,
      CURRENT_DATE,
      true
    );
  END IF;

  -- 7. Insert transport assignment if School Shuttle
  IF p_transport = 'School Shuttle' THEN
    -- Resolve first route for the institution (since route_id is NOT NULL)
    SELECT id INTO v_route_id 
    FROM public.transport_routes 
    WHERE institution_id = p_institution_id 
    LIMIT 1;

    IF v_route_id IS NOT NULL THEN
      -- Resolve first vehicle matching the route
      SELECT id INTO v_vehicle_id 
      FROM public.transport_vehicles 
      WHERE route_id = v_route_id 
      LIMIT 1;

      INSERT INTO public.student_transport_assignments (
        student_id,
        route_id,
        vehicle_id,
        start_date
      ) VALUES (
        v_student_id,
        v_route_id,
        v_vehicle_id,
        CURRENT_DATE
      );
    END IF;
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'portalId', p_student_code,
    'fullName', p_name,
    'status', 'Active'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
