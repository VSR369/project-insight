
-- =============================================================
-- 1. Trigger function: prevent governance profile change
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_governance_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.governance_profile IS DISTINCT FROM NEW.governance_profile
     AND OLD.current_phase IS NOT NULL
     AND OLD.current_phase > 1
  THEN
    RAISE EXCEPTION 'Governance profile cannot be changed after challenge creation (current_phase > 1).';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_challenges_prevent_governance_change
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_governance_profile_change();

COMMENT ON FUNCTION public.fn_prevent_governance_profile_change() IS
  'Prevents changing governance_profile on a challenge once it has moved past Phase 1.';

-- =============================================================
-- 2. Master function: initialize_challenge
-- =============================================================
CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id    UUID,
  p_creator_id UUID,
  p_title     TEXT,
  p_operating_model TEXT
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
  -- -------------------------------------------------------
  -- Step 1: Check tier limit
  -- -------------------------------------------------------
  SELECT result INTO v_tier_check
  FROM (
    SELECT public.check_tier_limit(p_org_id) AS result
  ) sub;

  v_allowed := (v_tier_check ->> 'allowed')::boolean;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Tier limit reached. Cannot create new challenge. %',
      COALESCE(v_tier_check ->> 'reason', 'Max active challenges reached.');
  END IF;

  -- -------------------------------------------------------
  -- Step 2: Get governance_profile and tenant_id from org
  -- -------------------------------------------------------
  SELECT id, governance_profile
    INTO v_tenant_id, v_governance
    FROM public.seeker_organizations
   WHERE id = p_org_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Default governance if not set
  v_governance := COALESCE(v_governance, 'ENTERPRISE');

  -- Determine if AGG operating model
  v_is_agg := (p_operating_model = 'AGG');

  -- -------------------------------------------------------
  -- Step 3: INSERT challenge
  -- -------------------------------------------------------
  INSERT INTO public.challenges (
    tenant_id,
    organization_id,
    title,
    operating_model,
    governance_profile,
    status,
    master_status,
    current_phase,
    created_by,
    is_active,
    is_deleted
  ) VALUES (
    v_tenant_id,
    p_org_id,
    p_title,
    p_operating_model,
    v_governance,
    'draft',
    'DRAFT',
    CASE WHEN v_is_agg THEN 2 ELSE 1 END,
    p_creator_id,
    true,
    false
  )
  RETURNING id INTO v_challenge_id;

  -- -------------------------------------------------------
  -- Step 4: Auto-assign creator roles
  -- -------------------------------------------------------
  BEGIN
    PERFORM public.auto_assign_roles_on_creation(v_challenge_id, p_creator_id);
  EXCEPTION WHEN undefined_function THEN
    -- Function not yet deployed; skip gracefully
    NULL;
  END;

  -- -------------------------------------------------------
  -- Step 5: Handle Phase 1 bypass if AGG
  -- -------------------------------------------------------
  IF v_is_agg THEN
    BEGIN
      PERFORM public.handle_phase1_bypass(v_challenge_id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  -- -------------------------------------------------------
  -- Step 6: Start SLA timer for starting phase
  -- -------------------------------------------------------
  v_start_phase := CASE WHEN v_is_agg THEN 2 ELSE 1 END;

  BEGIN
    INSERT INTO public.sla_timers (
      challenge_id,
      phase,
      started_at,
      tenant_id,
      created_by
    ) VALUES (
      v_challenge_id,
      v_start_phase,
      NOW(),
      v_tenant_id,
      p_creator_id
    );
  EXCEPTION WHEN undefined_table THEN
    -- sla_timers table not yet created; skip gracefully
    NULL;
  END;

  -- -------------------------------------------------------
  -- Step 7: Return challenge ID
  -- -------------------------------------------------------
  RETURN v_challenge_id;
END;
$$;

COMMENT ON FUNCTION public.initialize_challenge(UUID, UUID, TEXT, TEXT) IS
  'Master function for creating a new challenge. Checks tier limits, copies governance profile from org, inserts challenge, assigns roles, handles AGG bypass, and starts SLA timer.';
