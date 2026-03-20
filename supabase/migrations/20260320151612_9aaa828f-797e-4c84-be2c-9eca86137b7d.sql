-- Drop redundant challenge_enrollment and challenge_submission columns from challenges table
-- These fields are being replaced by a simplified solver-type-driven access model:
--   - Eligible Solvers: Can view AND submit solutions (defined by solver_eligibility_ids)
--   - Visible Solvers: Can only view/discover (defined by challenge_visibility)

ALTER TABLE public.challenges DROP COLUMN IF EXISTS challenge_enrollment;
ALTER TABLE public.challenges DROP COLUMN IF EXISTS challenge_submission;