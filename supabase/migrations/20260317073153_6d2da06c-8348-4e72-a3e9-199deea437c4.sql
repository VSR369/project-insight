
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
  v_sla_deadline TIMESTAMPTZ;
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
    WHEN 5  THEN 7   -- skip 6
    WHEN 7  THEN 8
    WHEN 8  THEN 9
    WHEN 9  THEN 10
    WHEN 10 THEN 11
    WHEN 11 THEN 12
    WHEN 12 THEN 13
    WHEN 13 THEN NULL
    ELSE NULL
  END;

  IF v_next_phase IS NULL THEN
    -- Lifecycle complete
    UPDATE public.challenges
    SET master_status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, phase_from, phase_to,
      details
    ) VALUES (
      p_challenge_id, p_user_id, 'LIFECYCLE_COMPLETED', 'SYSTEM',
      v_current_phase, NULL,
      '{"reason": "All phases completed"}'::jsonb
    );

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', true,
      'final_phase', v_current_phase
    );
  ELSE
    -- Advance to next phase
    UPDATE public.challenges
    SET current_phase = v_next_phase,
        phase_status = 'ACTIVE',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    -- Start SLA timer for next phase
    SELECT deadline INTO v_sla_deadline
    FROM public.sla_timers
    WHERE challenge_id = p_challenge_id
      AND phase = v_next_phase
    LIMIT 1;

    INSERT INTO public.sla_timers (
      challenge_id, phase, status, started_at
    ) VALUES (
      p_challenge_id, v_next_phase, 'ACTIVE', NOW()
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, phase_from, phase_to
    ) VALUES (
      p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM',
      v_current_phase, v_next_phase
    );

    -- Notify next phase owner
    INSERT INTO public.cogni_notifications (
      user_id, challenge_id, notification_type, title, message
    )
    SELECT ucr.user_id, p_challenge_id, 'PHASE_READY',
      'Phase ' || v_next_phase || ' is now active',
      'Challenge phase ' || v_next_phase || ' requires your action.'
    FROM public.user_challenge_roles ucr
    WHERE ucr.challenge_id = p_challenge_id
      AND ucr.role_code = (SELECT public.get_phase_required_role(v_next_phase))
      AND ucr.is_active = true;

    RETURN jsonb_build_object(
      'completed', true,
      'lifecycle_complete', false,
      'previous_phase', v_current_phase,
      'current_phase', v_next_phase
    );
  END IF;
END;
$$;
