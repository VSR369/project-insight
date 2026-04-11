ALTER TABLE public.challenge_context_digest
  ADD COLUMN IF NOT EXISTS raw_context_block TEXT,
  ADD COLUMN IF NOT EXISTS raw_context_updated_at TIMESTAMPTZ;