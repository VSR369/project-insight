
-- ============================================================
-- Governance Cleanup: LIGHTWEIGHT/ENTERPRISE → QUICK/STRUCTURED/CONTROLLED
-- ============================================================

-- Temporarily disable governance change prevention trigger
ALTER TABLE challenges DISABLE TRIGGER trg_challenges_prevent_governance_change;

-- A1. DROP old constraints
ALTER TABLE seeker_organizations DROP CONSTRAINT IF EXISTS seeker_organizations_governance_profile_check;
ALTER TABLE role_conflict_rules DROP CONSTRAINT IF EXISTS role_conflict_rules_governance_profile_check;

-- A2. Migrate existing data
UPDATE challenges SET governance_profile = 'QUICK' WHERE governance_profile = 'LIGHTWEIGHT';
UPDATE challenges SET governance_profile = 'STRUCTURED' WHERE governance_profile = 'ENTERPRISE';
UPDATE seeker_organizations SET governance_profile = 'QUICK' WHERE governance_profile = 'LIGHTWEIGHT';
UPDATE seeker_organizations SET governance_profile = 'STRUCTURED' WHERE governance_profile = 'ENTERPRISE';

-- Re-enable trigger
ALTER TABLE challenges ENABLE TRIGGER trg_challenges_prevent_governance_change;

-- A3a. ADD constraint on seeker_organizations
ALTER TABLE seeker_organizations ADD CONSTRAINT seeker_organizations_governance_profile_check
  CHECK (governance_profile IN ('QUICK', 'STRUCTURED', 'CONTROLLED'));

-- A3b. DELETE old conflict rules
DELETE FROM role_conflict_rules WHERE governance_profile = 'ENTERPRISE_ONLY';

-- A3c. ADD constraint on role_conflict_rules
ALTER TABLE role_conflict_rules ADD CONSTRAINT role_conflict_rules_governance_profile_check
  CHECK (governance_profile IN ('STRUCTURED', 'CONTROLLED', 'BOTH'));

-- A4. INSERT new conflict rules
INSERT INTO role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile)
VALUES
  ('CR', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CR', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CU', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CR', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('ID', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('CR', 'ID', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('CU', 'ID', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('AM', 'CR', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('AM', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('RQ', 'CR', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('RQ', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('CR', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('ID', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED');

-- A5. Replace validate_role_assignment
CREATE OR REPLACE FUNCTION public.validate_role_assignment(
  p_user_id uuid, p_challenge_id uuid, p_new_role text, p_governance_profile text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing_roles text[]; v_role text; v_conflict record; v_mode text;
BEGIN
  v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK' WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  IF v_mode = 'QUICK' THEN RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null); END IF;
  SELECT array_agg(role_code) INTO v_existing_roles FROM user_challenge_roles WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND is_active = true;
  IF v_existing_roles IS NULL THEN RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null); END IF;
  FOREACH v_role IN ARRAY v_existing_roles LOOP
    SELECT conflict_type, governance_profile AS rule_profile INTO v_conflict FROM role_conflict_rules
    WHERE ((role_a = v_role AND role_b = p_new_role) OR (role_a = p_new_role AND role_b = v_role))
      AND applies_scope = 'SAME_CHALLENGE' AND is_active = true AND governance_profile IN (v_mode, 'BOTH')
    ORDER BY CASE conflict_type WHEN 'HARD_BLOCK' THEN 0 ELSE 1 END LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_conflict.conflict_type = 'HARD_BLOCK' THEN
      RETURN jsonb_build_object('allowed', false, 'conflict_type', 'HARD_BLOCK', 'message', 'User holds ' || v_role || ' and cannot also hold ' || p_new_role || ' on the same challenge.');
    END IF;
    IF v_conflict.conflict_type = 'SOFT_WARN' THEN
      RETURN jsonb_build_object('allowed', true, 'conflict_type', 'SOFT_WARN', 'message', 'User holds both ' || v_role || ' and ' || p_new_role || '. Org Admin must acknowledge reduced governance.');
    END IF;
  END LOOP;
  RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
END; $$;

