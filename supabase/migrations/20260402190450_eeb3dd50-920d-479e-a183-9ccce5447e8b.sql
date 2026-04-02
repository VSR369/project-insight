-- Clamp governance_profile to tier-allowed values.
-- Basic (or no subscription) → only QUICK allowed
-- Standard → QUICK or STRUCTURED allowed
-- Premium / Enterprise → all modes allowed

-- 1. Basic tier or no subscription: reset CONTROLLED/STRUCTURED → QUICK
UPDATE public.seeker_organizations so
SET governance_profile = 'QUICK',
    updated_at = now()
WHERE so.governance_profile IN ('CONTROLLED', 'STRUCTURED')
  AND NOT EXISTS (
    SELECT 1
    FROM public.seeker_subscriptions ss
    JOIN public.md_subscription_tiers mt ON mt.id = ss.tier_id
    WHERE ss.organization_id = so.id
      AND mt.code IN ('standard', 'premium', 'enterprise')
  );

-- 2. Standard tier: reset CONTROLLED → STRUCTURED
UPDATE public.seeker_organizations so
SET governance_profile = 'STRUCTURED',
    updated_at = now()
WHERE so.governance_profile = 'CONTROLLED'
  AND EXISTS (
    SELECT 1
    FROM public.seeker_subscriptions ss
    JOIN public.md_subscription_tiers mt ON mt.id = ss.tier_id
    WHERE ss.organization_id = so.id
      AND mt.code = 'standard'
  );