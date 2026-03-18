
-- Add 3-tier publication config columns to challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS challenge_visibility TEXT,
  ADD COLUMN IF NOT EXISTS challenge_enrollment TEXT,
  ADD COLUMN IF NOT EXISTS challenge_submission TEXT;

CREATE INDEX IF NOT EXISTS idx_challenges_enrollment ON public.challenges(challenge_enrollment);
