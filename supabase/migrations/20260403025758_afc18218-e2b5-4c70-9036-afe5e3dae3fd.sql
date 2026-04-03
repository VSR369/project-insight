
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gov_mode TEXT;
  v_validation RECORD;
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

  -- 2. Validate role assignment (binary check)
  SELECT * INTO v_validation
  FROM public.validate_role_assignment(
    p_user_id,
    p_challenge_id,
    p_governance_role_code,
    v_gov_mode
  );

  IF v_validation.allowed IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_validation.message, 'Role assignment blocked'),
      'conflict_type', v_validation.conflict_type
    );
  END IF;

  -- 3. Check for existing active assignment
  SELECT id INTO v_existing_id
  FROM public.challenge_role_assignments
  WHERE challenge_id = p_challenge_id
    AND role_code = p_slm_role_code
    AND status = 'active'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.challenge_role_assignments
    SET pool_member_id = p_pool_member_id,
        assigned_by = p_assigned_by,
        assignment_phase = p_assignment_phase,
        updated_at = NOW(),
        updated_by = p_assigned_by
    WHERE id = v_existing_id;
    v_assignment_id := v_existing_id;
  ELSE
    -- Insert new
    INSERT INTO public.challenge_role_assignments (
      challenge_id, pool_member_id, role_code,
      assigned_by, assignment_phase, status
    ) VALUES (
      p_challenge_id, p_pool_member_id, p_slm_role_code,
      p_assigned_by, p_assignment_phase, 'active'
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  -- 4. Audit trail
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

  -- 5. Increment pool member workload
  UPDATE public.platform_provider_pool
  SET current_assignments = COALESCE(current_assignments, 0) + 1
  WHERE id = p_pool_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id
  );
END;
$$;
