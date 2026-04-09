ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS creator_legal_instructions TEXT;

COMMENT ON COLUMN public.challenges.creator_legal_instructions IS 'Free-text legal instructions from Creator to Curator/LC. Shown as guidance during legal review phase.';