-- A6. Replace auto_assign_roles_on_creation
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id UUID, p_creator_id UUID, p_governance_profile TEXT, p_operating_model TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_roles TEXT[]; v_role TEXT; v_assigned TEXT[] := '{}'; v_mode TEXT;
BEGIN
  v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK' WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  IF v_mode = 'QUICK' THEN
    v_roles := ARRAY['CR','CU','ID','ER','LC','FC'];
    IF p_operating_model = 'MP' THEN v_roles := array_append(v_roles, 'AM');
    ELSIF p_operating_model = 'AGG' THEN v_roles := array_append(v_roles, 'RQ'); END IF;
  ELSIF v_mode IN ('STRUCTURED','CONTROLLED') THEN
    IF p_operating_model = 'MP' THEN v_roles := ARRAY['AM'];
    ELSIF p_operating_model = 'AGG' THEN v_roles := ARRAY['CR'];
    ELSE v_roles := '{}'; END IF;
  ELSE
    RETURN jsonb_build_object('roles_assigned', '[]'::jsonb, 'governance_profile', p_governance_profile, 'auto_assigned', false, 'error', 'Unknown governance_profile: ' || COALESCE(p_governance_profile, 'NULL'));
  END IF;
  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (p_creator_id, p_challenge_id, v_role, p_creator_id, true, true)
    ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, auto_assigned = true, assigned_by = EXCLUDED.assigned_by, updated_at = NOW();
    INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
    VALUES (p_creator_id, p_challenge_id, 'ROLE_AUTO_ASSIGNED', 'SYSTEM', jsonb_build_object('role_code', v_role, 'governance_profile', p_governance_profile, 'governance_mode', v_mode, 'operating_model', p_operating_model));
    v_assigned := array_append(v_assigned, v_role);
  END LOOP;
  RETURN jsonb_build_object('roles_assigned', to_jsonb(v_assigned), 'governance_profile', p_governance_profile, 'governance_mode', v_mode, 'auto_assigned', true);
END; $$;

