
CREATE OR REPLACE FUNCTION public.send_to_legal_review(
  p_challenge_id uuid,
  p_user_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ch              RECORD;
  v_freeze_result   jsonb;
  v_assemble_result jsonb;
  v_gov_mode        text;
  v_lc_pool         RECORD;
  v_fc_pool         RECORD;
  v_lc_user_id      uuid;
  v_fc_user_id      uuid;
  v_doc_id          uuid;
  v_content_hash    text;
  v_warnings        text[] := ARRAY[]::text[];
BEGIN
  -- Load challenge
  SELECT id, current_phase, curation_lock_status, legal_review_content_hash,
         COALESCE(governance_mode_override, governance_profile, 'QUICK') AS gov_mode
  INTO v_ch
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_ch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  v_gov_mode := v_ch.gov_mode;

  -- 1. Freeze (idempotent)
  IF v_ch.curation_lock_status IS DISTINCT FROM 'FROZEN' THEN
    BEGIN
      v_freeze_result := public.freeze_for_legal_review(p_challenge_id, p_user_id);
      IF NOT COALESCE((v_freeze_result->>'success')::boolean, false) THEN
        RETURN jsonb_build_object('success', false,
          'error', 'Freeze failed: ' || COALESCE(v_freeze_result->>'error', 'unknown'));
      END IF;
      v_content_hash := v_freeze_result->>'content_hash';
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'Freeze exception: ' || SQLERRM);
    END;
  ELSE
    v_content_hash := v_ch.legal_review_content_hash;
  END IF;

  -- 2. Assemble CPA (best-effort, do not block assignment on failure)
  SELECT id INTO v_doc_id
  FROM public.challenge_legal_docs
  WHERE challenge_id = p_challenge_id
    AND is_assembled = true
    AND document_type = 'CPA_' || v_gov_mode
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_doc_id IS NULL THEN
    BEGIN
      v_assemble_result := public.assemble_cpa(p_challenge_id, p_user_id);
      IF COALESCE((v_assemble_result->>'success')::boolean, false) THEN
        v_doc_id := (v_assemble_result->>'doc_id')::uuid;
      ELSE
        v_warnings := v_warnings || ('CPA assembly skipped: ' || COALESCE(v_assemble_result->>'error', 'unknown'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || ('CPA assembly exception: ' || SQLERRM);
    END;
  END IF;

  -- 3. Auto-assign LC
  SELECT user_id INTO v_lc_user_id
  FROM public.user_challenge_roles
  WHERE challenge_id = p_challenge_id AND role_code = 'LC' AND is_active = true
  LIMIT 1;

  IF v_lc_user_id IS NULL THEN
    SELECT id, user_id INTO v_lc_pool
    FROM public.platform_provider_pool
    WHERE is_active = true
      AND user_id IS NOT NULL
      AND 'R9' = ANY(role_codes)
    ORDER BY current_assignments ASC, random()
    LIMIT 1;

    IF v_lc_pool.user_id IS NOT NULL THEN
      INSERT INTO public.user_challenge_roles (
        user_id, challenge_id, role_code, assigned_by,
        assigned_at, is_active, auto_assigned, created_by
      ) VALUES (
        v_lc_pool.user_id, p_challenge_id, 'LC', p_user_id,
        NOW(), true, true, p_user_id
      )
      ON CONFLICT (user_id, challenge_id, role_code)
      DO UPDATE SET is_active = true, revoked_at = NULL,
                    assigned_at = NOW(), updated_at = NOW(), updated_by = p_user_id;

      UPDATE public.platform_provider_pool
      SET current_assignments = current_assignments + 1, updated_at = NOW()
      WHERE id = v_lc_pool.id;

      v_lc_user_id := v_lc_pool.user_id;

      INSERT INTO public.audit_trail (action, method, user_id, challenge_id, details, created_by)
      VALUES (
        'LC_AUTO_ASSIGNED', 'SYSTEM', p_user_id, p_challenge_id,
        jsonb_build_object('lc_user_id', v_lc_user_id, 'pool_member_id', v_lc_pool.id, 'trigger', 'send_to_legal_review'),
        p_user_id
      );
    ELSE
      v_warnings := v_warnings || 'No active R9 (LC) pool member available for assignment';
    END IF;
  END IF;

  -- 4. Auto-assign FC for CONTROLLED only
  IF v_gov_mode = 'CONTROLLED' THEN
    SELECT user_id INTO v_fc_user_id
    FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND role_code = 'FC' AND is_active = true
    LIMIT 1;

    IF v_fc_user_id IS NULL THEN
      SELECT id, user_id INTO v_fc_pool
      FROM public.platform_provider_pool
      WHERE is_active = true
        AND user_id IS NOT NULL
        AND 'R8' = ANY(role_codes)
      ORDER BY current_assignments ASC, random()
      LIMIT 1;

      IF v_fc_pool.user_id IS NOT NULL THEN
        INSERT INTO public.user_challenge_roles (
          user_id, challenge_id, role_code, assigned_by,
          assigned_at, is_active, auto_assigned, created_by
        ) VALUES (
          v_fc_pool.user_id, p_challenge_id, 'FC', p_user_id,
          NOW(), true, true, p_user_id
        )
        ON CONFLICT (user_id, challenge_id, role_code)
        DO UPDATE SET is_active = true, revoked_at = NULL,
                      assigned_at = NOW(), updated_at = NOW(), updated_by = p_user_id;

        UPDATE public.platform_provider_pool
        SET current_assignments = current_assignments + 1, updated_at = NOW()
        WHERE id = v_fc_pool.id;

        v_fc_user_id := v_fc_pool.user_id;

        INSERT INTO public.audit_trail (action, method, user_id, challenge_id, details, created_by)
        VALUES (
          'FC_AUTO_ASSIGNED', 'SYSTEM', p_user_id, p_challenge_id,
          jsonb_build_object('fc_user_id', v_fc_user_id, 'pool_member_id', v_fc_pool.id, 'trigger', 'send_to_legal_review'),
          p_user_id
        );
      ELSE
        v_warnings := v_warnings || 'No active R8 (FC) pool member available for assignment';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'content_hash', v_content_hash,
    'doc_id', v_doc_id,
    'lc_user_id', v_lc_user_id,
    'fc_user_id', v_fc_user_id,
    'governance_mode', v_gov_mode,
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;

-- Re-run backfill
DO $backfill$
DECLARE
  v_ch RECORD;
  v_actor uuid;
BEGIN
  FOR v_ch IN
    SELECT c.id, c.created_by
    FROM public.challenges c
    WHERE c.curation_lock_status = 'FROZEN'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_challenge_roles ucr
        WHERE ucr.challenge_id = c.id
          AND ucr.role_code = 'LC'
          AND ucr.is_active = true
      )
  LOOP
    SELECT user_id INTO v_actor
    FROM public.user_challenge_roles
    WHERE challenge_id = v_ch.id AND role_code = 'CU' AND is_active = true
    LIMIT 1;
    IF v_actor IS NULL THEN
      v_actor := COALESCE(v_ch.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;

    PERFORM public.send_to_legal_review(v_ch.id, v_actor);
  END LOOP;
END;
$backfill$;
