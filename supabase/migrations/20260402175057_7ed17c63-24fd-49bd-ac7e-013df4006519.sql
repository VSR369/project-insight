-- Step 1: Recreate initialize_challenge with governance_mode_override parameter
CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id UUID,
  p_creator_id UUID,
  p_title TEXT,
  p_operating_model TEXT,
  p_governance_mode_override TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id   UUID;
  v_tenant_id      UUID;
  v_governance     TEXT;
  v_tier_check     JSONB;
  v_allowed        BOOLEAN;
  v_is_agg         BOOLEAN;
  v_start_phase    INTEGER;
BEGIN
  SELECT result INTO v_tier_check
  FROM (
    SELECT public.check_tier_limit(p_org_id) AS result
  ) sub;

  v_allowed := (v_tier_check ->> 'allowed')::boolean;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Tier limit reached. Cannot create new challenge. %',
      COALESCE(v_tier_check ->> 'reason', 'Max active challenges reached.');
  END IF;

  SELECT id, governance_profile
    INTO v_tenant_id, v_governance
    FROM public.seeker_organizations
   WHERE id = p_org_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  v_governance := COALESCE(v_governance, 'ENTERPRISE');
  v_is_agg := (p_operating_model = 'AGG');

  INSERT INTO public.challenges (
    tenant_id, organization_id, title, operating_model,
    governance_profile, governance_mode_override, status, master_status, current_phase,
    created_by, is_active, is_deleted
  ) VALUES (
    v_tenant_id, p_org_id, p_title, p_operating_model,
    v_governance, p_governance_mode_override, 'draft', 'IN_PREPARATION',
    CASE WHEN v_is_agg THEN 2 ELSE 1 END,
    p_creator_id, true, false
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.audit_trail (
    user_id, challenge_id, action, method, details
  ) VALUES (
    p_creator_id, v_challenge_id, 'CHALLENGE_CREATED', 'HUMAN',
    jsonb_build_object(
      'operating_model', p_operating_model,
      'governance_profile', v_governance,
      'governance_mode_override', p_governance_mode_override,
      'organization_id', p_org_id
    )
  );

  BEGIN
    PERFORM public.auto_assign_roles_on_creation(
      v_challenge_id, p_creator_id, v_governance, p_operating_model
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  IF v_is_agg THEN
    BEGIN
      PERFORM public.handle_phase1_bypass(v_challenge_id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  v_start_phase := CASE WHEN v_is_agg THEN 2 ELSE 1 END;

  BEGIN
    INSERT INTO public.sla_timers (
      challenge_id, phase, started_at, created_by
    ) VALUES (
      v_challenge_id, v_start_phase, NOW(), p_creator_id
    );

    INSERT INTO public.audit_trail (
      user_id, challenge_id, action, method, details
    ) VALUES (
      p_creator_id, v_challenge_id, 'SLA_STARTED', 'SYSTEM',
      jsonb_build_object('phase', v_start_phase)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_challenge_id;
END;
$$;

-- Step 2: Fix can_perform — remove stale AM/RQ operating model checks
CREATE OR REPLACE FUNCTION public.can_perform(
  p_user_id UUID,
  p_challenge_id UUID,
  p_required_role TEXT,
  p_required_phase INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operating_model text;
BEGIN
  -- Step 1: Check active role assignment (using roles_equivalent)
  IF NOT EXISTS (
    SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND roles_equivalent(p_required_role, role_code)
      AND is_active = true
  ) THEN
    RETURN false;
  END IF;

  -- Step 2: Phase check (only if p_required_phase is provided)
  IF p_required_phase IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM challenges
      WHERE id = p_challenge_id
        AND current_phase = p_required_phase
        AND phase_status = 'ACTIVE'
    ) THEN
      RETURN false;
    END IF;
  END IF;

  -- Legacy AM/RQ operating model checks removed — these role codes
  -- have been deactivated and roles_equivalent handles any remaining
  -- metadata mappings. get_phase_required_role uses modern codes only.

  -- All checks passed
  RETURN true;
END;
$$;