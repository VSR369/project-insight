
-- Phase 1b: Add invitation lifecycle columns to role_assignments
ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS acceptance_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_role_assignments_acceptance_token
  ON role_assignments(acceptance_token) WHERE status = 'invited';
