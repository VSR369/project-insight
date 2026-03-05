
-- Session 1 migrations: 1.7, 1.8, 1.9

-- 1.7: Add admin_title and relationship_to_org to org_admin_change_requests
ALTER TABLE org_admin_change_requests
  ADD COLUMN IF NOT EXISTS new_admin_title TEXT,
  ADD COLUMN IF NOT EXISTS new_admin_relationship_to_org TEXT;

-- 1.8: Add privacy_policy_accepted and dpa_accepted to seeker_compliance
ALTER TABLE seeker_compliance
  ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dpa_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- 1.9: Add registrant_contact JSONB to seeker_organizations
ALTER TABLE seeker_organizations
  ADD COLUMN IF NOT EXISTS registrant_contact JSONB;
