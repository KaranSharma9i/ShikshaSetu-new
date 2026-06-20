-- Migration: 0046_undo_promotion_batch_rpc.sql
-- Create database function (RPC) to support undoing student promotions in a single transaction.
-- Also creates a helper to list promotion batches with their student counts and status.

BEGIN;

-- 1. Function to undo a promotion batch with safety checks
CREATE OR REPLACE FUNCTION undo_promotion_batch_transaction(
  p_batch_id UUID,
  p_undone_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_from_academic_year_id UUID;
  v_to_academic_year_id UUID;
  v_is_undone BOOLEAN;
  v_attendance_count INTEGER;
  v_exam_results_count INTEGER;
  v_record RECORD;
BEGIN
  -- A. Retrieve batch details
  SELECT from_academic_year_id, to_academic_year_id, is_undone
  INTO v_from_academic_year_id, v_to_academic_year_id, v_is_undone
  FROM public.promotion_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion batch not found.');
  END IF;

  IF v_is_undone THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promotion batch has already been undone.');
  END IF;

  -- B. Check for dependent student attendance in the target academic year
  SELECT COUNT(*)::INTEGER INTO v_attendance_count
  FROM public.student_attendance sa
  JOIN public.promotion_records pr ON pr.student_id = sa.student_id
  WHERE pr.promotion_batch_id = p_batch_id
    AND sa.academic_year_id = v_to_academic_year_id
    AND sa.deleted_at IS NULL;

  IF v_attendance_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot undo promotion: attendance has already been recorded for ' || v_attendance_count || ' student(s) in their new class.'
    );
  END IF;

  -- C. Check for dependent exam results in the target academic year
  SELECT COUNT(*)::INTEGER INTO v_exam_results_count
  FROM public.exam_results er
  JOIN public.exams e ON er.exam_id = e.id
  JOIN public.promotion_records pr ON pr.student_id = er.student_id
  WHERE pr.promotion_batch_id = p_batch_id
    AND e.academic_year_id = v_to_academic_year_id
    AND er.deleted_at IS NULL
    AND e.deleted_at IS NULL;

  IF v_exam_results_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot undo promotion: exam results have already been recorded for ' || v_exam_results_count || ' student(s) in their new class.'
    );
  END IF;

  -- D. Loop through records and revert outcomes
  FOR v_record IN
    SELECT id, student_id, outcome, old_enrollment_id, new_enrollment_id
    FROM public.promotion_records
    WHERE promotion_batch_id = p_batch_id
  LOOP
    -- 1. Reactivate the old enrollment
    UPDATE public.enrollments
    SET is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_record.old_enrollment_id;

    -- 2. Clean up target enrollments and electives if they exist
    IF v_record.new_enrollment_id IS NOT NULL THEN
      -- Delete student electives for the target year
      DELETE FROM public.student_electives
      WHERE student_id = v_record.student_id
        AND academic_year_id = v_to_academic_year_id;

      -- Set new_enrollment_id to NULL on the record first (to avoid ON DELETE RESTRICT constraint)
      UPDATE public.promotion_records
      SET new_enrollment_id = NULL
      WHERE id = v_record.id;

      -- Delete the new enrollment
      DELETE FROM public.enrollments
      WHERE id = v_record.new_enrollment_id;
    END IF;

    -- 3. Revert student & user status back to active for WITHDRAWN/GRADUATED outcomes
    IF v_record.outcome IN ('WITHDRAWN', 'GRADUATED') THEN
      UPDATE public.students
      SET status = 'ACTIVE',
          updated_at = NOW()
      WHERE id = v_record.student_id;

      UPDATE public.users
      SET status = 'active',
          updated_at = NOW()
      WHERE id = (SELECT user_id FROM public.students WHERE id = v_record.student_id);
    END IF;
  END LOOP;

  -- E. Mark the batch itself as undone
  UPDATE public.promotion_batches
  SET is_undone = TRUE,
      undone_at = NOW(),
      undone_by = p_undone_by
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to fetch promotion batch history
CREATE OR REPLACE FUNCTION get_promotion_batches_list(p_institution_id UUID)
RETURNS TABLE (
  id UUID,
  performed_at TIMESTAMPTZ,
  is_undone BOOLEAN,
  undone_at TIMESTAMPTZ,
  from_year_label TEXT,
  to_year_label TEXT,
  performer_name TEXT,
  undone_performer_name TEXT,
  student_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id,
    pb.performed_at,
    pb.is_undone,
    pb.undone_at,
    ay1.label::TEXT AS from_year_label,
    ay2.label::TEXT AS to_year_label,
    u1.full_name::TEXT AS performer_name,
    u2.full_name::TEXT AS undone_performer_name,
    COUNT(pr.id) AS student_count
  FROM public.promotion_batches pb
  JOIN public.academic_years ay1 ON pb.from_academic_year_id = ay1.id
  JOIN public.academic_years ay2 ON pb.to_academic_year_id = ay2.id
  JOIN public.users u1 ON pb.performed_by = u1.id
  LEFT JOIN public.users u2 ON pb.undone_by = u2.id
  LEFT JOIN public.promotion_records pr ON pr.promotion_batch_id = pb.id
  WHERE pb.institution_id = p_institution_id
  GROUP BY pb.id, ay1.label, ay2.label, u1.full_name, u2.full_name
  ORDER BY pb.performed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