-- A7. Update assign_role_to_challenge
CREATE OR REPLACE FUNCTION public.assign_role_to_challenge(
  p_user_id uuid, p_challenge_id uuid, p_role_code text, p_assigned_by uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_governance_profile text; v_validation jsonb;
BEGIN
  SELECT governance_profile INTO v_governance_profile FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found: %', p_challenge_id; END IF;
  v_validation := validate_role_assignment(p_user_id, p_challenge_id, p_role_code, COALESCE(v_governance_profile, 'QUICK'));
  IF (v_validation->>'allowed')::boolean = false THEN RAISE EXCEPTION '%', v_validation->>'message'; END IF;
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
  VALUES (p_user_id, p_challenge_id, p_role_code, p_assigned_by, true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null, assigned_at = now();
  INSERT INTO audit_trail (challenge_id, user_id, action, method, details)
  VALUES (p_challenge_id, p_assigned_by, 'ROLE_ASSIGNED', 'HUMAN', jsonb_build_object('role', p_role_code, 'assigned_to', p_user_id::text, 'conflict_warning', v_validation->>'message'));
  RETURN jsonb_build_object('success', true, 'conflict_warning', v_validation->>'message');
END; $$;

-- A8. Replace get_governance_behavior
CREATE OR REPLACE FUNCTION public.get_governance_behavior(p_governance_profile TEXT, p_phase INTEGER)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result JSONB; v_mode TEXT;
BEGIN
  v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK' WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  IF v_mode IN ('STRUCTURED','CONTROLLED') THEN
    RETURN jsonb_build_object('auto_complete', false, 'skip_phase', false, 'simplified_gate', null, 'required_content', 'FULL', 'role_relaxation', false);
  END IF;
  v_result := jsonb_build_object('auto_complete', false, 'skip_phase', false, 'simplified_gate', null, 'required_content', 'FULL', 'role_relaxation', true);
  CASE p_phase
    WHEN 1 THEN v_result := v_result || jsonb_build_object('auto_complete', true, 'skip_phase', true);
    WHEN 2 THEN v_result := v_result || jsonb_build_object('auto_complete', false, 'required_content', 'REDUCED');
    WHEN 3 THEN v_result := v_result || jsonb_build_object('auto_complete', true);
    WHEN 4 THEN v_result := v_result || jsonb_build_object('auto_complete', true, 'simplified_gate', 'GATE-11-L');
    WHEN 5 THEN v_result := v_result || jsonb_build_object('auto_complete', false);
    WHEN 7, 8 THEN v_result := v_result || jsonb_build_object('simplified_gate', 'SINGLE_REVIEWER_AI');
    WHEN 9 THEN v_result := v_result || jsonb_build_object('skip_phase', true);
    WHEN 10 THEN v_result := v_result || jsonb_build_object('simplified_gate', 'NO_BLIND_IP');
    WHEN 13 THEN v_result := v_result || jsonb_build_object('auto_complete', true);
    ELSE NULL;
  END CASE;
  RETURN v_result;
END; $$;
COMMENT ON FUNCTION public.get_governance_behavior(TEXT, INTEGER) IS 'Returns phase-specific governance behavior for QUICK/STRUCTURED/CONTROLLED profiles.';

-- A9. Replace get_mandatory_fields
CREATE OR REPLACE FUNCTION public.get_mandatory_fields(p_governance_profile TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_base JSONB; v_extended JSONB; v_mode TEXT;
BEGIN
  v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK' WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  v_base := '["title","description","problem_statement","deliverables","evaluation_criteria","reward_structure","maturity_level","phase_schedule"]'::jsonb;
  IF v_mode = 'QUICK' THEN RETURN v_base; END IF;
  v_extended := '["scope","complexity_parameters","ip_model","visibility","eligibility","submission_guidelines","taxonomy_tags","permitted_artifact_types"]'::jsonb;
  RETURN v_base || v_extended;
END; $$;
COMMENT ON FUNCTION public.get_mandatory_fields(TEXT) IS 'Returns mandatory fields for QUICK (8) or STRUCTURED/CONTROLLED (16) profiles.';

-- A9b. Replace get_active_rules
CREATE OR REPLACE FUNCTION public.get_active_rules(p_governance_profile TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_mode TEXT;
BEGIN
  v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK' WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  IF v_mode IN ('STRUCTURED','CONTROLLED') THEN
    RETURN jsonb_build_object('BR-TRUST', jsonb_build_object('status','ACTIVE','note','Full trust framework active'), 'BR-ESCROW', jsonb_build_object('status','ACTIVE','note','Full escrow with partial payments'), 'BR-AI-001', jsonb_build_object('status','INACTIVE','note','AI plagiarism check not used'), 'BR-AI-002', jsonb_build_object('status','INACTIVE','note','AI feasibility check not used'), 'BR-ANON', jsonb_build_object('status','MANDATORY','note','Blind evaluation enforced'), 'BR-CP', jsonb_build_object('status','ACTIVE','note','Full conflict-of-interest panel'), 'BR-PP', jsonb_build_object('status','ACTIVE','note','Full peer-panel review'));
  END IF;
  IF v_mode = 'QUICK' THEN
    RETURN jsonb_build_object('BR-TRUST', jsonb_build_object('status','REDUCED','note','BR-TRUST-003 only'), 'BR-ESCROW', jsonb_build_object('status','REDUCED','note','BR-ESCROW-004 only'), 'BR-AI-001', jsonb_build_object('status','ACTIVE','note','AI plagiarism check active'), 'BR-AI-002', jsonb_build_object('status','ACTIVE','note','AI feasibility check active'), 'BR-ANON', jsonb_build_object('status','CONFIGURABLE','note','Org can toggle blind evaluation'), 'BR-CP', jsonb_build_object('status','INACTIVE','note','No conflict-of-interest panel'), 'BR-PP', jsonb_build_object('status','INACTIVE','note','No peer-panel review'));
  END IF;
  RETURN jsonb_build_object('BR-TRUST', jsonb_build_object('status','ACTIVE','note','Default: full trust framework'), 'BR-ESCROW', jsonb_build_object('status','ACTIVE','note','Default: full escrow'), 'BR-AI-001', jsonb_build_object('status','INACTIVE','note','Default: AI off'), 'BR-AI-002', jsonb_build_object('status','INACTIVE','note','Default: AI off'), 'BR-ANON', jsonb_build_object('status','MANDATORY','note','Default: blind enforced'), 'BR-CP', jsonb_build_object('status','ACTIVE','note','Default: conflict panel on'), 'BR-PP', jsonb_build_object('status','ACTIVE','note','Default: peer panel on'));
END; $$;
COMMENT ON FUNCTION public.get_active_rules(TEXT) IS 'Returns BR activation matrix per governance profile (QUICK, STRUCTURED, CONTROLLED).';

-- A10. Update auto_curate_lightweight internals
CREATE OR REPLACE FUNCTION public.auto_curate_lightweight(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB; v_all_passed BOOLEAN; v_failed_items JSONB; v_challenge RECORD;
BEGIN
  SELECT id, current_phase, phase_status, governance_profile INTO v_challenge FROM challenges WHERE id = p_challenge_id AND is_deleted = FALSE;
  IF v_challenge.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  IF v_challenge.governance_profile != 'QUICK' THEN RETURN jsonb_build_object('success', false, 'error', 'Not a quick-mode challenge'); END IF;
  v_result := validate_curation_checklist(p_challenge_id);
  v_all_passed := (v_result->>'all_passed')::boolean;
  IF v_all_passed THEN
    RETURN jsonb_build_object('success', true, 'auto_completed', true, 'challenge_id', p_challenge_id);
  ELSE
    UPDATE challenges SET phase_status = 'BLOCKED', updated_by = p_user_id, updated_at = NOW() WHERE id = p_challenge_id;
    SELECT jsonb_agg(elem->>'label') INTO v_failed_items FROM jsonb_array_elements(v_result->'items') AS elem WHERE (elem->>'passed')::boolean = false;
    INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
    SELECT ucr.user_id, p_challenge_id, 'curation_blocked', 'Challenge missing required items',
           'Your challenge is missing: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_failed_items)), ', ') || '. Please complete these items.'
    FROM user_challenge_roles ucr WHERE ucr.challenge_id = p_challenge_id AND ucr.role_code = 'CR' AND ucr.status = 'ACTIVE' LIMIT 1;
    RETURN jsonb_build_object('success', true, 'auto_completed', false, 'blocked', true, 'missing_items', v_failed_items, 'challenge_id', p_challenge_id);
  END IF;
END; $$;
