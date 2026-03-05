
-- Session 2.4: Create seeking_org_admins table
CREATE TABLE IF NOT EXISTS seeking_org_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  admin_tier TEXT NOT NULL CHECK (admin_tier IN ('PRIMARY', 'DELEGATED')) DEFAULT 'PRIMARY',
  domain_scope TEXT NOT NULL DEFAULT 'ALL',
  designated_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending_activation', 'active', 'suspended', 'transferred')) DEFAULT 'pending_activation',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE seeking_org_admins ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_seeking_org_admins_org ON seeking_org_admins(organization_id);
CREATE INDEX idx_seeking_org_admins_user ON seeking_org_admins(user_id);

CREATE POLICY "Platform admins can manage seeking_org_admins"
  ON seeking_org_admins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Org admins can view their own records"
  ON seeking_org_admins FOR SELECT
  USING (user_id = auth.uid());
