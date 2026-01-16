-- Manager Approval Workflow columns for solution_provider_organizations
-- Per Project Knowledge Section 6: Database Design Standards

-- Add approval_status with CHECK constraint
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- Add CHECK constraint separately (safer for existing data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solution_provider_organizations_approval_status_check'
  ) THEN
    ALTER TABLE solution_provider_organizations 
    ADD CONSTRAINT solution_provider_organizations_approval_status_check 
    CHECK (approval_status IN ('pending', 'approved', 'declined', 'expired'));
  END IF;
END $$;

-- Manager temporary credentials (bcrypt hashed)
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS manager_temp_password_hash TEXT;

-- Credential expiry timestamp (15 days from generation)
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS credentials_expire_at TIMESTAMPTZ;

-- Unique token for manager portal access
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid();

-- Approval/decline timestamps (audit trail per Section 6.2)
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Decline reason (optional)
ALTER TABLE solution_provider_organizations 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Indexes for manager login lookup (per Section 6.4)
CREATE INDEX IF NOT EXISTS idx_org_manager_email 
ON solution_provider_organizations(manager_email);

CREATE INDEX IF NOT EXISTS idx_org_approval_token 
ON solution_provider_organizations(approval_token);

CREATE INDEX IF NOT EXISTS idx_org_approval_status 
ON solution_provider_organizations(approval_status);