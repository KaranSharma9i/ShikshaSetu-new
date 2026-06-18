-- Migration: 0039_register_teacher_rpc.sql
-- Create database function (RPC) for atomic teacher registration transaction

CREATE OR REPLACE FUNCTION register_teacher_transaction(
  p_auth_user_id UUID,
  p_institution_id UUID,
  p_employee_code VARCHAR,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_gender TEXT,
  p_date_of_birth DATE,
  p_qualification TEXT,
  p_specialization TEXT,
  p_date_of_joining DATE,
  p_address TEXT,
  p_emergency_contact TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_teacher_id UUID;
  v_gender_enum gender_type;
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
    'teacher',
    p_employee_code,
    p_name,
    p_email,
    p_phone,
    'active'
  ) RETURNING id INTO v_user_id;

  -- 2. Insert teacher details into public.teachers
  INSERT INTO public.teachers (
    user_id,
    institution_id,
    employee_code,
    date_of_birth,
    gender,
    qualification,
    specialization,
    date_of_joining,
    address,
    emergency_contact
  ) VALUES (
    v_user_id,
    p_institution_id,
    p_employee_code,
    p_date_of_birth,
    v_gender_enum,
    p_qualification,
    p_specialization,
    p_date_of_joining,
    p_address,
    p_emergency_contact
  ) RETURNING id INTO v_teacher_id;

  -- Build final result
  v_result := jsonb_build_object(
    'portalId', p_employee_code,
    'fullName', p_name,
    'status', 'Active'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
