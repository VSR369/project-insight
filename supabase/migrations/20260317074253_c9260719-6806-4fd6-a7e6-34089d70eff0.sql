
-- Function 1: check_tier_limit
CREATE OR REPLACE FUNCTION public.check_tier_limit(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count INTEGER;
  v_cumulative_count INTEGER;
  v_max_concurrent INTEGER;
  v_max_cumulative INTEGER;
  v_tier TEXT;
BEGIN
  SELECT max_concurrent_active, max_cumulative_quota, subscription_tier
  INTO v_max_concurrent, v_max_cumulative, v_tier
  FROM public.seeker_organizations
  WHERE id = p_org_id;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.challenges
  WHERE organization_id = p_org_id AND master_status = 'ACTIVE' AND is_deleted = false;

  SELECT COUNT(*) INTO v_cumulative_count
  FROM public.challenges
  WHERE organization_id = p_org_id AND is_deleted = false;

  RETURN jsonb_build_object(
    'allowed', (v_active_count < COALESCE(v_max_concurrent, 999999) AND v_cumulative_count < COALESCE(v_max_cumulative, 999999)),
    'current_active', v_active_count,
    'max_allowed', COALESCE(v_max_concurrent, 999999),
    'cumulative_used', v_cumulative_count,
    'max_cumulative', COALESCE(v_max_cumulative, 999999),
    'tier_name', v_tier
  );
END;
$$;

-- Function 2: get_tier_usage
CREATE OR REPLACE FUNCTION public.get_tier_usage(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.check_tier_limit(p_org_id);

  RETURN jsonb_build_object(
    'tier_name', v_result->>'tier_name',
    'active_challenges', jsonb_build_object(
      'used', (v_result->>'current_active')::int,
      'limit', (v_result->>'max_allowed')::int,
      'remaining', (v_result->>'max_allowed')::int - (v_result->>'current_active')::int,
      'percentage', CASE WHEN (v_result->>'max_allowed')::int > 0
        THEN ROUND(((v_result->>'current_active')::numeric / (v_result->>'max_allowed')::numeric) * 100, 1)
        ELSE 0 END
    ),
    'cumulative_challenges', jsonb_build_object(
      'used', (v_result->>'cumulative_used')::int,
      'limit', (v_result->>'max_cumulative')::int,
      'remaining', (v_result->>'max_cumulative')::int - (v_result->>'cumulative_used')::int,
      'percentage', CASE WHEN (v_result->>'max_cumulative')::int > 0
        THEN ROUND(((v_result->>'cumulative_used')::numeric / (v_result->>'max_cumulative')::numeric) * 100, 1)
        ELSE 0 END
    ),
    'can_create_challenge', (v_result->>'allowed')::boolean
  );
END;
$$;
