-- ============================================================
-- LC Review Workflow — Migration 3: Update initialize_challenge()
-- Inherits lc_review_required from org config
-- ============================================================

CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id UUID,
  p_title TEXT,
  p_operating_model TEXT,
  p_creator_id UUID
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
  v_lc_required    BOOLEAN;
  v_tier_check     JSONB;
  v_allowed        BOOLEAN;
  v_is_agg         BOOLEAN;
  v_start_phase    INTEGER;
BEGIN
  -- Step 1: Check tier limit
  SELECT result INTO v_tier_check
  FROM (
    SELECT public.check_tier_limit(p_org_id) AS result
  ) sub;

  v_allowed := (v_tier_check ->> 'allowed')::boolean;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Tier limit reached. Cannot create new challenge. %',
      COALESCE(v_tier_check ->> 'reason', 'Max active challenges reached.');
  END IF;

  -- Step 2: Get governance_profile, tenant_id, and lc_review_required from org
  SELECT id, governance_profile, COALESCE(lc_review_required, false)
    INTO v_tenant_id, v_governance, v_lc_required
    FROM public.seeker_organizations
   WHERE id = p_org_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  v_governance := COALESCE(v_governance, 'ENTERPRISE');
  v_is_agg := (p_operating_model = 'AGG');

  -- Step 2b: Check md_system_config for challenge-type overrides
  -- If lc_required_challenge_types config contains the governance profile, force LC required
  BEGIN
    DECLARE
      v_lc_types JSONB;
    BEGIN
      SELECT value INTO v_lc_types
      FROM public.md_system_config
      WHERE config_key = 'lc_required_challenge_types'
        AND is_active = true
      LIMIT 1;

      IF v_lc_types IS NOT NULL AND jsonb_typeof(v_lc_types) = 'array' THEN
        IF v_lc_types ? v_governance THEN
          v_lc_required := true;
        END IF;
      END IF;
    END;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- md_system_config may not exist yet
  END;

  -- Step 3: INSERT challenge (now includes lc_review_required)
  INSERT INTO public.challenges (
    tenant_id, organization_id, title, operating_model,
    governance_profile, status, master_status, current_phase,
    created_by, is_active, is_deleted, lc_review_required
  ) VALUES (
    v_tenant_id, p_org_id, p_title, p_operating_model,
    v_governance, 'draft', 'IN_PREPARATION',
    CASE WHEN v_is_agg THEN 2 ELSE 1 END,
    p_creator_id, true, false, v_lc_required
  )
  RETURNING id INTO v_challenge_id;

  -- Step 3b: CHALLENGE_CREATED audit entry
  INSERT INTO public.audit_trail (
    user_id, challenge_id, action, method, details
  ) VALUES (
    p_creator_id, v_challenge_id, 'CHALLENGE_CREATED', 'USER',
    jsonb_build_object(
      'operating_model', p_operating_model,
      'governance_profile', v_governance,
      'organization_id', p_org_id,
      'lc_review_required', v_lc_required
    )
  );

  -- Step 4: Auto-assign creator roles
  BEGIN
    PERFORM public.auto_assign_roles_on_creation(
      v_challenge_id, p_creator_id, v_governance, p_operating_model
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  -- Step 5: Handle Phase 1 bypass if AGG
  IF v_is_agg THEN
    BEGIN
      PERFORM public.handle_phase1_bypass(v_challenge_id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  -- Step 6: Start SLA timer for starting phase
  v_start_phase := CASE WHEN v_is_agg THEN 2 ELSE 1 END;

  BEGIN
    INSERT INTO public.sla_timers (
      challenge_id, phase, started_at, tenant_id, created_by
    ) VALUES (
      v_challenge_id, v_start_phase, NOW(), v_tenant_id, p_creator_id
    );

    -- SLA_STARTED audit entry
    INSERT INTO public.audit_trail (
      user_id, challenge_id, action, method, details
    ) VALUES (
      p_creator_id, v_challenge_id, 'SLA_STARTED', 'SYSTEM',
      jsonb_build_object('phase', v_start_phase)
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN v_challenge_id;
END;
$$;
