
CREATE OR REPLACE FUNCTION public.complete_phase(
  p_user_id UUID,
  p_challenge_id UUID
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
  v_next_user_id UUID;
  v_recursive_result JSONB;
  v_auto_completed INTEGER[] := '{}';
BEGIN
  -- Step 1: Get current phase and status
  SELECT current_phase, phase_status
  INTO v_current_phase, v_phase_status
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

  -- Step 5: Complete any active SLA timer for this phase
  UPDATE public.sla_timers
  SET status = 'COMPLETED',
      completed_at = NOW()
  WHERE challenge_id = p_challenge_id
    AND phase = v_current_phase
    AND status = 'ACTIVE';

  -- Step 6: Calculate next phase
  v_next_phase := CASE v_current_phase
    WHEN 1  THEN 2
    WHEN 2  THEN 3
    WHEN 3  THEN 4
    WHEN 4  THEN 5
    WHEN 5  THEN 7
    WHEN 7  THEN 8
    WHEN 8  THEN 9
    WHEN 9  THEN 10
    WHEN 10 THEN 11
    WHEN 11 THEN 12
    WHEN 12 THEN 13
    WHEN 13 THEN NULL
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
      p_challenge_id, p_user_id, 'LIFECYCLE_COMPLETED', 'SYSTEM',
      v_current_phase, NULL, '{"reason":"All phases completed"}'::jsonb
    );

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', true,
      'final_phase', v_current_phase,
      'phases_auto_completed', to_jsonb(v_auto_completed)
    );
  END IF;

  -- Step 7: Get required role for next phase
  SELECT public.get_phase_required_role(v_next_phase) INTO v_next_required_role;

  -- Step 8: Solver-initiated phase (no seeker role required)
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

  -- Step 9: Check if SAME user has the next role
  SELECT EXISTS(
    SELECT 1 FROM public.user_challenge_roles
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND role_code = v_next_required_role
      AND is_active = true
  ) INTO v_same_actor;

  -- Step 10: Same actor — auto-complete
  IF v_same_actor THEN
    UPDATE public.challenges
    SET current_phase = v_next_phase,
        phase_status = 'ACTIVE',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, phase_from, phase_to, details
    ) VALUES (
      p_challenge_id, p_user_id, 'PHASE_AUTO_COMPLETED', 'AUTO_COMPLETE',
      v_current_phase, v_next_phase,
      '{"reason":"SAME_ACTOR"}'::jsonb
    );

    -- Recursive call
    v_recursive_result := public.complete_phase(p_user_id, p_challenge_id);

    -- Collect auto-completed phases
    v_auto_completed := v_auto_completed || v_next_phase;
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(e::int)
      INTO v_auto_completed
      FROM (
        SELECT unnest(v_auto_completed) AS e
        UNION ALL
        SELECT (jsonb_array_elements_text(v_recursive_result->'phases_auto_completed'))::int
      ) sub;
    END IF;

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::int, v_next_phase),
      'waiting_for', v_recursive_result->>'waiting_for',
      'phases_auto_completed', to_jsonb(v_auto_completed)
    );
  END IF;

  -- Step 11: Different actor — hand off
  UPDATE public.challenges
  SET current_phase = v_next_phase,
      phase_status = 'ACTIVE',
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (
    challenge_id, user_id, action, method, phase_from, phase_to
  ) VALUES (
    p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase
  );

  -- Start SLA timer for next phase
  INSERT INTO public.sla_timers (
    challenge_id, phase, role_code, deadline_at, status, started_at
  ) VALUES (
    p_challenge_id, v_next_phase, v_next_required_role,
    NOW() + INTERVAL '5 days', 'ACTIVE', NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Find and notify next user
  SELECT user_id INTO v_next_user_id
  FROM public.user_challenge_roles
  WHERE challenge_id = p_challenge_id
    AND role_code = v_next_required_role
    AND is_active = true
  LIMIT 1;

  IF v_next_user_id IS NOT NULL THEN
    INSERT INTO public.cogni_notifications (
      user_id, challenge_id, notification_type, title, message
    ) VALUES (
      v_next_user_id, p_challenge_id, 'WAITING_FOR_YOU',
      'Action Required',
      'Challenge requires your action in Phase ' || v_next_phase
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', true,
    'lifecycle_complete', false,
    'current_phase', v_next_phase,
    'waiting_for', v_next_required_role,
    'phases_auto_completed', to_jsonb(v_auto_completed)
  );
END;
$$;
