
-- Step 1: Update existing orgs to sync max_concurrent_active from their tier
UPDATE seeker_organizations so
SET max_concurrent_active = COALESCE(t.max_challenges, 999999),
    max_cumulative_quota = COALESCE(t.max_challenges * 10, 999999)
FROM md_subscription_tiers t
WHERE so.subscription_tier = t.code;

-- Step 2: Also update any orgs with NULL subscription_tier to generous defaults
UPDATE seeker_organizations
SET max_concurrent_active = 999999,
    max_cumulative_quota = 999999
WHERE subscription_tier IS NULL OR subscription_tier = '';

-- Step 3: Replace check_tier_limit to read from md_subscription_tiers directly
CREATE OR REPLACE FUNCTION public.check_tier_limit(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_count INTEGER;
  v_cumulative_count INTEGER;
  v_max_concurrent INTEGER;
  v_max_cumulative INTEGER;
  v_tier_code TEXT;
  v_tier_name TEXT;
BEGIN
  -- Get org's subscription tier
  SELECT subscription_tier
  INTO v_tier_code
  FROM public.seeker_organizations
  WHERE id = p_org_id;

  IF v_tier_code IS NULL THEN
    -- Org not found or no tier — allow generously
    v_tier_name := 'Unknown';
    v_max_concurrent := 999999;
    v_max_cumulative := 999999;
  ELSE
    -- Look up tier limits from md_subscription_tiers
    SELECT COALESCE(t.max_challenges, 999999), t.name
    INTO v_max_concurrent, v_tier_name
    FROM public.md_subscription_tiers t
    WHERE t.code = v_tier_code;

    IF v_tier_name IS NULL THEN
      -- Tier code doesn't match any row — allow generously
      v_tier_name := v_tier_code;
      v_max_concurrent := 999999;
    END IF;

    v_max_cumulative := v_max_concurrent * 10;
  END IF;

  -- Count active challenges
  SELECT COUNT(*) INTO v_active_count
  FROM public.challenges
  WHERE organization_id = p_org_id AND master_status = 'ACTIVE' AND is_deleted = false;

  -- Count all (non-deleted) challenges
  SELECT COUNT(*) INTO v_cumulative_count
  FROM public.challenges
  WHERE organization_id = p_org_id AND is_deleted = false;

  RETURN jsonb_build_object(
    'allowed', (v_active_count < v_max_concurrent AND v_cumulative_count < v_max_cumulative),
    'current_active', v_active_count,
    'max_allowed', v_max_concurrent,
    'cumulative_used', v_cumulative_count,
    'max_cumulative', v_max_cumulative,
    'tier_name', v_tier_name
  );
END;
$function$;
