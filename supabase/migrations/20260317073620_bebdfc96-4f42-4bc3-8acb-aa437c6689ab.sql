
-- ============================================================
-- M-04 Test Checklist: 12 Tests for complete_phase, auto_assign,
-- handle_phase1_bypass
-- ============================================================
DO $$
DECLARE
  v_org_id UUID := '9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb';
  v_user_a UUID := '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13';
  v_user_b UUID := 'db44fec9-0c5e-4bf8-b0bd-155b24e60f60';
  v_user_c UUID := '32aec070-360a-4d73-a6dd-28961c629ca6';
  v_ch_id UUID;
  v_result JSONB;
  v_count INTEGER;
  v_phase INTEGER;
  v_status TEXT;
  v_master TEXT;
  v_pub TIMESTAMPTZ;
  v_pass BOOLEAN;
  v_test_challenges UUID[] := '{}';
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE 'M-04 TEST CHECKLIST — 12 Tests';
  RAISE NOTICE '══════════════════════════════════════════════';

  -- ══════════════════════════════════════════
  -- T04-01: Solo user: Phase 1 auto-chains to Phase 5, stops at 7
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status, master_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-01 Solo LIGHTWEIGHT', 'LIGHTWEIGHT', 'MP', 1, 'ACTIVE', 'DRAFT');

    -- Auto-assign all 8 roles to user A
    v_result := auto_assign_roles_on_creation(v_ch_id, v_user_a, 'LIGHTWEIGHT', 'MP');

    -- Complete Phase 1
    v_result := complete_phase(v_user_a, v_ch_id);

    -- Check: should be at Phase 7, master_status=ACTIVE
    SELECT current_phase, master_status, published_at
    INTO v_phase, v_master, v_pub
    FROM challenges WHERE id = v_ch_id;

    -- Check audit for AUTO_COMPLETE entries on phases 2,3,4,5
    SELECT COUNT(*) INTO v_count
    FROM audit_trail
    WHERE challenge_id = v_ch_id AND action = 'PHASE_AUTO_COMPLETED';

    v_pass := (v_phase = 7 AND v_master = 'ACTIVE' AND v_pub IS NOT NULL AND v_count >= 4);

    RAISE NOTICE 'T04-01: Solo auto-chain → Phase %, master=%, published=%, auto_completed_count=% — %',
      v_phase, v_master, (v_pub IS NOT NULL), v_count,
      CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-01: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-02: Two users: stops at Phase 3
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status, master_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-02 Two users', 'LIGHTWEIGHT', 'MP', 1, 'ACTIVE', 'DRAFT');

    -- User A has CR (phase 2)
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (v_user_a, v_ch_id, 'CR', v_user_a, true, true);
    -- User B has CU (phase 3) and ID (phase 4)
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (v_user_b, v_ch_id, 'CU', v_user_a, true, true);
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (v_user_b, v_ch_id, 'ID', v_user_a, true, true);

    -- Phase 1 has no required role (or NULL) — let's set it to phase 2 directly for this test
    -- Actually phase 1 maps to... let me check get_phase_required_role
    -- Phase 1 = AM or RQ. User A needs AM role for phase 1.
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (v_user_a, v_ch_id, 'AM', v_user_a, true, true);

    -- Complete Phase 1 (User A has AM)
    v_result := complete_phase(v_user_a, v_ch_id);

    -- User A also has CR (phase 2), so it should auto-complete phase 2
    -- Then stop at phase 3 (CU = User B)
    SELECT current_phase, phase_status INTO v_phase, v_status
    FROM challenges WHERE id = v_ch_id;

    v_pass := (v_phase = 3 AND v_status = 'ACTIVE');

    RAISE NOTICE 'T04-02: Two users → Phase %, status=% — %',
      v_phase, v_status,
      CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-02: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-03: Audit: HUMAN for manual
  -- ══════════════════════════════════════════
  BEGIN
    -- Use the T04-02 challenge — check audit for PHASE_COMPLETED with method=HUMAN
    SELECT COUNT(*) INTO v_count
    FROM audit_trail
    WHERE challenge_id = v_test_challenges[2]
      AND action = 'PHASE_COMPLETED'
      AND method = 'HUMAN';

    v_pass := (v_count >= 1);

    RAISE NOTICE 'T04-03: Audit HUMAN count=% — %',
      v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-03: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-04: Audit: AUTO_COMPLETE for auto
  -- ══════════════════════════════════════════
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM audit_trail
    WHERE challenge_id = v_test_challenges[2]
      AND action = 'PHASE_AUTO_COMPLETED'
      AND method = 'AUTO_COMPLETE'
      AND details->>'reason' = 'SAME_ACTOR';

    v_pass := (v_count >= 1);

    RAISE NOTICE 'T04-04: Audit AUTO_COMPLETE+SAME_ACTOR count=% — %',
      v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-04: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-05: Phase 5 to 7: master_status=ACTIVE
  -- ══════════════════════════════════════════
  BEGIN
    -- Use T04-01 challenge which already went to phase 7
    SELECT master_status, published_at INTO v_master, v_pub
    FROM challenges WHERE id = v_test_challenges[1];

    v_pass := (v_master = 'ACTIVE' AND v_pub IS NOT NULL);

    RAISE NOTICE 'T04-05: Phase 5→7 master=%, published=% — %',
      v_master, (v_pub IS NOT NULL),
      CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-05: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-06: Lightweight auto-assigns all 8 roles
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-06 LW auto-assign', 'LIGHTWEIGHT', 'MP', 1, 'ACTIVE');

    v_result := auto_assign_roles_on_creation(v_ch_id, v_user_a, 'LIGHTWEIGHT', 'MP');

    SELECT COUNT(*) INTO v_count
    FROM user_challenge_roles
    WHERE challenge_id = v_ch_id AND auto_assigned = true;

    v_pass := (v_count = 8);

    RAISE NOTICE 'T04-06: LW MP auto-assigned count=% (expect 8) — %',
      v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-06: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-07: Enterprise auto-assigns only AM/CR
  -- ══════════════════════════════════════════
  BEGIN
    -- Enterprise MP → only AM
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-07a ENT MP', 'ENTERPRISE', 'MP', 1, 'ACTIVE');

    v_result := auto_assign_roles_on_creation(v_ch_id, v_user_a, 'ENTERPRISE', 'MP');

    SELECT COUNT(*), string_agg(role_code, ',') INTO v_count, v_status
    FROM user_challenge_roles WHERE challenge_id = v_ch_id;

    v_pass := (v_count = 1 AND v_status = 'AM');

    RAISE NOTICE 'T04-07a: ENT MP → roles=% count=% — %',
      v_status, v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

    -- Enterprise AGG → only CR
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-07b ENT AGG', 'ENTERPRISE', 'AGG', 1, 'ACTIVE');

    v_result := auto_assign_roles_on_creation(v_ch_id, v_user_a, 'ENTERPRISE', 'AGG');

    SELECT COUNT(*), string_agg(role_code, ',') INTO v_count, v_status
    FROM user_challenge_roles WHERE challenge_id = v_ch_id;

    v_pass := (v_count = 1 AND v_status = 'CR');

    RAISE NOTICE 'T04-07b: ENT AGG → roles=% count=% — %',
      v_status, v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-07: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-08: AGG Phase 1 bypass
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status, created_by)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-08 AGG bypass', 'ENTERPRISE', 'AGG', 1, 'ACTIVE', v_user_a);

    PERFORM handle_phase1_bypass(v_ch_id, 'AGG', false);

    SELECT current_phase INTO v_phase FROM challenges WHERE id = v_ch_id;

    SELECT COUNT(*) INTO v_count
    FROM audit_trail
    WHERE challenge_id = v_ch_id AND action = 'PHASE_BYPASSED'
      AND details->>'reason' = 'AGG_PHASE1_BYPASS';

    v_pass := (v_phase = 2 AND v_count = 1);

    RAISE NOTICE 'T04-08: AGG bypass → phase=%, audit_count=% — %',
      v_phase, v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-08: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-09: 3-person scenario (Alice, Bob, Carol)
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status, master_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-09 3-person', 'LIGHTWEIGHT', 'MP', 1, 'ACTIVE', 'DRAFT');

    -- Alice (user_a): CR (phase 2), LC (phase 9), AM (phase 1)
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned) VALUES
      (v_user_a, v_ch_id, 'AM', v_user_a, true, true),
      (v_user_a, v_ch_id, 'CR', v_user_a, true, true),
      (v_user_a, v_ch_id, 'LC', v_user_a, true, true);

    -- Bob (user_b): CU (phase 3), ID (phase 4)
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned) VALUES
      (v_user_b, v_ch_id, 'CU', v_user_a, true, true),
      (v_user_b, v_ch_id, 'ID', v_user_a, true, true);

    -- Carol (user_c): ER (phase 5), FC (phase 10)
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned) VALUES
      (v_user_c, v_ch_id, 'ER', v_user_a, true, true),
      (v_user_c, v_ch_id, 'FC', v_user_a, true, true);

    -- Alice completes Phase 1 (AM). Should auto-complete Phase 2 (CR=Alice). Stop at Phase 3 (CU=Bob).
    v_result := complete_phase(v_user_a, v_ch_id);

    SELECT current_phase INTO v_phase FROM challenges WHERE id = v_ch_id;

    IF v_phase != 3 THEN
      RAISE NOTICE 'T04-09: FAIL ✗ — After Alice, expected phase 3 got %', v_phase;
    ELSE
      -- Bob completes Phase 3 (CU). Should auto-complete Phase 4 (ID=Bob). Stop at Phase 5 (ER=Carol).
      v_result := complete_phase(v_user_b, v_ch_id);

      SELECT current_phase INTO v_phase FROM challenges WHERE id = v_ch_id;

      v_pass := (v_phase = 5);

      RAISE NOTICE 'T04-09: 3-person → after Bob phase=% (expect 5) — %',
        v_phase, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-09: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-10: 8-person: no auto-complete
  -- ══════════════════════════════════════════
  BEGIN
    v_ch_id := gen_random_uuid();
    v_test_challenges := v_test_challenges || v_ch_id;

    INSERT INTO challenges (id, organization_id, tenant_id, title, governance_profile, operating_model, current_phase, phase_status, master_status)
    VALUES (v_ch_id, v_org_id, v_org_id, 'T04-10 8-person', 'LIGHTWEIGHT', 'MP', 1, 'ACTIVE', 'DRAFT');

    -- We only have 3 auth users. Assign each phase to a unique user where possible.
    -- Phase 1=AM(A), Phase 2=CR(B), Phase 3=CU(C) — that's enough to verify no auto-complete
    INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned) VALUES
      (v_user_a, v_ch_id, 'AM', v_user_a, true, true),
      (v_user_b, v_ch_id, 'CR', v_user_a, true, true),
      (v_user_c, v_ch_id, 'CU', v_user_a, true, true);

    -- User A completes phase 1 → should stop at phase 2 (CR=B, not A)
    v_result := complete_phase(v_user_a, v_ch_id);

    SELECT current_phase INTO v_phase FROM challenges WHERE id = v_ch_id;

    SELECT COUNT(*) INTO v_count
    FROM audit_trail
    WHERE challenge_id = v_ch_id AND action = 'PHASE_AUTO_COMPLETED';

    v_pass := (v_phase = 2 AND v_count = 0);

    RAISE NOTICE 'T04-10: 8-person → phase=%, auto_complete_count=% — %',
      v_phase, v_count,
      CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-10: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-11: SLA timer created at handoff
  -- ══════════════════════════════════════════
  BEGIN
    -- From T04-10: phase advanced from 1→2 with different user. Check SLA timer.
    SELECT COUNT(*) INTO v_count
    FROM sla_timers
    WHERE challenge_id = v_test_challenges[8]  -- T04-10 challenge
      AND phase = 2
      AND status = 'ACTIVE'
      AND deadline_at IS NOT NULL;

    v_pass := (v_count >= 1);

    RAISE NOTICE 'T04-11: SLA timer at handoff count=% — %',
      v_count, CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-11: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- T04-12: REGRESSION: T01+T02+T03 functions exist and callable
  -- ══════════════════════════════════════════
  BEGIN
    v_pass := true;

    -- Check all core functions exist
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'can_perform', 'get_phase_required_role',
        'validate_role_assignment', 'assign_role_to_challenge', 'reassign_role',
        'auto_assign_roles_on_creation', 'handle_phase1_bypass', 'complete_phase'
      );

    IF v_count < 8 THEN v_pass := false; END IF;

    -- Quick smoke test: get_phase_required_role
    DECLARE v_role TEXT;
    BEGIN
      SELECT get_phase_required_role(2) INTO v_role;
      IF v_role != 'CR' THEN v_pass := false; END IF;
    END;

    RAISE NOTICE 'T04-12: Regression — functions_found=%, smoke_ok=% — %',
      v_count, v_pass,
      CASE WHEN v_pass THEN 'PASS ✓' ELSE 'FAIL ✗' END;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T04-12: FAIL ✗ — %', SQLERRM;
  END;

  -- ══════════════════════════════════════════
  -- CLEANUP
  -- ══════════════════════════════════════════
  RAISE NOTICE '──────────────────────────────────────────────';
  RAISE NOTICE 'CLEANUP: Removing % test challenges', array_length(v_test_challenges, 1);

  DELETE FROM cogni_notifications WHERE challenge_id = ANY(v_test_challenges);
  DELETE FROM sla_timers WHERE challenge_id = ANY(v_test_challenges);
  DELETE FROM audit_trail WHERE challenge_id = ANY(v_test_challenges);
  DELETE FROM user_challenge_roles WHERE challenge_id = ANY(v_test_challenges);
  DELETE FROM challenges WHERE id = ANY(v_test_challenges);

  RAISE NOTICE 'CLEANUP: Done';
  RAISE NOTICE '══════════════════════════════════════════════';

END;
$$;
