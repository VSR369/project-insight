
-- Add targeting_filters JSONB column to challenges table
-- Stores all 8 targeting filter values for publication configuration
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS targeting_filters JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.challenges.targeting_filters IS 'JSONB storing 8 targeting filters: industries, geographies, expertise_domains, certifications, languages, min_solver_rating, past_performance, solver_cluster';
