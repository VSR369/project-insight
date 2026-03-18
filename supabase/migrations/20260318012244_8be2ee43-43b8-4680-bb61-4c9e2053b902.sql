
-- Add ad_accepted to solver_enrollments for Anti-Disintermediation Agreement
ALTER TABLE public.solver_enrollments
  ADD COLUMN IF NOT EXISTS ad_accepted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.solver_enrollments.ad_accepted
  IS 'Whether solver accepted Anti-Disintermediation Agreement (AGG model only)';

-- Add challenge_model_is_agg derived flag to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS challenge_model_is_agg BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.challenges.challenge_model_is_agg
  IS 'Derived from operating_model=AGG; controls AD agreement requirement';

-- Add compliance_flagged to challenge_qa for BR-COM-003
ALTER TABLE public.challenge_qa
  ADD COLUMN IF NOT EXISTS compliance_flagged BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.challenge_qa
  ADD COLUMN IF NOT EXISTS compliance_flagged_at TIMESTAMPTZ;

ALTER TABLE public.challenge_qa
  ADD COLUMN IF NOT EXISTS compliance_flag_reason TEXT;

COMMENT ON COLUMN public.challenge_qa.compliance_flagged
  IS 'Whether message was flagged for containing contact info (BR-COM-003)';
