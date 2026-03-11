
-- Seed dummy data for Solution Requests & Assignment History testing
-- Uses dynamic lookups to respect FK constraints

DO $$
DECLARE
  v_org_id UUID;
  v_tenant_id UUID;
  v_marketplace_model_id UUID;
  v_challenge_1 UUID := gen_random_uuid();
  v_challenge_2 UUID := gen_random_uuid();
  v_challenge_3 UUID := gen_random_uuid();
  v_pool_ids UUID[];
  v_i INT;
BEGIN
  -- Get a valid org + tenant
  SELECT id, id INTO v_org_id, v_tenant_id
  FROM public.seeker_organizations
  WHERE is_active = true
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Create a dummy org if none exists
    INSERT INTO public.seeker_organizations (id, legal_name, slug, country_id, is_active)
    SELECT gen_random_uuid(), 'Acme Healthcare Corp', 'acme-healthcare',
           c.id, true
    FROM public.countries c WHERE c.is_active = true LIMIT 1
    RETURNING id INTO v_org_id;
    v_tenant_id := v_org_id;
  END IF;

  -- Get marketplace engagement model (may be null — that's OK)
  SELECT id INTO v_marketplace_model_id
  FROM public.md_engagement_models
  WHERE code = 'marketplace' AND is_active = true
  LIMIT 1;

  -- Insert 3 test challenges
  INSERT INTO public.challenges (id, title, description, organization_id, tenant_id, status, engagement_model_id, created_at)
  VALUES
    (v_challenge_1, 'Patient Engagement Platform Redesign', 'Redesign patient portal for better engagement metrics', v_org_id, v_tenant_id, 'active', v_marketplace_model_id, NOW() - INTERVAL '5 days'),
    (v_challenge_2, 'AI-Driven Supply Chain Optimization', 'Implement ML-based demand forecasting for supply chain', v_org_id, v_tenant_id, 'active', v_marketplace_model_id, NOW() - INTERVAL '3 days'),
    (v_challenge_3, 'Green Energy Transition Advisory', 'Strategic advisory for renewable energy adoption', v_org_id, v_tenant_id, 'active', v_marketplace_model_id, NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- Get pool member IDs (need at least 5 for a full team)
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_pool_ids
  FROM (SELECT id, created_at FROM public.platform_provider_pool WHERE is_active = true LIMIT 7) sub;

  -- If we don't have enough pool members, skip assignments
  IF array_length(v_pool_ids, 1) >= 5 THEN
    -- Challenge 1: Full team (5 members)
    INSERT INTO public.challenge_role_assignments (challenge_id, pool_member_id, role_code, status, assigned_at)
    VALUES
      (v_challenge_1, v_pool_ids[1], 'R3', 'active', NOW() - INTERVAL '4 days'),
      (v_challenge_1, v_pool_ids[2], 'R5_MP', 'active', NOW() - INTERVAL '4 days'),
      (v_challenge_1, v_pool_ids[3], 'R6_MP', 'active', NOW() - INTERVAL '4 days'),
      (v_challenge_1, v_pool_ids[4], 'R7_MP', 'active', NOW() - INTERVAL '4 days'),
      (v_challenge_1, v_pool_ids[5], 'R7_MP', 'active', NOW() - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;

    -- Challenge 2: Partial team (3 members)
    INSERT INTO public.challenge_role_assignments (challenge_id, pool_member_id, role_code, status, assigned_at)
    VALUES
      (v_challenge_2, v_pool_ids[1], 'R3', 'active', NOW() - INTERVAL '2 days'),
      (v_challenge_2, v_pool_ids[3], 'R5_MP', 'active', NOW() - INTERVAL '2 days'),
      (v_challenge_2, v_pool_ids[5], 'R6_MP', 'active', NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Challenge 3: No assignments (pending)
END;
$$;
