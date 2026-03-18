
-- Add solver_eligibility_types JSONB column to challenges
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS solver_eligibility_types jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.challenges.solver_eligibility_types IS 'Array of eligible solver types: individual, organization, solution_cluster';
