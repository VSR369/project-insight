-- Fix: Correct enum type casting in bulk_insert_questions RPC
-- This resolves the error: "column 'difficulty' is of type question_difficulty but expression is of type text"

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

  RETURN QUERY
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
    (q->>'question_text')::text,
    (q->'options')::jsonb,
    (q->>'correct_option')::integer,
    -- FIX: Cast to proper enum types instead of text
    (q->>'difficulty')::question_difficulty,
    (q->>'question_type')::question_type,
    (q->>'usage_mode')::question_usage_mode,
    (q->>'expected_answer_guidance')::text,
    (q->>'speciality_id')::uuid,
    true,
    v_user_id
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS arr(q, idx)
  RETURNING id AS inserted_id, arr.idx::integer AS row_index;
END;
$function$;