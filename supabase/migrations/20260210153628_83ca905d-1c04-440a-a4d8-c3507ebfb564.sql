
-- ================================================================
-- pg_cron Jobs: Monthly Counter Reset + Membership Expiry (BIL-001, MEM-001)
-- ================================================================

-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 1. Function: Reset challenge counters at the start of each billing period
CREATE OR REPLACE FUNCTION public.reset_challenge_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE seeker_subscriptions
  SET
    challenges_used = 0,
    updated_at = NOW()
  WHERE
    is_active = TRUE
    AND current_period_end <= NOW();

  -- Advance the billing period
  UPDATE seeker_subscriptions
  SET
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month',
    updated_at = NOW()
  WHERE
    is_active = TRUE
    AND current_period_end <= NOW();
END;
$$;

-- 2. Function: Process pending downgrades at period end
CREATE OR REPLACE FUNCTION public.process_pending_downgrades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE seeker_subscriptions
  SET
    tier_id = pending_downgrade_tier_id,
    pending_downgrade_tier_id = NULL,
    pending_downgrade_date = NULL,
    updated_at = NOW()
  WHERE
    is_active = TRUE
    AND pending_downgrade_tier_id IS NOT NULL
    AND pending_downgrade_date <= NOW();
END;
$$;

-- 3. Function: Check membership expiry and set expired status
CREATE OR REPLACE FUNCTION public.process_membership_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Expire memberships past their end date
  UPDATE seeker_memberships
  SET
    lifecycle_status = 'expired',
    updated_at = NOW()
  WHERE
    lifecycle_status = 'active'
    AND end_date < NOW();

  -- Auto-renew memberships that have auto_renew = true
  UPDATE seeker_memberships
  SET
    start_date = end_date,
    end_date = end_date + INTERVAL '1 year',
    lifecycle_status = 'active',
    updated_at = NOW()
  WHERE
    lifecycle_status = 'expired'
    AND auto_renew = TRUE;
END;
$$;

-- 4. Schedule the jobs (daily at 00:05 UTC)
SELECT cron.schedule(
  'daily-counter-reset',
  '5 0 * * *',
  $$SELECT public.reset_challenge_counters()$$
);

SELECT cron.schedule(
  'daily-downgrade-processing',
  '10 0 * * *',
  $$SELECT public.process_pending_downgrades()$$
);

SELECT cron.schedule(
  'daily-membership-expiry',
  '15 0 * * *',
  $$SELECT public.process_membership_expiry()$$
);
