-- Create function to delete questions by speciality IDs
-- This runs server-side, avoiding PostgREST URL length limits
CREATE OR REPLACE FUNCTION public.delete_questions_by_specialities(p_speciality_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_question_ids UUID[];
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  -- Get question IDs to delete
  SELECT ARRAY_AGG(id) INTO v_question_ids
  FROM question_bank
  WHERE speciality_id = ANY(p_speciality_ids);

  IF v_question_ids IS NULL OR array_length(v_question_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete capability tags first (foreign key constraint)
  DELETE FROM question_capability_tags
  WHERE question_id = ANY(v_question_ids);

  -- Delete questions
  DELETE FROM question_bank
  WHERE id = ANY(v_question_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;