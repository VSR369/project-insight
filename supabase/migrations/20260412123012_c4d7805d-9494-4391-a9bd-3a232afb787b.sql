ALTER TABLE public.challenge_attachments
  ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'unknown';

ALTER TABLE public.challenge_attachments
  ADD CONSTRAINT chk_challenge_attachments_access_status
  CHECK (access_status IN ('accessible', 'blocked', 'paywall', 'failed', 'unknown'));

COMMENT ON COLUMN public.challenge_attachments.access_status IS
  'Result of HEAD pre-check during discovery: accessible | blocked | paywall | failed | unknown';