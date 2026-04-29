-- =========================================================================
-- Phase 10g — RLS regression harness for `enterprise_agreements`
--
-- THIS FILE IS NOT A MIGRATION. Do not place it under supabase/migrations.
-- It is a manual / CI-driven SQL test that creates fixtures, asserts the
-- expected behaviour of every RLS policy on `enterprise_agreements`, then
-- ROLLBACKs the entire transaction so nothing persists.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f supabase/tests/enterprise_agreements_rls.test.sql
--
-- The whole script is wrapped in a single transaction. The final statement
-- is ROLLBACK, so a green run leaves the database untouched. A red run
-- (any RAISE EXCEPTION below) also rolls back.
--
-- WHAT THIS PROVES
--   1. Platform supervisors / senior_admins can SELECT and INSERT.
--   2. Active org PRIMARY admins can SELECT only their own org's row.
--   3. DELEGATED admins, deactivated PRIMARY admins, and authenticated
--      users with no admin row see ZERO rows.
--   4. PRIMARY admins cannot INSERT or UPDATE.
--
-- VALID FIXTURE VALUES (taken from current CHECK constraints):
--   seeker_organizations.governance_profile  ∈ {QUICK, STRUCTURED, CONTROLLED}
--   seeking_org_admins.admin_tier            ∈ {PRIMARY, DELEGATED}
--   seeking_org_admins.status                ∈ {pending_activation, active,
--                                               suspended, transferred,
--                                               deactivated}
--   seeking_org_admins.designation_method    ∈ {SELF, SEPARATE, DELEGATED,
--                                               TRANSFER}
--
-- PREREQUISITES (in the target DB):
--   * md_subscription_tiers row with code = 'basic'
--   * platform_admin_profiles rows for at least one supervisor and one
--     senior_admin (these are real users)
--   * at least 5 auth.users rows that are NOT platform admins and NOT
--     existing seeking_org_admins (used as fixture org-admins + stranger)
--
-- If those prerequisites are missing, the script fails fast with a clear
-- RAISE EXCEPTION rather than silently skipping.
-- =========================================================================

BEGIN;

DO $$
DECLARE
  v_supervisor_uid       uuid;
  v_senior_uid           uuid;
  v_org_a_primary_uid    uuid;
  v_org_b_primary_uid    uuid;
  v_org_a_delegated_uid  uuid;
  v_org_a_deactiv_uid    uuid;
  v_random_authed_uid    uuid;

  v_org_a_id             uuid := '00000000-0000-0000-0000-0000000b0001';
  v_org_b_id             uuid := '00000000-0000-0000-0000-0000000b0002';
  v_tenant_a_id          uuid := '00000000-0000-0000-0000-0000000c0001';
  v_tenant_b_id          uuid := '00000000-0000-0000-0000-0000000c0002';

  v_agreement_a_id       uuid := '00000000-0000-0000-0000-0000000d0001';
  v_agreement_b_id       uuid := '00000000-0000-0000-0000-0000000d0002';

  v_tier_id              uuid;
  v_count                int;
  v_failed               boolean;
  v_scenario             text;
  v_pool_uids            uuid[];
