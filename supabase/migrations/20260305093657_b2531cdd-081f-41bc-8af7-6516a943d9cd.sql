
-- Session 3.1: Create org_state_audit_log table with auto-logging trigger
CREATE TABLE IF NOT EXISTS org_state_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_state_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_state_audit_org ON org_state_audit_log(organization_id, created_at DESC);

CREATE POLICY "Platform admins can read audit log"
  ON org_state_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

-- Insert-only policy via trigger (SECURITY DEFINER), no direct insert needed
CREATE POLICY "Platform admins can insert audit log"
  ON org_state_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

-- Auto-log trigger on verification_status changes
CREATE OR REPLACE FUNCTION public.log_org_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    INSERT INTO org_state_audit_log (organization_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.verification_status, NEW.verification_status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seeker_orgs_state_audit
  AFTER UPDATE ON seeker_organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_org_state_change();

-- Session 3.2: Create admin_activation_links table
CREATE TABLE IF NOT EXISTS admin_activation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES seeking_org_admins(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'activated', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_activation_links ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_activation_links_token ON admin_activation_links(token);
CREATE INDEX idx_activation_links_org ON admin_activation_links(organization_id);

CREATE POLICY "Platform admins can manage activation links"
  ON admin_activation_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );
