CREATE OR REPLACE FUNCTION public.freeze_for_legal_review(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_hash TEXT;
  v_hash_input TEXT;
BEGIN
  SELECT id, current_phase, curation_lock_status, title,
         problem_statement, scope, hook, ip_model, evaluation_criteria
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.current_phase IS DISTINCT FROM 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge must be in Phase 2 (Curation)');
  END IF;

  IF v_challenge.curation_lock_status = 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is already frozen');
  END IF;

  v_hash_input := COALESCE(v_challenge.title, '') || '|' ||
                   COALESCE(v_challenge.problem_statement, '') || '|' ||
                   COALESCE(v_challenge.scope, '') || '|' ||
                   COALESCE(v_challenge.hook, '') || '|' ||
                   COALESCE(v_challenge.ip_model, '') || '|' ||
                   COALESCE(v_challenge.evaluation_criteria::text, '');

  v_hash := encode(extensions.digest(v_hash_input::bytea, 'sha256'::text), 'hex');

  UPDATE public.challenges
  SET curation_lock_status = 'FROZEN',
      curation_frozen_at = NOW(),
      curation_frozen_by = p_user_id,
      legal_review_content_hash = v_hash,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CURATION_FROZEN', 'RPC', p_user_id, p_challenge_id,
    jsonb_build_object('content_hash', v_hash, 'frozen_at', NOW()::text)
  );

  RETURN jsonb_build_object('success', true, 'content_hash', v_hash);
END;
$function$;