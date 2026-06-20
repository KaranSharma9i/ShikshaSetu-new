-- Migration: 0045_update_promote_students_rpc.sql
-- Update database function (RPC) to support per-student promotion outcome overrides (PROMOTED, RETAINED, WITHDRAWN, GRADUATED).

BEGIN;

CREATE OR REPLACE FUNCTION promote_students_transaction(
  p_institution_id UUID,
  p_from_academic_year_id UUID,
  p_to_academic_year_id UUID,
  p_performed_by UUID,
  p_promotions JSONB -- Array of { student_id, old_enrollment_id, target_section_id, roll_number, elective_class_subject_ids, outcome }
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_promo RECORD;
  v_new_enrollment_id UUID;
  v_elective_id UUID;
  v_outcome TEXT;
  v_old_section_id UUID;
  v_retained_section_id UUID;
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
      value->'elective_class_subject_ids' AS elective_class_subject_ids,
      COALESCE(value->>'outcome', 'PROMOTED') AS outcome
    FROM jsonb_array_elements(p_promotions)
  LOOP
    v_outcome := v_promo.outcome;

    -- A. Deactivate old enrollment
    UPDATE public.enrollments
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = v_promo.old_enrollment_id;

    -- B. Outcome conditional logic
    IF v_outcome = 'PROMOTED' THEN
      -- Create new enrollment in target section
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

      -- Insert promotion record
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

      -- Insert student electives if any
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

    ELSIF v_outcome = 'RETAINED' THEN
      -- Get old section
      SELECT section_id INTO v_old_section_id FROM public.enrollments WHERE id = v_promo.old_enrollment_id;
      
      -- Find matching section in new academic year
      SELECT s_new.id INTO v_retained_section_id
      FROM public.sections s_new
      JOIN public.sections s_old ON s_new.class_id = s_old.class_id AND s_new.name = s_old.name
      WHERE s_old.id = v_old_section_id
        AND s_new.academic_year_id = p_to_academic_year_id
        AND s_new.deleted_at IS NULL;

      -- Fallback to old section if not cloned (should not happen in correct setups)
      IF v_retained_section_id IS NULL THEN
        v_retained_section_id := v_old_section_id;
      END IF;

      -- Create new enrollment in retained section
      INSERT INTO public.enrollments (
        student_id,
        section_id,
        academic_year_id,
        roll_number,
        is_active
      ) VALUES (
        v_promo.student_id,
        v_retained_section_id,
        p_to_academic_year_id,
        v_promo.roll_number,
        TRUE
      ) RETURNING id INTO v_new_enrollment_id;

      -- Insert promotion record
      INSERT INTO public.promotion_records (
        promotion_batch_id,
        student_id,
        outcome,
        old_enrollment_id,
        new_enrollment_id
      ) VALUES (
        v_batch_id,
        v_promo.student_id,
        'RETAINED',
        v_promo.old_enrollment_id,
        v_new_enrollment_id
      );

      -- Carry forward electives automatically from old academic year to new academic year
      -- (Copies electives belonging to the old section to the cloned section in the target academic year)
      INSERT INTO public.student_electives (student_id, class_subject_id, academic_year_id)
      SELECT
        v_promo.student_id,
        new_cs.id,
        p_to_academic_year_id
      FROM public.student_electives old_se
      JOIN public.class_subjects old_cs ON old_cs.id = old_se.class_subject_id
      JOIN public.class_subjects new_cs ON new_cs.subject_id = old_cs.subject_id
      WHERE old_se.student_id = v_promo.student_id
        AND old_se.academic_year_id = p_from_academic_year_id
        AND new_cs.section_id = v_retained_section_id
        AND new_cs.academic_year_id = p_to_academic_year_id
      ON CONFLICT (student_id, class_subject_id) DO NOTHING;

    ELSIF v_outcome = 'WITHDRAWN' THEN
      -- Set student status to WITHDRAWN
      UPDATE public.students
      SET status = 'WITHDRAWN',
          updated_at = NOW()
      WHERE id = v_promo.student_id;

      -- Set user status to inactive
      UPDATE public.users
      SET status = 'inactive',
          updated_at = NOW()
      WHERE id = (SELECT user_id FROM public.students WHERE id = v_promo.student_id);

      -- Insert promotion record with NULL new_enrollment_id
      INSERT INTO public.promotion_records (
        promotion_batch_id,
        student_id,
        outcome,
        old_enrollment_id,
        new_enrollment_id
      ) VALUES (
        v_batch_id,
        v_promo.student_id,
        'WITHDRAWN',
        v_promo.old_enrollment_id,
        NULL
      );

    ELSIF v_outcome = 'GRADUATED' THEN
      -- Set student status to GRADUATED
      UPDATE public.students
      SET status = 'GRADUATED',
          updated_at = NOW()
      WHERE id = v_promo.student_id;

      -- Set user status to inactive
      UPDATE public.users
      SET status = 'inactive',
          updated_at = NOW()
      WHERE id = (SELECT user_id FROM public.students WHERE id = v_promo.student_id);

      -- Insert promotion record with NULL new_enrollment_id
      INSERT INTO public.promotion_records (
        promotion_batch_id,
        student_id,
        outcome,
        old_enrollment_id,
        new_enrollment_id
      ) VALUES (
        v_batch_id,
        v_promo.student_id,
        'GRADUATED',
        v_promo.old_enrollment_id,
        NULL
      );

    END IF;

  END LOOP;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
