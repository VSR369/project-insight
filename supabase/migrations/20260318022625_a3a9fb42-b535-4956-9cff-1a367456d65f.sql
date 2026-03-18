
-- Add version_history JSONB column to challenge_legal_docs
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS version_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.challenge_legal_docs.version_history IS 'Array of {version, modified_by, modified_at, change_type} entries tracking document modifications';
