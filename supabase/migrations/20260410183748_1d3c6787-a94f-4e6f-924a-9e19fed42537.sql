
-- ============================================================
-- Bug 3 Fix: assign_challenge_role — RECORD → JSONB for v_validation
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_challenge_role(
  p_challenge_id UUID,
  p_pool_member_id UUID,
  p_user_id UUID,
  p_slm_role_code TEXT,
  p_governance_role_code TEXT,
  p_assigned_by UUID,
  p_assignment_phase TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_gov_mode TEXT;
  v_validation JSONB;
  v_assignment_id UUID;
  v_existing_id UUID;
BEGIN
  -- 1. Resolve governance mode
  SELECT COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')
  INTO v_gov_mode
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_gov_mode IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- 2. Validate role assignment (binary check) — FIXED: use JSONB, not RECORD
  v_validation := public.validate_role_assignment(
    p_user_id,
    p_challenge_id,
    p_governance_role_code,
    v_gov_mode
  );

  IF (v_validation->>'allowed')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_validation->>'message', 'Role assignment blocked'),
      'conflict_type', v_validation->>'conflict_type'
    );
  END IF;

  -- 3. Upsert governance-level role (user_challenge_roles)
  INSERT INTO public.user_challenge_roles (
    user_id, challenge_id, role_code, is_active, auto_assigned, assigned_by
  ) VALUES (
    p_user_id, p_challenge_id, p_governance_role_code, true, true, p_assigned_by
  )
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE
  SET is_active = true, updated_at = NOW();

  -- 4. Check for existing active SLM assignment
  SELECT id INTO v_existing_id
  FROM public.challenge_role_assignments
  WHERE challenge_id = p_challenge_id
    AND role_code = p_slm_role_code
    AND status = 'active'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.challenge_role_assignments
    SET pool_member_id = p_pool_member_id,
        assigned_by = p_assigned_by,
        assignment_phase = p_assignment_phase,
        updated_at = NOW(),
        updated_by = p_assigned_by
    WHERE id = v_existing_id;
    v_assignment_id := v_existing_id;
  ELSE
    INSERT INTO public.challenge_role_assignments (
      challenge_id, pool_member_id, role_code,
      assigned_by, assignment_phase, status
    ) VALUES (
      p_challenge_id, p_pool_member_id, p_slm_role_code,
      p_assigned_by, p_assignment_phase, 'active'
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  -- 5. Audit trail
  INSERT INTO public.audit_trail (
    challenge_id, user_id, action, method, details
  ) VALUES (
    p_challenge_id, p_assigned_by, 'ROLE_ASSIGNED', 'SYSTEM',
    jsonb_build_object(
      'role_code', p_slm_role_code,
      'governance_role', p_governance_role_code,
      'pool_member_id', p_pool_member_id,
      'user_id', p_user_id,
      'governance_mode', v_gov_mode
    )
  );

  -- 6. Increment pool member workload ONLY if pool member specified
  IF p_pool_member_id IS NOT NULL THEN
    UPDATE public.platform_provider_pool
    SET current_assignments = COALESCE(current_assignments, 0) + 1
    WHERE id = p_pool_member_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id
  );
END;
$$;


-- ============================================================
-- Bug 7 Fix: reassign_role — use assign_challenge_role for full SLM tracking
-- ============================================================

CREATE OR REPLACE FUNCTION public.reassign_role(
  p_challenge_id uuid,
  p_role_code text,
  p_old_user_id uuid,
  p_new_user_id uuid,
  p_reassigned_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase integer;
  v_phase_status text;
  v_required_role text;
  v_old_slm_code text;
  v_old_pool_member_id uuid;
  v_assign_result jsonb;
BEGIN
  -- Step 1: Get challenge phase info
  SELECT current_phase, phase_status
  INTO v_current_phase, v_phase_status
  FROM challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  v_required_role := get_phase_required_role(v_current_phase);

  IF p_role_code = v_required_role AND v_phase_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Cannot reassign role for a completed phase.';
  END IF;

  -- Step 2: Revoke old user governance role
  UPDATE user_challenge_roles
  SET is_active = false, revoked_at = now()
  WHERE user_id = p_old_user_id
    AND challenge_id = p_challenge_id
    AND role_code = p_role_code;

  -- Step 3: Find and release old SLM assignment + decrement workload
  SELECT cra.role_code, cra.pool_member_id
  INTO v_old_slm_code, v_old_pool_member_id
  FROM challenge_role_assignments cra
  JOIN platform_provider_pool ppp ON ppp.id = cra.pool_member_id
  WHERE cra.challenge_id = p_challenge_id
    AND ppp.user_id = p_old_user_id
    AND cra.status = 'active'
  LIMIT 1;

  IF v_old_pool_member_id IS NOT NULL THEN
    UPDATE challenge_role_assignments
    SET status = 'released',
        reassigned_at = now(),
        reassignment_reason = p_reason,
        updated_at = now(),
        updated_by = p_reassigned_by
    WHERE challenge_id = p_challenge_id
      AND pool_member_id = v_old_pool_member_id
      AND status = 'active';

    UPDATE platform_provider_pool
    SET current_assignments = GREATEST(COALESCE(current_assignments, 0) - 1, 0)
    WHERE id = v_old_pool_member_id;
  END IF;

  -- Step 4: Assign new user via assign_challenge_role (handles user_challenge_roles + challenge_role_assignments + workload)
  v_assign_result := assign_challenge_role(
    p_challenge_id,
    NULL,  -- no pool_member_id for org-direct reassignment
    p_new_user_id,
    COALESCE(v_old_slm_code, 'R5_MP'),
    p_role_code,
    p_reassigned_by,
    NULL
  );

  IF (v_assign_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Reassignment failed: %', COALESCE(v_assign_result->>'error', 'Unknown error');
  END IF;

  -- Step 5: Reset SLA timer
  UPDATE sla_timers
  SET started_at = now(),
      deadline_at = now() + (deadline_at - started_at),
      status = 'ACTIVE',
      breached_at = null
  WHERE challenge_id = p_challenge_id
    AND phase = v_current_phase
    AND status IN ('ACTIVE', 'BREACHED');

  -- Step 6: Notify old user
  INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
  VALUES (
    p_old_user_id,
    p_challenge_id,
    'ROLE_REASSIGNED',
    'Role Reassigned',
    'Your ' || p_role_code || ' role on this challenge has been reassigned. Reason: ' || p_reason
  );

  -- Step 7: Notify new user
  INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
  VALUES (
    p_new_user_id,
    p_challenge_id,
    'ROLE_REASSIGNED',
    'Role Assigned',
    'You have been assigned the ' || p_role_code || ' role on this challenge.'
  );

  -- Step 8: Audit trail
  INSERT INTO audit_trail (challenge_id, user_id, action, method, details)
  VALUES (
    p_challenge_id,
    p_reassigned_by,
    'ROLE_REASSIGNED',
    'HUMAN',
    jsonb_build_object(
      'role', p_role_code,
      'old_user', p_old_user_id::text,
      'new_user', p_new_user_id::text,
      'reason', p_reason,
      'old_pool_member', v_old_pool_member_id::text,
      'old_slm_code', v_old_slm_code,
      'assign_result', v_assign_result
    )
  );

  RETURN jsonb_build_object('success', true, 'old_user', p_old_user_id::text, 'new_user', p_new_user_id::text);
END;
$$;
