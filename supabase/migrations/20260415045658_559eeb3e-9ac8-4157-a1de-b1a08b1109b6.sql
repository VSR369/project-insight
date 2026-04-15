-- Widen visibility column to TEXT to prevent varchar(20) truncation errors
ALTER TABLE public.challenges
  ALTER COLUMN visibility TYPE TEXT;

-- Add extraction_quality column for Context Library quality gating
ALTER TABLE public.challenge_attachments
  ADD COLUMN IF NOT EXISTS extraction_quality TEXT NOT NULL DEFAULT 'pending';

-- Add index for filtering by extraction quality
CREATE INDEX IF NOT EXISTS idx_challenge_attachments_extraction_quality
  ON public.challenge_attachments (challenge_id, extraction_quality);