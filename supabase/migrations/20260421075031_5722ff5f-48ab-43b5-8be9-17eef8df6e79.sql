-- Backfill legacy 'arranged_only' values to canonical 'organized'
UPDATE public.challenge_legal_docs
SET ai_review_status = 'organized'
WHERE ai_review_status = 'arranged_only';

-- Replace CHECK constraint with the canonical set including 'organized'
ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS challenge_legal_docs_ai_review_status_check;

ALTER TABLE public.challenge_legal_docs
  ADD CONSTRAINT challenge_legal_docs_ai_review_status_check
  CHECK (ai_review_status IN (
    'pending','ai_suggested','accepted','rejected','stale','organized'
  ));