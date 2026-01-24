-- Fix: The RETURNING clause cannot reference the arr alias from the FROM clause
-- Solution: Use a CTE to track row indices separately

CREATE OR REPLACE FUNCTION public.bulk_insert_questions(p_questions jsonb)
 RETURNS TABLE(inserted_id uuid, row_index integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  v_user_id := auth.uid();

  -- Use a CTE to capture row index before INSERT
  RETURN QUERY
  WITH numbered_questions AS (
    SELECT 
      (q->>'question_text')::text AS question_text,
      (q->'options')::jsonb AS options,
      (q->>'correct_option')::integer AS correct_option,
      (q->>'difficulty')::question_difficulty AS difficulty,
      (q->>'question_type')::question_type AS question_type,
      (q->>'usage_mode')::question_usage_mode AS usage_mode,
      (q->>'expected_answer_guidance')::text AS expected_answer_guidance,
      (q->>'speciality_id')::uuid AS speciality_id,
      idx::integer AS row_idx
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS arr(q, idx)
  ),
  inserted AS (
    INSERT INTO question_bank (
      question_text, 
      options, 
      correct_option, 
      difficulty, 
      question_type, 
      usage_mode, 
      expected_answer_guidance, 
      speciality_id, 
      is_active, 
      created_by
    )
    SELECT 
      nq.question_text,
      nq.options,
      nq.correct_option,
      nq.difficulty,
      nq.question_type,
      nq.usage_mode,
      nq.expected_answer_guidance,
      nq.speciality_id,
      true,
      v_user_id
    FROM numbered_questions nq
    ORDER BY nq.row_idx
    RETURNING id
  )
  SELECT ins.id, row_number() OVER ()::integer
  FROM inserted ins;
END;
$function$;