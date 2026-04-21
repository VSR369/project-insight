ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS chk_challenge_legal_docs_ai_review_status;

ALTER TABLE public.challenge_legal_docs
  ADD CONSTRAINT chk_challenge_legal_docs_ai_review_status
  CHECK (
    ai_review_status IS NULL
    OR ai_review_status = ANY (ARRAY[
      'pending'::text,
      'ai_suggested'::text,
      'organized'::text,
      'accepted'::text,
      'rejected'::text,
      'stale'::text
    ])
  );