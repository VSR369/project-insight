ALTER TABLE public.challenge_legal_docs
ADD COLUMN IF NOT EXISTS override_strategy TEXT,
ADD COLUMN IF NOT EXISTS target_template_code TEXT;

CREATE INDEX IF NOT EXISTS idx_challenge_legal_docs_quick_override
ON public.challenge_legal_docs (challenge_id, created_at DESC)
WHERE document_type = 'SOURCE_DOC'
  AND source_origin = 'creator'
  AND override_strategy = 'REPLACE_DEFAULT'
  AND target_template_code = 'CPA_QUICK';