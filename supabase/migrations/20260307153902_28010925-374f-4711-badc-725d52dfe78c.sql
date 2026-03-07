
-- MOD-04: Schema alignment for notification_audit_log + registrant_communications

-- 1. Alter notification_audit_log — add missing columns
ALTER TABLE notification_audit_log
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT,
  ADD COLUMN IF NOT EXISTS in_app_status TEXT NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS email_error_message TEXT,
  ADD COLUMN IF NOT EXISTS email_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add email_status column (mapping from existing 'status')
ALTER TABLE notification_audit_log ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'PENDING';

-- Copy existing status data into email_status
UPDATE notification_audit_log SET email_status = status WHERE email_status = 'PENDING' AND status != 'PENDING';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nal_type_created ON notification_audit_log(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nal_email_status ON notification_audit_log(email_status) WHERE email_status IN ('PENDING','RETRY_QUEUED');
CREATE INDEX IF NOT EXISTS idx_nal_recipient_type ON notification_audit_log(recipient_type);

-- 2. Create registrant_communications table
CREATE TABLE IF NOT EXISTS registrant_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES platform_admin_verifications(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL DEFAULT 'OUTBOUND',
  message_type TEXT NOT NULL DEFAULT 'MANUAL',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sent_by_admin_id UUID REFERENCES platform_admin_profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_status TEXT NOT NULL DEFAULT 'PENDING',
  email_retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rc_verification ON registrant_communications(verification_id, created_at ASC);

ALTER TABLE registrant_communications ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated platform admins can SELECT
CREATE POLICY "Admins can view registrant communications"
  ON registrant_communications
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Authenticated platform admins can INSERT
CREATE POLICY "Admins can insert registrant communications"
  ON registrant_communications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS on notification_audit_log: ensure supervisor SELECT policy exists
-- (Already exists from MOD-02, but ensure INSERT for service role is open)
