
-- Legal Re-acceptance Records
-- Tracks pending re-acceptance when post-publication amendments modify legal terms.
-- Each enrolled solver gets a record; 7-day window before enrollment paused.

CREATE TABLE IF NOT EXISTS public.legal_reacceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  amendment_id UUID NOT NULL REFERENCES public.amendment_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  deadline_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(challenge_id, amendment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_reacceptance_user_pending
  ON public.legal_reacceptance_records(user_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_legal_reacceptance_challenge
  ON public.legal_reacceptance_records(challenge_id, status);

CREATE INDEX IF NOT EXISTS idx_legal_reacceptance_deadline
  ON public.legal_reacceptance_records(deadline_at)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.legal_reacceptance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own re-acceptance records"
  ON public.legal_reacceptance_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert re-acceptance records"
  ON public.legal_reacceptance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own re-acceptance records"
  ON public.legal_reacceptance_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to expire overdue re-acceptance records and pause enrollments
-- Called by pg_cron or edge function daily
CREATE OR REPLACE FUNCTION public.expire_legal_reacceptances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired records
  WITH expired AS (
    UPDATE public.legal_reacceptance_records
    SET status = 'expired'
    WHERE status = 'pending'
      AND deadline_at < NOW()
    RETURNING user_id, challenge_id
  )
  -- Pause corresponding submissions
  UPDATE public.challenge_submissions cs
  SET status = 'PAUSED',
      updated_at = NOW()
  FROM expired e
  WHERE cs.challenge_id = e.challenge_id
    AND cs.user_id = e.user_id
    AND cs.is_deleted = false
    AND cs.status != 'PAUSED';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
