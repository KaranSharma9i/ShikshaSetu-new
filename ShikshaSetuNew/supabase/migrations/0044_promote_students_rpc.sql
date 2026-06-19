-- Migration: 0044_promote_students_rpc.sql
-- Create database function (RPC) to atomically promote students and record audit trails.

BEGIN;

CREATE OR REPLACE FUNCTION promote_students_transaction(
  p_institution_id UUID,
  p_from_academic_year_id UUID,
  p_to_academic_year_id UUID,
  p_performed_by UUID,
  p_promotions JSONB -- Array of { student_id, old_enrollment_id, target_section_id, roll_number, elective_class_subject_ids }
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_promo RECORD;
  v_new_enrollment_id UUID;
  v_elective_id UUID;
BEGIN
  -- 1. Create a promotion batch row
  INSERT INTO public.promotion_batches (
    institution_id,
    from_academic_year_id,
    to_academic_year_id,
    performed_by
  ) VALUES (
    p_institution_id,
    p_from_academic_year_id,
    p_to_academic_year_id,
    p_performed_by
  ) RETURNING id INTO v_batch_id;

  -- 2. Loop through student promotions
  FOR v_promo IN
    SELECT 
      (value->>'student_id')::UUID AS student_id,
      (value->>'old_enrollment_id')::UUID AS old_enrollment_id,
      (value->>'target_section_id')::UUID AS target_section_id,
      (value->>'roll_number')::TEXT AS roll_number,
      value->'elective_class_subject_ids' AS elective_class_subject_ids
    FROM jsonb_array_elements(p_promotions)
  LOOP
    -- A. Deactivate old enrollment
    UPDATE public.enrollments
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = v_promo.old_enrollment_id;

    -- B. Insert new enrollment
    INSERT INTO public.enrollments (
      student_id,
      section_id,
      academic_year_id,
      roll_number,
      is_active
    ) VALUES (
      v_promo.student_id,
      v_promo.target_section_id,
      p_to_academic_year_id,
      v_promo.roll_number,
      TRUE
    ) RETURNING id INTO v_new_enrollment_id;

    -- C. Insert promotion record
    INSERT INTO public.promotion_records (
      promotion_batch_id,
      student_id,
      outcome,
      old_enrollment_id,
      new_enrollment_id
    ) VALUES (
      v_batch_id,
      v_promo.student_id,
      'PROMOTED',
      v_promo.old_enrollment_id,
      v_new_enrollment_id
    );

    -- D. Insert student electives if any
    IF v_promo.elective_class_subject_ids IS NOT NULL AND jsonb_array_length(v_promo.elective_class_subject_ids) > 0 THEN
      FOR v_elective_id IN 
        SELECT (val)::UUID FROM jsonb_array_elements_text(v_promo.elective_class_subject_ids) AS val
      LOOP
        INSERT INTO public.student_electives (
          student_id,
          class_subject_id,
          academic_year_id
        ) VALUES (
          v_promo.student_id,
          v_elective_id,
          p_to_academic_year_id
        ) ON CONFLICT (student_id, class_subject_id) DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
