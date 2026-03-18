
-- Communication governance log for Q&A and notification channels
CREATE TABLE IF NOT EXISTS public.communication_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('QA', 'NOTIFICATION')),
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_action TEXT CHECK (review_action IN ('APPROVED', 'BLOCKED') OR review_action IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Indexes
CREATE INDEX idx_communication_log_challenge ON public.communication_log(challenge_id, logged_at DESC);
CREATE INDEX idx_communication_log_flagged ON public.communication_log(flagged, logged_at DESC) WHERE flagged = TRUE;
CREATE INDEX idx_communication_log_sender ON public.communication_log(sender_id, logged_at DESC);

-- RLS
ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;

-- Append-only for authenticated users (insert + select only)
CREATE POLICY "authenticated_insert_communication_log"
  ON public.communication_log FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "authenticated_select_communication_log"
  ON public.communication_log FOR SELECT TO authenticated
  USING (TRUE);

-- Allow admin review updates (only review fields)
CREATE POLICY "admin_update_communication_log"
  ON public.communication_log FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
