-- Drop the legacy unique constraint that blocks multiple SOURCE_DOC uploads.
ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS uq_challenge_legal_docs_type_tier;

-- Drop any prior partial index so we can re-create cleanly (idempotent).
DROP INDEX IF EXISTS public.uq_challenge_legal_docs_unified_per_tier;

-- Keep one non-SOURCE_DOC row per (challenge, type, tier); allow unlimited SOURCE_DOC rows.
CREATE UNIQUE INDEX uq_challenge_legal_docs_unified_per_tier
  ON public.challenge_legal_docs (challenge_id, document_type, tier)
  WHERE document_type <> 'SOURCE_DOC';