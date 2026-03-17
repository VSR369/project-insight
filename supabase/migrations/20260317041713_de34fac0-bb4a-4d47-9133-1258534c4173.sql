
-- T01-05: Add eligibility column to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS eligibility text;

-- T01-04: Add subscription_tier to seeker_organizations
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'standard';

-- T01-14: Create missing index on user_challenge_roles
CREATE INDEX IF NOT EXISTS idx_ucr_user_challenge
  ON public.user_challenge_roles(user_id, challenge_id, is_active);
