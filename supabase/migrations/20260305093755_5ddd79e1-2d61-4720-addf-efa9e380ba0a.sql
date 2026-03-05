
-- Session 4.1: T&C Versions table
CREATE TABLE IF NOT EXISTS tc_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content_url TEXT,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tc_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tc_versions"
  ON tc_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can manage tc_versions"
  ON tc_versions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

-- Add tc_version_accepted to seeker_organizations
ALTER TABLE seeker_organizations
  ADD COLUMN IF NOT EXISTS tc_version_accepted TEXT;

-- Session 4.3: Admin Transfer Requests table
CREATE TABLE IF NOT EXISTS admin_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  from_admin_id UUID NOT NULL REFERENCES seeking_org_admins(id),
  to_admin_email TEXT NOT NULL,
  to_admin_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_transfer_org ON admin_transfer_requests(organization_id);

CREATE POLICY "Platform admins can manage transfer requests"
  ON admin_transfer_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Org admins can view their own transfer requests"
  ON admin_transfer_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM seeking_org_admins WHERE user_id = auth.uid()
    )
  );
