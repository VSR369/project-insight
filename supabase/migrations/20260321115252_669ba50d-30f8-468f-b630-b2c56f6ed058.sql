ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS content_summary text,
  ADD COLUMN IF NOT EXISTS rationale text,
  ADD COLUMN IF NOT EXISTS priority text;