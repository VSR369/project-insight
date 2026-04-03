
-- Must drop first due to parameter name changes
DROP FUNCTION IF EXISTS public.complete_phase(UUID, UUID);

CREATE OR REPLACE FUNCTION public.complete_phase(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase INTEGER;
  v_phase_status TEXT;
  v_required_role TEXT;
  v_can_perform BOOLEAN;
  v_next_phase INTEGER;
  v_next_required_role TEXT;
  v_same_actor BOOLEAN;
  v_recursive_result JSONB;
  v_auto_completed INTEGER[] := '{}';
  v_gov_mode TEXT;
  v_lc_complete BOOLEAN;
  v_fc_complete BOOLEAN;
  v_legal_doc_mode TEXT;
  v_escrow_mode TEXT;
BEGIN
  -- Step 1: Get current phase, status, and governance context
  SELECT current_phase, phase_status,
         COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'),
         lc_compliance_complete, fc_compliance_complete
  INTO v_current_phase, v_phase_status, v_gov_mode, v_lc_complete, v_fc_complete
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN
    RAISE EXCEPTION 'Challenge not found.';
  END IF;

  IF v_phase_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'Phase is not active.';
  END IF;

  -- Step 2: Permission check
  SELECT public.get_phase_required_role(v_current_phase) INTO v_required_role;
  SELECT public.can_perform(p_user_id, p_challenge_id, v_required_role) INTO v_can_perform;

  IF v_can_perform IS NOT TRUE THEN
    RAISE EXCEPTION 'You do not have permission for this phase.';
  END IF;

  -- Step 2.5: COMPLIANCE GATE for Phase 2→3
  IF v_current_phase = 2 THEN
    IF NOT COALESCE(v_lc_complete, false) OR NOT COALESCE(v_fc_complete, false) THEN
      RAISE EXCEPTION 'Compliance gate failed: lc_complete=%, fc_complete=%', v_lc_complete, v_fc_complete;
    END IF;
  END IF;

  -- Step 3: Mark current phase as completed
  UPDATE public.challenges
  SET phase_status = 'COMPLETED',
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  -- Step 4: Audit trail
  INSERT INTO public.audit_trail (
    challenge_id, user_id, action, method, phase_from, phase_to
  ) VALUES (
    p_challenge_id, p_user_id, 'PHASE_COMPLETED', 'HUMAN', v_current_phase, v_current_phase
  );

  -- Step 5: Complete any active SLA timer
  UPDATE public.sla_timers
  SET status = 'COMPLETED',
      completed_at = NOW()
  WHERE challenge_id = p_challenge_id
    AND phase = v_current_phase
    AND status = 'ACTIVE';

  -- Step 6: Linear 10-phase progression
  v_next_phase := CASE v_current_phase
    WHEN 1  THEN 2
    WHEN 2  THEN 3
    WHEN 3  THEN 4
    WHEN 4  THEN 5
    WHEN 5  THEN 6
    WHEN 6  THEN 7
    WHEN 7  THEN 8
    WHEN 8  THEN 9
    WHEN 9  THEN 10
    WHEN 10 THEN NULL
    ELSE NULL
  END;

  -- Lifecycle complete
  IF v_next_phase IS NULL THEN
    UPDATE public.challenges
    SET master_status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, phase_from, phase_to, details
    ) VALUES (
      p_challenge_id, p_user_id, 'CHALLENGE_COMPLETED', 'SYSTEM',
      v_current_phase, NULL, '{"reason":"All phases completed"}'::jsonb
    );

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', true,
      'final_phase', v_current_phase,
      'phases_auto_completed', to_jsonb(v_auto_completed)
    );
  END IF;

  -- Step 7: On advance TO Phase 2 — auto-set compliance flags from governance config
  IF v_next_phase = 2 THEN
    SELECT legal_doc_mode, escrow_mode
    INTO v_legal_doc_mode, v_escrow_mode
    FROM public.md_governance_mode_config
    WHERE governance_mode = v_gov_mode AND is_active = true
    LIMIT 1;

    IF v_legal_doc_mode = 'auto_apply' THEN
      UPDATE public.challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
    IF v_escrow_mode = 'not_applicable' THEN
      UPDATE public.challenges SET fc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
  END IF;

  -- Step 8: Get required role for next phase
  SELECT public.get_phase_required_role(v_next_phase) INTO v_next_required_role;

  -- Step 9: Solver-initiated phase (no seeker role required)
  IF v_next_required_role IS NULL THEN
    UPDATE public.challenges
    SET current_phase = v_next_phase,
        phase_status = 'ACTIVE',
        master_status = 'ACTIVE',
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, phase_from, phase_to
    ) VALUES (
      p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase
    );

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', false,
      'current_phase', v_next_phase,
      'waiting_for', 'Solver submissions',
      'phases_auto_completed', to_jsonb(v_auto_completed)
    );
  END IF;

  -- Step 10: Same-actor recursive auto-complete
  SELECT public.can_perform(p_user_id, p_challenge_id, v_next_required_role) INTO v_same_actor;

  -- Advance to next phase
  UPDATE public.challenges
  SET current_phase = v_next_phase,
      phase_status = 'ACTIVE',
      master_status = CASE WHEN v_next_phase >= 4 THEN 'ACTIVE' ELSE master_status END,
      published_at = CASE WHEN v_next_phase >= 4 THEN COALESCE(published_at, NOW()) ELSE published_at END,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (
    challenge_id, user_id, action, method, phase_from, phase_to
  ) VALUES (
    p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase
  );

  -- If same actor can perform next phase, auto-complete recursively
  IF v_same_actor THEN
    v_auto_completed := v_auto_completed || v_next_phase;

    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);

    -- Merge auto-completed phases
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(elem::integer)
      INTO v_auto_completed
      FROM (
        SELECT unnest(v_auto_completed) AS elem
        UNION
        SELECT jsonb_array_elements_text(v_recursive_result->'phases_auto_completed')::integer
      ) sub;
    END IF;

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::integer, v_next_phase),
      'phases_auto_completed', to_jsonb(v_auto_completed)
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', true,
    'lifecycle_complete', false,
    'current_phase', v_next_phase,
    'phases_auto_completed', to_jsonb(v_auto_completed)
  );
END;
$$;
