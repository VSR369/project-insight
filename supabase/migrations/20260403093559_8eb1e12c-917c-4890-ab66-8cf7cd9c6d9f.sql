CREATE OR REPLACE FUNCTION public.complete_phase(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_phase INTEGER; v_phase_status TEXT; v_gov_mode TEXT;
  v_phase_config RECORD; v_next_config RECORD;
  v_can_perform BOOLEAN; v_next_phase INTEGER; v_same_actor BOOLEAN;
  v_recursive_result JSONB; v_auto_completed INTEGER[] := '{}';
  v_lc_complete BOOLEAN; v_fc_complete BOOLEAN;
  v_legal_doc_mode TEXT; v_escrow_mode TEXT;
BEGIN
  SELECT current_phase, phase_status,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'),
    lc_compliance_complete, fc_compliance_complete
  INTO v_current_phase, v_phase_status, v_gov_mode, v_lc_complete, v_fc_complete
  FROM public.challenges WHERE id = p_challenge_id;
  IF v_current_phase IS NULL THEN RAISE EXCEPTION 'Challenge not found.'; END IF;
  IF v_phase_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Phase not active.'; END IF;

  SELECT * INTO v_phase_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_current_phase AND is_active = true;

  IF v_phase_config.required_role IS NOT NULL THEN
    SELECT public.can_perform(p_user_id, p_challenge_id, v_phase_config.required_role) INTO v_can_perform;
    IF v_can_perform IS NOT TRUE THEN
      RAISE EXCEPTION 'Permission denied for phase % (requires %).', v_current_phase, v_phase_config.required_role;
    END IF;
  END IF;

  IF v_phase_config.gate_flags IS NOT NULL AND array_length(v_phase_config.gate_flags, 1) > 0 THEN
    SELECT lc_compliance_complete, fc_compliance_complete INTO v_lc_complete, v_fc_complete
    FROM public.challenges WHERE id = p_challenge_id;
    IF 'lc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_lc_complete, false) THEN
      RAISE EXCEPTION 'Gate: lc_compliance_complete = false'; END IF;
    IF 'fc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_fc_complete, false) THEN
      RAISE EXCEPTION 'Gate: fc_compliance_complete = false'; END IF;
  END IF;

  UPDATE public.challenges SET phase_status = 'COMPLETED', updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details)
  VALUES (p_challenge_id, p_user_id, 'PHASE_COMPLETED', 'HUMAN', v_current_phase, v_current_phase,
    jsonb_build_object('phase_name', v_phase_config.phase_name, 'governance_mode', v_gov_mode));
  UPDATE public.sla_timers SET status = 'COMPLETED', completed_at = NOW()
  WHERE challenge_id = p_challenge_id AND phase = v_current_phase AND status = 'ACTIVE';

  v_next_phase := CASE WHEN v_current_phase < 10 THEN v_current_phase + 1 ELSE NULL END;
  IF v_next_phase IS NULL THEN
    UPDATE public.challenges SET master_status = 'COMPLETED', completed_at = NOW(), updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
    RETURN jsonb_build_object('completed', true, 'lifecycle_complete', true, 'final_phase', v_current_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  SELECT * INTO v_next_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_next_phase AND is_active = true;

  -- FIX: Check for compliance gate_flags instead of specific phase_type.
  -- This ensures QUICK mode (seeker_auto) also auto-sets compliance flags.
  IF v_next_config.gate_flags IS NOT NULL AND array_length(v_next_config.gate_flags, 1) > 0 THEN
    SELECT legal_doc_mode, escrow_mode INTO v_legal_doc_mode, v_escrow_mode
    FROM public.md_governance_mode_config WHERE governance_mode = v_gov_mode AND is_active = true LIMIT 1;
    IF v_legal_doc_mode = 'auto_apply' THEN
      UPDATE public.challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
    IF v_escrow_mode IN ('not_applicable', 'optional') THEN
      UPDATE public.challenges SET fc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
  END IF;

  UPDATE public.challenges SET current_phase = v_next_phase, phase_status = 'ACTIVE',
    master_status = CASE WHEN v_next_phase >= 4 THEN 'ACTIVE' ELSE master_status END,
    published_at = CASE WHEN v_next_phase = 4 THEN COALESCE(published_at, NOW()) ELSE published_at END,
    updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
  VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase);

  IF v_next_config.required_role IS NULL OR v_next_config.auto_complete THEN
    IF v_next_config.phase_type = 'solver_action' THEN
      RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false, 'current_phase', v_next_phase,
        'waiting_for', 'Solver submissions', 'phases_auto_completed', to_jsonb(v_auto_completed));
    END IF;
    v_auto_completed := v_auto_completed || v_next_phase;
    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(elem::integer) INTO v_auto_completed
      FROM (SELECT unnest(v_auto_completed) AS elem UNION
            SELECT jsonb_array_elements_text(v_recursive_result->'phases_auto_completed')::integer) sub;
    END IF;
    RETURN jsonb_build_object('completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::integer, v_next_phase),
      'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  SELECT public.can_perform(p_user_id, p_challenge_id, v_next_config.required_role) INTO v_same_actor;
  IF v_same_actor THEN
    IF v_next_config.gate_flags IS NOT NULL AND array_length(v_next_config.gate_flags, 1) > 0 THEN
      SELECT lc_compliance_complete, fc_compliance_complete INTO v_lc_complete, v_fc_complete
      FROM public.challenges WHERE id = p_challenge_id;
      IF ('lc_compliance_complete' = ANY(v_next_config.gate_flags) AND NOT COALESCE(v_lc_complete, false))
         OR ('fc_compliance_complete' = ANY(v_next_config.gate_flags) AND NOT COALESCE(v_fc_complete, false)) THEN
        RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false, 'current_phase', v_next_phase,
          'waiting_for', 'Compliance review', 'phases_auto_completed', to_jsonb(v_auto_completed));
      END IF;
    END IF;
    v_auto_completed := v_auto_completed || v_next_phase;
    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(elem::integer) INTO v_auto_completed
      FROM (SELECT unnest(v_auto_completed) AS elem UNION
            SELECT jsonb_array_elements_text(v_recursive_result->'phases_auto_completed')::integer) sub;
    END IF;
    RETURN jsonb_build_object('completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::integer, v_next_phase),
      'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false,
    'current_phase', v_next_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
END; $$;