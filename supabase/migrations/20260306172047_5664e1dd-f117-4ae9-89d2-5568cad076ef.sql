
-- GAP-7: Create notification_retry_queue table for BR-MPA-046 email retry logic
CREATE TABLE IF NOT EXISTS public.notification_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_audit_log_id UUID NOT NULL REFERENCES public.notification_audit_log(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  verification_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'exhausted')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.notification_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (system-only table)
CREATE POLICY "Service role only" ON public.notification_retry_queue
  FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_retry_queue_pending
  ON public.notification_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'processing');

-- GAP-17: Add CHECK constraint on open_queue_entries.fallback_reason
ALTER TABLE public.open_queue_entries
  DROP CONSTRAINT IF EXISTS chk_open_queue_fallback_reason;

ALTER TABLE public.open_queue_entries
  ADD CONSTRAINT chk_open_queue_fallback_reason
  CHECK (fallback_reason IN ('NO_ELIGIBLE_ADMIN', 'NO_INDUSTRY_MATCH', 'REASSIGNMENT_OVERFLOW', 'ADMIN_RELEASED'));
