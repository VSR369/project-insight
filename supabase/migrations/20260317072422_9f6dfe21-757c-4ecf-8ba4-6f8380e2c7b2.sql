
-- ============================================================
-- M-03 Test Harness: validate_role_assignment, assign_role_to_challenge, reassign_role
-- 10 Tests (T03-01 to T03-10)
-- ============================================================
DO $$
DECLARE
  v_user_a uuid := '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13';
  v_user_b uuid := 'db44fec9-0c5e-4bf8-b0bd-155b24e60f60';
  v_tenant_id uuid := '9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb';
  v_ch_enterprise uuid := 'cccccccc-0000-0000-0000-cccccccccc01';
  v_ch_lightweight uuid := 'cccccccc-0000-0000-0000-cccccccccc02';
  v_result jsonb;
  v_audit_count integer;
  v_is_active boolean;
  v_revoked_at timestamptz;
  v_notif_count integer;
  v_reg_bool boolean;
  v_reg_roles text[];
  v_reg_dashboard jsonb;
BEGIN
  -- SETUP
  INSERT INTO platform_roles (role_code, role_name, role_description, applicable_model)
  VALUES ('SOLVER', 'Solver', 'Test role for HARD_BLOCK conflict testing', 'BOTH')
  ON CONFLICT (role_code) DO NOTHING;

  INSERT INTO role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile, is_active)
  VALUES
    ('ER', 'SOLVER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'BOTH', true),
    ('CR', 'SOLVER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'BOTH', true);

  INSERT INTO challenges (id, tenant_id, organization_id, title, status, current_phase, phase_status, master_status, governance_profile)
  VALUES
    (v_ch_enterprise, v_tenant_id, v_tenant_id, 'M03 Enterprise Test', 'active', 3, 'ACTIVE', 'ACTIVE', 'ENTERPRISE'),
    (v_ch_lightweight, v_tenant_id, v_tenant_id, 'M03 Lightweight Test', 'active', 3, 'ACTIVE', 'ACTIVE', 'LIGHTWEIGHT')
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM user_challenge_roles WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM audit_trail WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM cogni_notifications WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);

  -- T03-01: HARD_BLOCK ER + SOLVER
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_enterprise, 'ER', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  BEGIN
    v_result := assign_role_to_challenge(v_user_a, v_ch_enterprise, 'SOLVER', v_user_a);
    RAISE NOTICE 'T03-01: FAIL (expected exception, got success)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%cannot also hold SOLVER%' THEN
      RAISE NOTICE 'T03-01: PASS — HARD_BLOCK ER+SOLVER raised exception';
    ELSE
      RAISE NOTICE 'T03-01: FAIL — unexpected error: %', SQLERRM;
    END IF;
  END;

  -- T03-02: HARD_BLOCK CR + SOLVER
  DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id = v_ch_enterprise;
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_enterprise, 'CR', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  BEGIN
    v_result := assign_role_to_challenge(v_user_a, v_ch_enterprise, 'SOLVER', v_user_a);
    RAISE NOTICE 'T03-02: FAIL (expected exception, got success)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%cannot also hold SOLVER%' THEN
      RAISE NOTICE 'T03-02: PASS — HARD_BLOCK CR+SOLVER raised exception';
    ELSE
      RAISE NOTICE 'T03-02: FAIL — unexpected error: %', SQLERRM;
    END IF;
  END;

  -- T03-03: SOFT_WARN CR+CU on ENTERPRISE
  DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id = v_ch_enterprise;
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_enterprise, 'CR', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  v_result := assign_role_to_challenge(v_user_a, v_ch_enterprise, 'CU', v_user_a);
  IF (v_result->>'success')::boolean = true AND v_result->>'conflict_warning' IS NOT NULL THEN
    RAISE NOTICE 'T03-03: PASS — SOFT_WARN CR+CU on Enterprise, warning: %', v_result->>'conflict_warning';
  ELSE
    RAISE NOTICE 'T03-03: FAIL — result: %', v_result;
  END IF;

  -- T03-04: No warning CR+CU on LIGHTWEIGHT
  DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id = v_ch_lightweight;
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_lightweight, 'CR', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  v_result := assign_role_to_challenge(v_user_a, v_ch_lightweight, 'CU', v_user_a);
  IF (v_result->>'success')::boolean = true AND v_result->>'conflict_warning' IS NULL THEN
    RAISE NOTICE 'T03-04: PASS — CR+CU on Lightweight, no warning';
  ELSE
    RAISE NOTICE 'T03-04: FAIL — result: %', v_result;
  END IF;

  -- T03-05: ALLOWED LC + any (no conflict rule)
  v_result := assign_role_to_challenge(v_user_a, v_ch_enterprise, 'LC', v_user_a);
  IF (v_result->>'success')::boolean = true AND v_result->>'conflict_warning' IS NULL THEN
    RAISE NOTICE 'T03-05: PASS — LC assigned, no conflict';
  ELSE
    RAISE NOTICE 'T03-05: FAIL — result: %', v_result;
  END IF;

  -- T03-06: ALLOWED FC + ID (no rule between them)
  DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id = v_ch_lightweight;
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_lightweight, 'ID', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  v_result := assign_role_to_challenge(v_user_a, v_ch_lightweight, 'FC', v_user_a);
  IF (v_result->>'success')::boolean = true AND v_result->>'conflict_warning' IS NULL THEN
    RAISE NOTICE 'T03-06: PASS — FC+ID allowed, no conflict';
  ELSE
    RAISE NOTICE 'T03-06: FAIL — result: %', v_result;
  END IF;

  -- T03-07: Audit trail records
  SELECT COUNT(*) INTO v_audit_count
  FROM audit_trail
  WHERE challenge_id = v_ch_enterprise
    AND action = 'ROLE_ASSIGNED'
    AND details->>'role' = 'CU'
    AND details->>'assigned_to' = v_user_a::text;

  IF v_audit_count >= 1 THEN
    RAISE NOTICE 'T03-07: PASS — audit_trail ROLE_ASSIGNED for CU (count=%)', v_audit_count;
  ELSE
    RAISE NOTICE 'T03-07: FAIL — count=%, expected >= 1', v_audit_count;
  END IF;

  -- T03-08: reassign_role revokes old user
  DELETE FROM user_challenge_roles WHERE challenge_id = v_ch_enterprise AND role_code = 'CR';
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
  VALUES (v_user_a, v_ch_enterprise, 'CR', true, false)
  ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

  INSERT INTO sla_timers (challenge_id, phase, role_code, status, started_at, deadline_at)
  VALUES (v_ch_enterprise, 3, 'CR', 'ACTIVE', now() - interval '1 hour', now() + interval '23 hours');

  v_result := reassign_role(v_ch_enterprise, 'CR', v_user_a, v_user_b, v_user_a, 'Testing reassignment');

  SELECT is_active, revoked_at INTO v_is_active, v_revoked_at
  FROM user_challenge_roles
  WHERE user_id = v_user_a AND challenge_id = v_ch_enterprise AND role_code = 'CR';

  IF v_is_active = false AND v_revoked_at IS NOT NULL THEN
    RAISE NOTICE 'T03-08: PASS — old user revoked (revoked_at=%)', v_revoked_at;
  ELSE
    RAISE NOTICE 'T03-08: FAIL — is_active=%, revoked_at=%', v_is_active, v_revoked_at;
  END IF;

  SELECT COUNT(*) INTO v_notif_count
  FROM cogni_notifications WHERE challenge_id = v_ch_enterprise AND notification_type = 'ROLE_REASSIGNED';
  RAISE NOTICE 'T03-08 (bonus): % ROLE_REASSIGNED notifications created', v_notif_count;

  -- T03-09: reassign_role blocked for COMPLETED phase
  UPDATE challenges SET phase_status = 'COMPLETED' WHERE id = v_ch_enterprise;

  BEGIN
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
    VALUES (v_user_a, v_ch_enterprise, 'CU', true, false)
    ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, revoked_at = null;

    v_result := reassign_role(v_ch_enterprise, 'CU', v_user_a, v_user_b, v_user_a, 'Should fail');
    RAISE NOTICE 'T03-09: FAIL (expected exception, got success)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%completed phase%' THEN
      RAISE NOTICE 'T03-09: PASS — reassign blocked for completed phase';
    ELSE
      RAISE NOTICE 'T03-09: FAIL — unexpected error: %', SQLERRM;
    END IF;
  END;

  UPDATE challenges SET phase_status = 'ACTIVE' WHERE id = v_ch_enterprise;

  -- T03-10: REGRESSION
  DECLARE
    v_reg_ch uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb01';
    v_reg_ch2 uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb02';
  BEGIN
    INSERT INTO challenges (id, tenant_id, organization_id, title, status, current_phase, phase_status, master_status, operating_model)
    VALUES
      (v_reg_ch, v_tenant_id, v_tenant_id, 'Reg Test MP', 'active', 2, 'ACTIVE', 'ACTIVE', 'MP'),
      (v_reg_ch2, v_tenant_id, v_tenant_id, 'Reg Test AGG', 'active', 2, 'ACTIVE', 'ACTIVE', 'AGG')
    ON CONFLICT (id) DO UPDATE SET current_phase = 2, phase_status = 'ACTIVE', operating_model = EXCLUDED.operating_model;

    DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id IN (v_reg_ch, v_reg_ch2);
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
    VALUES (v_user_a, v_reg_ch, 'CR', true, false);

    IF get_phase_required_role(2) = 'CR' THEN
      RAISE NOTICE 'T03-10a: PASS — get_phase_required_role(2)=CR';
    ELSE
      RAISE NOTICE 'T03-10a: FAIL — got %', get_phase_required_role(2);
    END IF;

    SELECT can_perform(v_user_a, v_reg_ch, 'CR', 2) INTO v_reg_bool;
    IF v_reg_bool = true THEN
      RAISE NOTICE 'T03-10b: PASS — can_perform(CR, phase 2)=true';
    ELSE
      RAISE NOTICE 'T03-10b: FAIL — got %', v_reg_bool;
    END IF;

    SELECT get_user_roles(v_user_a, v_reg_ch) INTO v_reg_roles;
    IF 'CR' = ANY(v_reg_roles) THEN
      RAISE NOTICE 'T03-10c: PASS — get_user_roles contains CR';
    ELSE
      RAISE NOTICE 'T03-10c: FAIL — got %', v_reg_roles;
    END IF;

    SELECT get_user_dashboard_data(v_user_a) INTO v_reg_dashboard;
    IF v_reg_dashboard IS NOT NULL THEN
      RAISE NOTICE 'T03-10d: PASS — dashboard returned data';
    ELSE
      RAISE NOTICE 'T03-10d: FAIL — null';
    END IF;

    v_result := validate_role_assignment(v_user_a, v_reg_ch, 'CU', 'LIGHTWEIGHT');
    IF (v_result->>'allowed')::boolean = true THEN
      RAISE NOTICE 'T03-10e: PASS — validate_role_assignment works';
    ELSE
      RAISE NOTICE 'T03-10e: FAIL — got %', v_result;
    END IF;

    DELETE FROM user_challenge_roles WHERE user_id = v_user_a AND challenge_id IN (v_reg_ch, v_reg_ch2);
    DELETE FROM audit_trail WHERE challenge_id IN (v_reg_ch, v_reg_ch2);
    DELETE FROM challenges WHERE id IN (v_reg_ch, v_reg_ch2);
  END;

  -- CLEANUP
  DELETE FROM cogni_notifications WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM audit_trail WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM user_challenge_roles WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM sla_timers WHERE challenge_id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM challenges WHERE id IN (v_ch_enterprise, v_ch_lightweight);
  DELETE FROM role_conflict_rules WHERE role_a = 'ER' AND role_b = 'SOLVER';
  DELETE FROM role_conflict_rules WHERE role_a = 'CR' AND role_b = 'SOLVER';
  DELETE FROM platform_roles WHERE role_code = 'SOLVER';

  RAISE NOTICE '=== M-03 Test Suite Complete. All fixtures cleaned up. ===';
END;
$$;
