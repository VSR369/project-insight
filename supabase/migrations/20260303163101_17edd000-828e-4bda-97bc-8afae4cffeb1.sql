
-- Phase 1: Add missing verification states to org_verification_status_enum
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'payment_submitted';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'under_verification';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'returned_for_correction';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'active';

-- Add correction/suspension/SLA columns to seeker_organizations
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS correction_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS correction_instructions TEXT;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS verification_started_at TIMESTAMPTZ;

-- Add billing rejection column to seeker_billing_info
ALTER TABLE seeker_billing_info ADD COLUMN IF NOT EXISTS billing_rejection_reason TEXT;
