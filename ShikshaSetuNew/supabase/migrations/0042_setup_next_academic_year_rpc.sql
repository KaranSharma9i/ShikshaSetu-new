-- Migration: 0042_setup_next_academic_year_rpc.sql
-- Create database function (RPC) to atomically set up a new academic year and clone structure

CREATE OR REPLACE FUNCTION setup_next_academic_year(
  p_institution_id UUID,
  p_label VARCHAR,
  p_starts_on DATE,
  p_ends_on DATE,
  p_from_academic_year_id UUID
)
RETURNS TABLE (
  new_academic_year_id UUID,
  sections_cloned INTEGER,
  subjects_cloned INTEGER
) AS $$
DECLARE
  v_new_year_id UUID;
  v_sec_row RECORD;
  v_cs_row RECORD;
  v_new_section_id UUID;
  v_sections_count INTEGER := 0;
  v_subjects_count INTEGER := 0;
BEGIN
  -- 1. Insert new academic year
  INSERT INTO public.academic_years (
    institution_id,
    label,
    starts_on,
    ends_on,
    is_current
  ) VALUES (
    p_institution_id,
    p_label,
    p_starts_on,
    p_ends_on,
    FALSE -- Do NOT set is_current = true automatically
  )
  RETURNING id INTO v_new_year_id;

  -- 2. Clone sections and subject assignments if source academic year is provided
  IF p_from_academic_year_id IS NOT NULL THEN
    FOR v_sec_row IN
      SELECT s.id AS old_section_id, s.class_id, s.name, s.capacity, s.class_teacher_id
      FROM public.sections s
      JOIN public.classes c ON s.class_id = c.id
      WHERE c.institution_id = p_institution_id
        AND s.academic_year_id = p_from_academic_year_id
        AND s.deleted_at IS NULL
    LOOP
      -- Insert cloned section linked to new academic year
      INSERT INTO public.sections (
        class_id,
        academic_year_id,
        name,
        capacity,
        class_teacher_id
      ) VALUES (
        v_sec_row.class_id,
        v_new_year_id,
        v_sec_row.name,
        v_sec_row.capacity,
        v_sec_row.class_teacher_id
      )
      RETURNING id INTO v_new_section_id;

      v_sections_count := v_sections_count + 1;

      -- Clone class subjects for this section
      FOR v_cs_row IN
        SELECT cs.subject_id, cs.teacher_id, cs.max_marks
        FROM public.class_subjects cs
        WHERE cs.section_id = v_sec_row.old_section_id
          AND cs.academic_year_id = p_from_academic_year_id
          AND cs.deleted_at IS NULL
    LOOP
      INSERT INTO public.class_subjects (
        section_id,
        subject_id,
        academic_year_id,
        teacher_id,
        max_marks
      ) VALUES (
        v_new_section_id,
        v_cs_row.subject_id,
        v_new_year_id,
        v_cs_row.teacher_id,
        v_cs_row.max_marks
      );

      v_subjects_count := v_subjects_count + 1;
    END LOOP;
  END LOOP;
  END IF;

  RETURN QUERY SELECT v_new_year_id, v_sections_count, v_subjects_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