BEGIN
  -- Don't collide with leftover fixtures from a prior interrupted run
  IF EXISTS (SELECT 1 FROM public.enterprise_agreements
             WHERE id IN (v_agreement_a_id, v_agreement_b_id))
     OR EXISTS (SELECT 1 FROM public.seeker_organizations
                WHERE id IN (v_org_a_id, v_org_b_id)) THEN
    RAISE EXCEPTION 'Phase 10g harness: fixture ids already in use';
  END IF;

  SELECT id INTO v_tier_id
    FROM public.md_subscription_tiers
   WHERE code = 'basic'
   LIMIT 1;
  IF v_tier_id IS NULL THEN
    RAISE EXCEPTION 'Phase 10g harness: md_subscription_tiers.basic missing';
  END IF;

  SELECT user_id INTO v_supervisor_uid
    FROM public.platform_admin_profiles
   WHERE admin_tier = 'supervisor'
   LIMIT 1;
  SELECT user_id INTO v_senior_uid
    FROM public.platform_admin_profiles
   WHERE admin_tier = 'senior_admin'
   LIMIT 1;
  IF v_supervisor_uid IS NULL OR v_senior_uid IS NULL THEN
    RAISE EXCEPTION
      'Phase 10g harness: need at least one supervisor and one senior_admin '
      'in platform_admin_profiles';
  END IF;

  SELECT array_agg(id)
    INTO v_pool_uids
    FROM (
      SELECT u.id
        FROM auth.users u
       WHERE u.id NOT IN (
               SELECT user_id FROM public.platform_admin_profiles
                WHERE user_id IS NOT NULL
             )
         AND u.id NOT IN (
               SELECT user_id FROM public.seeking_org_admins
                WHERE user_id IS NOT NULL
             )
       ORDER BY u.id
       LIMIT 5
    ) sub;

  IF v_pool_uids IS NULL OR array_length(v_pool_uids, 1) < 5 THEN
    RAISE EXCEPTION
      'Phase 10g harness: need >=5 unaffiliated auth.users; found %',
      COALESCE(array_length(v_pool_uids, 1), 0);
  END IF;

  v_org_a_primary_uid    := v_pool_uids[1];
  v_org_b_primary_uid    := v_pool_uids[2];
  v_org_a_delegated_uid  := v_pool_uids[3];
  v_org_a_deactiv_uid    := v_pool_uids[4];
  v_random_authed_uid    := v_pool_uids[5];

  -- ---- fixture orgs --------------------------------------------------
  INSERT INTO public.seeker_organizations
    (id, tenant_id, organization_name, governance_profile)
  VALUES
    (v_org_a_id, v_tenant_a_id, 'P10g Test Org A', 'QUICK'),
    (v_org_b_id, v_tenant_b_id, 'P10g Test Org B', 'QUICK');

  -- ---- fixture org admins -------------------------------------------
  INSERT INTO public.seeking_org_admins
    (organization_id, user_id, admin_tier, status, domain_scope,
     designation_method, full_name, email, created_by)
  VALUES
    (v_org_a_id, v_org_a_primary_uid,   'PRIMARY',   'active',
       '{}'::jsonb, 'SELF', 'A Primary',     'a-pri@p10g.test', v_supervisor_uid),
    (v_org_b_id, v_org_b_primary_uid,   'PRIMARY',   'active',
       '{}'::jsonb, 'SELF', 'B Primary',     'b-pri@p10g.test', v_supervisor_uid),
    (v_org_a_id, v_org_a_delegated_uid, 'DELEGATED', 'active',
       '{}'::jsonb, 'SELF', 'A Delegated',   'a-del@p10g.test', v_supervisor_uid),
    (v_org_a_id, v_org_a_deactiv_uid,   'PRIMARY',   'deactivated',
       '{}'::jsonb, 'SELF', 'A Deactivated', 'a-dea@p10g.test', v_supervisor_uid);

  -- ---- fixture agreements (insert as supervisor to satisfy WITH CHECK)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supervisor_uid, 'role', 'authenticated')::text,
    true);
  PERFORM set_config('role', 'authenticated', true);

  INSERT INTO public.enterprise_agreements
    (id, organization_id, tier_id, agreement_status, acv_amount)
  VALUES
    (v_agreement_a_id, v_org_a_id, v_tier_id, 'draft', 100000),
    (v_agreement_b_id, v_org_b_id, v_tier_id, 'draft', 200000);

  -- =====================================================================
  -- SCENARIOS
  -- =====================================================================

  -- S1: supervisor sees both
  v_scenario := 'S1 supervisor sees both';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supervisor_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 2, got %', v_scenario, v_count;
  END IF;

  -- S2: senior_admin sees both
  v_scenario := 'S2 senior_admin sees both';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_senior_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 2, got %', v_scenario, v_count;
  END IF;

  -- S3: org A PRIMARY sees only org A
  v_scenario := 'S3 org A PRIMARY sees only org A';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_a_primary_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 1, got %', v_scenario, v_count;
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id = v_agreement_b_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%/cross-org]: expected 0, got %',
      v_scenario, v_count;
  END IF;

  -- S4: org B PRIMARY sees only org B
  v_scenario := 'S4 org B PRIMARY sees only org B';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_b_primary_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 1, got %', v_scenario, v_count;
  END IF;

  -- S5: DELEGATED admin sees zero
  v_scenario := 'S5 DELEGATED admin sees zero';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_a_delegated_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 0, got %', v_scenario, v_count;
  END IF;

  -- S6: deactivated PRIMARY sees zero
  v_scenario := 'S6 deactivated PRIMARY sees zero';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_a_deactiv_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 0, got %', v_scenario, v_count;
  END IF;

  -- S7: stranger sees zero
  v_scenario := 'S7 authenticated stranger sees zero';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_random_authed_uid, 'role', 'authenticated')::text,
    true);
  SELECT COUNT(*) INTO v_count FROM public.enterprise_agreements
    WHERE id IN (v_agreement_a_id, v_agreement_b_id);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: expected 0, got %', v_scenario, v_count;
  END IF;

  -- S8: org A PRIMARY INSERT denied (no INSERT policy for org admins)
  v_scenario := 'S8 org A PRIMARY INSERT denied';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_a_primary_uid, 'role', 'authenticated')::text,
    true);
  v_failed := false;
  BEGIN
    INSERT INTO public.enterprise_agreements
      (organization_id, tier_id, agreement_status)
    VALUES (v_org_a_id, v_tier_id, 'draft');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN v_failed := true;
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN v_failed := true; ELSE RAISE; END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: insert was permitted', v_scenario;
  END IF;

  -- S9: org A PRIMARY UPDATE denied (RLS UPDATE filter -> 0 rows or 42501)
  v_scenario := 'S9 org A PRIMARY UPDATE denied';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_org_a_primary_uid, 'role', 'authenticated')::text,
    true);
  v_failed := false;
  BEGIN
    UPDATE public.enterprise_agreements
       SET notes = 'p10g should not write'
     WHERE id = v_agreement_a_id;
    IF NOT FOUND THEN v_failed := true; END IF;
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN v_failed := true;
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN v_failed := true; ELSE RAISE; END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'P10g RLS FAIL [%]: update was permitted', v_scenario;
  END IF;

  -- S10: supervisor INSERT succeeds
  v_scenario := 'S10 supervisor INSERT succeeds';
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supervisor_uid, 'role', 'authenticated')::text,
    true);
  INSERT INTO public.enterprise_agreements
    (organization_id, tier_id, agreement_status)
  VALUES (v_org_a_id, v_tier_id, 'draft');

  RAISE NOTICE 'Phase 10g RLS regression: ALL 10 SCENARIOS PASSED';
END;
$$;

-- Always discard fixtures, even on success.
ROLLBACK;
