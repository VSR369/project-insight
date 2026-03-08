
-- =============================================================
-- tier_permissions: stores editable permission matrix per tier
-- =============================================================
CREATE TABLE public.tier_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('admin', 'senior_admin', 'supervisor')),
  permission_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tier, permission_key)
);

ALTER TABLE public.tier_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated admins can read permissions
CREATE POLICY "authenticated_select" ON public.tier_permissions
  FOR SELECT TO authenticated USING (true);

-- Only supervisors can update
CREATE POLICY "supervisor_update" ON public.tier_permissions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
    AND tier != 'supervisor'  -- Cannot modify own tier
  );

-- =============================================================
-- tier_permissions_audit: immutable audit trail
-- =============================================================
CREATE TABLE public.tier_permissions_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL,
  tier TEXT NOT NULL,
  previous_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  changed_by_id UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_reason TEXT
);

ALTER TABLE public.tier_permissions_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_audit" ON public.tier_permissions_audit
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_tier_permissions_audit_key ON public.tier_permissions_audit(permission_key, changed_at DESC);
CREATE INDEX idx_tier_permissions_tier_key ON public.tier_permissions(tier, permission_key);

-- =============================================================
-- Audit trigger: log every UPDATE to tier_permissions
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_tier_permissions_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_enabled IS DISTINCT FROM NEW.is_enabled THEN
    INSERT INTO public.tier_permissions_audit (permission_key, tier, previous_value, new_value, changed_by_id)
    VALUES (NEW.permission_key, NEW.tier, OLD.is_enabled, NEW.is_enabled, auth.uid());
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tier_permissions_update_audit
  BEFORE UPDATE ON public.tier_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_tier_permissions_audit();

-- =============================================================
-- Seed with current hardcoded defaults
-- =============================================================
INSERT INTO public.tier_permissions (tier, permission_key, is_enabled) VALUES
  -- Verification
  ('admin', 'verification.view_dashboard', true),
  ('admin', 'verification.claim_from_queue', true),
  ('admin', 'verification.complete_verification', true),
  ('admin', 'verification.request_reassignment', true),
  ('admin', 'verification.release_to_queue', true),
  ('senior_admin', 'verification.view_dashboard', true),
  ('senior_admin', 'verification.claim_from_queue', true),
  ('senior_admin', 'verification.complete_verification', true),
  ('senior_admin', 'verification.request_reassignment', true),
  ('senior_admin', 'verification.release_to_queue', true),
  ('supervisor', 'verification.view_dashboard', true),
  ('supervisor', 'verification.claim_from_queue', true),
  ('supervisor', 'verification.complete_verification', true),
  ('supervisor', 'verification.request_reassignment', true),
  ('supervisor', 'verification.release_to_queue', true),
  -- Admin Management
  ('admin', 'admin_management.view_all_admins', false),
  ('admin', 'admin_management.create_admin', false),
  ('admin', 'admin_management.edit_admin_profile', false),
  ('admin', 'admin_management.deactivate_admin', false),
  ('admin', 'admin_management.view_my_profile', true),
  ('senior_admin', 'admin_management.view_all_admins', true),
  ('senior_admin', 'admin_management.create_admin', true),
  ('senior_admin', 'admin_management.edit_admin_profile', false),
  ('senior_admin', 'admin_management.deactivate_admin', false),
  ('senior_admin', 'admin_management.view_my_profile', true),
  ('supervisor', 'admin_management.view_all_admins', true),
  ('supervisor', 'admin_management.create_admin', true),
  ('supervisor', 'admin_management.edit_admin_profile', true),
  ('supervisor', 'admin_management.deactivate_admin', true),
  ('supervisor', 'admin_management.view_my_profile', true),
  -- Supervisor Functions
  ('admin', 'supervisor.approve_reassignments', false),
  ('admin', 'supervisor.view_team_performance', false),
  ('admin', 'supervisor.configure_system', false),
  ('admin', 'supervisor.view_audit_logs', false),
  ('admin', 'supervisor.bulk_reassignment', false),
  ('admin', 'supervisor.pin_queue_entries', false),
  ('senior_admin', 'supervisor.approve_reassignments', false),
  ('senior_admin', 'supervisor.view_team_performance', false),
  ('senior_admin', 'supervisor.configure_system', false),
  ('senior_admin', 'supervisor.view_audit_logs', false),
  ('senior_admin', 'supervisor.bulk_reassignment', false),
  ('senior_admin', 'supervisor.pin_queue_entries', false),
  ('supervisor', 'supervisor.approve_reassignments', true),
  ('supervisor', 'supervisor.view_team_performance', true),
  ('supervisor', 'supervisor.configure_system', true),
  ('supervisor', 'supervisor.view_audit_logs', true),
  ('supervisor', 'supervisor.bulk_reassignment', true),
  ('supervisor', 'supervisor.pin_queue_entries', true);
