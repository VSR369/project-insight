-- Add hook and effort_level columns to challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS hook TEXT,
  ADD COLUMN IF NOT EXISTS effort_level TEXT;

-- Add comment
COMMENT ON COLUMN public.challenges.hook IS 'Short compelling hook / tagline for the challenge';
COMMENT ON COLUMN public.challenges.effort_level IS 'Estimated effort level: low, medium, high, very_high';