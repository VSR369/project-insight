-- =====================================================
-- Migration: Extend panel_reviewers for invitation lifecycle
-- Adds identity, invitation workflow, and preference fields
-- =====================================================

-- 1. Add new columns for identity and invitation lifecycle
ALTER TABLE public.panel_reviewers
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS invitation_channel VARCHAR(10) DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS invitation_message TEXT,
  ADD COLUMN IF NOT EXISTS invitation_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invitation_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Calcutta',
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add CHECK constraint for invitation_status
ALTER TABLE public.panel_reviewers
  ADD CONSTRAINT chk_panel_reviewers_invitation_status 
  CHECK (invitation_status IN ('DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'EXPIRED'));

-- 3. Add CHECK constraint for invitation_channel
ALTER TABLE public.panel_reviewers
  ADD CONSTRAINT chk_panel_reviewers_invitation_channel 
  CHECK (invitation_channel IN ('email', 'sms', 'both'));

-- 4. Add unique constraint on email (already exists implicitly, make explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_panel_reviewer_email'
  ) THEN
    ALTER TABLE public.panel_reviewers
      ADD CONSTRAINT unique_panel_reviewer_email UNIQUE (email);
  END IF;
END $$;

-- 5. Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_panel_reviewers_invitation_status 
  ON public.panel_reviewers(invitation_status, is_active);

CREATE INDEX IF NOT EXISTS idx_panel_reviewers_user_id 
  ON public.panel_reviewers(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_panel_reviewers_email_active 
  ON public.panel_reviewers(email, is_active);