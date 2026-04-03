
-- ============================================================
-- FIX A: role_conflict_rules — final matrices
-- QUICK: 0, STRUCTURED: 3, CONTROLLED: 9 = 12 total
-- ============================================================
DELETE FROM public.role_conflict_rules;

ALTER TABLE public.role_conflict_rules
  DROP CONSTRAINT IF EXISTS role_conflict_rules_governance_profile_check;
ALTER TABLE public.role_conflict_rules
  DROP CONSTRAINT IF EXISTS role_conflict_rules_conflict_type_check;

ALTER TABLE public.role_conflict_rules
  ADD CONSTRAINT role_conflict_rules_governance_profile_check
  CHECK (governance_profile IN ('QUICK','STRUCTURED','CONTROLLED'));
ALTER TABLE public.role_conflict_rules
  ADD CONSTRAINT role_conflict_rules_conflict_type_check
  CHECK (conflict_type IN ('HARD_BLOCK','ALLOWED'));

INSERT INTO public.role_conflict_rules
  (role_a, role_b, conflict_type, applies_scope, governance_profile, is_active)
VALUES
  -- STRUCTURED: 3 blocks
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'STRUCTURED', true),
  ('CR', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'STRUCTURED', true),
  ('ER', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'STRUCTURED', true),

  -- CONTROLLED: 9 blocks
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CR', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CR', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CU', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CU', 'LC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CU', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('ER', 'LC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('ER', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('LC', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true);

-- ============================================================
-- FIX B: initialize_challenge — ENTERPRISE → STRUCTURED
-- ============================================================
CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id UUID,
  p_creator_id UUID,
  p_title TEXT,
  p_operating_model TEXT,
  p_governance_mode_override TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
  v_tenant_id UUID;
  v_governance TEXT;
  v_tier_check JSONB;
  v_allowed BOOLEAN;
  v_is_agg BOOLEAN;
  v_start_phase INTEGER;
BEGIN
  SELECT result INTO v_tier_check
  FROM (SELECT public.check_tier_limit(p_org_id) AS result) sub;
  v_allowed := (v_tier_check ->> 'allowed')::boolean;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Tier limit reached. %',
      COALESCE(v_tier_check ->> 'reason', 'Max active challenges.');
  END IF;

  SELECT id, governance_profile INTO v_tenant_id, v_governance
  FROM public.seeker_organizations WHERE id = p_org_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  v_governance := COALESCE(v_governance, 'STRUCTURED');
  v_is_agg := (p_operating_model = 'AGG');

  INSERT INTO public.challenges (
    tenant_id, organization_id, title, operating_model,
    governance_profile, governance_mode_override,
    status, master_status, current_phase,
    created_by, is_active, is_deleted
  ) VALUES (
    v_tenant_id, p_org_id, p_title, p_operating_model,
    v_governance, p_governance_mode_override,
    'draft', 'IN_PREPARATION',
    CASE WHEN v_is_agg THEN 2 ELSE 1 END,
    p_creator_id, true, false
  ) RETURNING id INTO v_challenge_id;

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_creator_id, v_challenge_id, 'CHALLENGE_CREATED', 'HUMAN',
    jsonb_build_object('operating_model', p_operating_model,
      'governance_profile', v_governance,
      'governance_mode_override', p_governance_mode_override));

  BEGIN
    PERFORM public.auto_assign_roles_on_creation(
      v_challenge_id, p_creator_id, v_governance, p_operating_model);
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  IF v_is_agg THEN
    BEGIN PERFORM public.handle_phase1_bypass(v_challenge_id);
    EXCEPTION WHEN undefined_function THEN NULL; END;
  END IF;

  v_start_phase := CASE WHEN v_is_agg THEN 2 ELSE 1 END;
  BEGIN
    INSERT INTO public.sla_timers (challenge_id, phase, started_at, created_by)
    VALUES (v_challenge_id, v_start_phase, NOW(), p_creator_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_challenge_id;
END;
$$;

-- ============================================================
-- FIX C: auto_assign_roles_on_creation
--   QUICK:      CR+CU+ER+LC+FC (solo)
--   STRUCTURED: CR+LC (creator handles template legal work)
--   CONTROLLED: CR only (strict separation)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id UUID,
  p_creator_id UUID,
  p_governance_profile TEXT DEFAULT 'STRUCTURED',
  p_operating_model TEXT DEFAULT 'AGG'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
  v_role TEXT;
  v_assigned TEXT[] := '{}';
  v_mode TEXT;
BEGIN
  IF p_challenge_id IS NOT NULL THEN
    BEGIN v_mode := resolve_challenge_governance(p_challenge_id);
    EXCEPTION WHEN OTHERS THEN v_mode := NULL; END;
  END IF;

  IF v_mode IS NULL THEN
    v_mode := CASE
      WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK'
      WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED'
      ELSE 'STRUCTURED'
    END;
  END IF;

  IF v_mode = 'QUICK' THEN
    v_roles := ARRAY['CR','CU','ER','LC','FC'];
  ELSIF v_mode = 'STRUCTURED' THEN
    v_roles := ARRAY['CR','LC'];
  ELSIF v_mode = 'CONTROLLED' THEN
    v_roles := ARRAY['CR'];
  ELSE
    RETURN jsonb_build_object('roles_assigned', '[]'::jsonb,
      'auto_assigned', false, 'error', 'Unknown mode: ' || v_mode);
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_challenge_roles
      (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (p_creator_id, p_challenge_id, v_role, p_creator_id, true, true)
    ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET
      is_active = true, auto_assigned = true, updated_at = NOW();

    INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
    VALUES (p_creator_id, p_challenge_id, 'ROLE_AUTO_ASSIGNED', 'SYSTEM',
      jsonb_build_object('role_code', v_role, 'governance_mode', v_mode));

    v_assigned := array_append(v_assigned, v_role);
  END LOOP;

  RETURN jsonb_build_object('roles_assigned', to_jsonb(v_assigned),
    'governance_mode', v_mode, 'auto_assigned', true);
END;
$$;

-- ============================================================
-- FIX D: complete_phase — escrow optional + compliance pre-check
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_phase(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  -- Step 1: Context
  SELECT current_phase, phase_status,
         COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'),
         lc_compliance_complete, fc_compliance_complete
  INTO v_current_phase, v_phase_status, v_gov_mode, v_lc_complete, v_fc_complete
  FROM public.challenges WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN RAISE EXCEPTION 'Challenge not found.'; END IF;
  IF v_phase_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Phase not active.'; END IF;

  -- Step 2: Permission
  SELECT public.get_phase_required_role(v_current_phase) INTO v_required_role;
  SELECT public.can_perform(p_user_id, p_challenge_id, v_required_role) INTO v_can_perform;
  IF v_can_perform IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied for phase %.', v_current_phase;
  END IF;

  -- Step 2.5: COMPLIANCE GATE (Phase 2 → 3)
  IF v_current_phase = 2 THEN
    SELECT lc_compliance_complete, fc_compliance_complete
    INTO v_lc_complete, v_fc_complete
    FROM public.challenges WHERE id = p_challenge_id;

    IF NOT COALESCE(v_lc_complete, false) OR NOT COALESCE(v_fc_complete, false) THEN
      RAISE EXCEPTION 'Compliance incomplete: lc=%, fc=%', v_lc_complete, v_fc_complete;
    END IF;
  END IF;

  -- Step 3: Mark completed
  UPDATE public.challenges
  SET phase_status = 'COMPLETED', updated_at = NOW(), updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
  VALUES (p_challenge_id, p_user_id, 'PHASE_COMPLETED', 'HUMAN', v_current_phase, v_current_phase);

  UPDATE public.sla_timers SET status = 'COMPLETED', completed_at = NOW()
  WHERE challenge_id = p_challenge_id AND phase = v_current_phase AND status = 'ACTIVE';

  -- Step 6: Next phase
  v_next_phase := CASE v_current_phase
    WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6
    WHEN 6 THEN 7 WHEN 7 THEN 8 WHEN 8 THEN 9 WHEN 9 THEN 10 WHEN 10 THEN NULL
    ELSE NULL END;

  IF v_next_phase IS NULL THEN
    UPDATE public.challenges SET master_status = 'COMPLETED', completed_at = NOW(),
      updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
    RETURN jsonb_build_object('completed', true, 'lifecycle_complete', true,
      'final_phase', v_current_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  -- Step 7: On advance TO Phase 2 — auto-set compliance flags
  IF v_next_phase = 2 THEN
    SELECT legal_doc_mode, escrow_mode INTO v_legal_doc_mode, v_escrow_mode
    FROM public.md_governance_mode_config
    WHERE governance_mode = v_gov_mode AND is_active = true LIMIT 1;

    IF v_legal_doc_mode = 'auto_apply' THEN
      UPDATE public.challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
      BEGIN
        INSERT INTO public.challenge_legal_docs
          (challenge_id, document_type, document_name, tier, status, lc_status, created_by)
        SELECT p_challenge_id, document_type, document_name, 'TIER_1',
               'auto_accepted', 'approved', p_user_id
        FROM public.legal_document_templates
        WHERE tier = 'TIER_1' AND is_active = true;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    IF v_escrow_mode IN ('not_applicable', 'optional') THEN
      UPDATE public.challenges SET fc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
  END IF;

  -- Step 8: Next required role
  SELECT public.get_phase_required_role(v_next_phase) INTO v_next_required_role;

  -- Step 9: Solver phase (NULL role)
  IF v_next_required_role IS NULL THEN
    UPDATE public.challenges SET current_phase = v_next_phase, phase_status = 'ACTIVE',
      master_status = CASE WHEN v_next_phase >= 4 THEN 'ACTIVE' ELSE master_status END,
      published_at = CASE WHEN v_next_phase >= 4 THEN COALESCE(published_at, NOW()) ELSE published_at END,
      updated_at = NOW(), updated_by = p_user_id
    WHERE id = p_challenge_id;
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
    VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase);
    RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false,
      'current_phase', v_next_phase, 'waiting_for', 'Solver submissions',
      'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  -- Step 10: Advance to next phase
  UPDATE public.challenges SET current_phase = v_next_phase, phase_status = 'ACTIVE',
    master_status = CASE WHEN v_next_phase >= 4 THEN 'ACTIVE' ELSE master_status END,
    published_at = CASE WHEN v_next_phase >= 4 THEN COALESCE(published_at, NOW()) ELSE published_at END,
    updated_at = NOW(), updated_by = p_user_id
  WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
  VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase);

  -- Step 11: Same-actor auto-complete with compliance pre-check
  SELECT public.can_perform(p_user_id, p_challenge_id, v_next_required_role) INTO v_same_actor;

  IF v_same_actor THEN
    IF v_next_phase = 2 THEN
      SELECT lc_compliance_complete, fc_compliance_complete
      INTO v_lc_complete, v_fc_complete
      FROM public.challenges WHERE id = p_challenge_id;

      IF NOT COALESCE(v_lc_complete, false) OR NOT COALESCE(v_fc_complete, false) THEN
        RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false,
          'current_phase', v_next_phase,
          'waiting_for', 'Compliance review (legal/financial)',
          'phases_auto_completed', to_jsonb(v_auto_completed));
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
END;
$$;
