
-- =============================================================
-- Batch 1: BRD CB-VERIFY-2026-001 Gap Closure Migrations
-- =============================================================

-- GAP 1 + GAP 11: registration_payments table
CREATE TABLE IF NOT EXISTS public.registration_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  transaction_id TEXT NOT NULL DEFAULT ('TXN-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  gateway_reference TEXT,
  payment_method TEXT NOT NULL DEFAULT 'simulated',
  payment_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Completed','Failed','Refunded')),
  payment_attempts INTEGER NOT NULL DEFAULT 1,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_registration_payments_org ON public.registration_payments(organization_id);
CREATE INDEX idx_registration_payments_tenant ON public.registration_payments(tenant_id);
CREATE INDEX idx_registration_payments_status ON public.registration_payments(organization_id, status);

ALTER TABLE public.registration_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_registration_payments" ON public.registration_payments
  FOR ALL USING (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE ur.role = 'platform_admin'
    )
    OR tenant_id IN (
      SELECT tenant_id FROM public.seeker_organizations WHERE created_by = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- GAP 12: md_system_config table
CREATE TABLE IF NOT EXISTS public.md_system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN ('string','integer','boolean','decimal')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.md_system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_system_config" ON public.md_system_config
  FOR SELECT USING (true);

CREATE POLICY "platform_admin_modify_system_config" ON public.md_system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Seed default config values
INSERT INTO public.md_system_config (config_key, config_value, description, data_type) VALUES
  ('max_correction_cycles', '2', 'Maximum number of Return for Correction cycles allowed per organization', 'integer'),
  ('min_rejection_reason_length', '50', 'Minimum character length for rejection reason text', 'integer'),
  ('activation_link_expiry_days', '7', 'Number of days before admin activation link expires', 'integer'),
  ('transfer_acceptance_window_hours', '72', 'Hours allowed for admin transfer acceptance before expiry', 'integer'),
  ('verification_sla_days', '3', 'Target business days for verification completion', 'integer')
ON CONFLICT (config_key) DO NOTHING;

-- GAP 10: verification_checklist_results on seeker_organizations
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS verification_checklist_results JSONB DEFAULT '{}';

-- GAP 8: admin_transfer_requests missing columns
ALTER TABLE public.admin_transfer_requests
  ADD COLUMN IF NOT EXISTS initiated_by TEXT DEFAULT 'PRIMARY_ADMIN' CHECK (initiated_by IN ('PRIMARY_ADMIN','PLATFORM_ADMIN')),
  ADD COLUMN IF NOT EXISTS justification TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- GAP 3: Partial unique index for BR-SOA-006 (one PRIMARY admin per org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seeking_org_admins_one_primary
  ON public.seeking_org_admins (organization_id)
  WHERE admin_tier = 'PRIMARY' AND status IN ('Invited', 'Active');

-- GAP 3: Validation trigger for BR-SOA-007 (PRIMARY must have domain_scope = ALL)
CREATE OR REPLACE FUNCTION public.trg_seeking_org_admins_primary_domain_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_tier = 'PRIMARY' AND NEW.domain_scope != 'ALL' THEN
    RAISE EXCEPTION 'PRIMARY admin must have domain_scope = ALL (BR-SOA-007)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seeking_org_admins_validate_primary_scope ON public.seeking_org_admins;
CREATE TRIGGER trg_seeking_org_admins_validate_primary_scope
  BEFORE INSERT OR UPDATE ON public.seeking_org_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seeking_org_admins_primary_domain_scope();

-- GAP 4: BR-SOA-011 — Primary admin deletion protection trigger
CREATE OR REPLACE FUNCTION public.trg_seeking_org_admins_protect_primary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_has_accepted_transfer BOOLEAN;
BEGIN
  -- Only protect PRIMARY admins
  IF OLD.admin_tier != 'PRIMARY' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- For DELETE operations on PRIMARY admin
  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admin_transfer_requests
      WHERE organization_id = OLD.organization_id
        AND from_admin_id = OLD.id
        AND status = 'accepted'
        AND created_at > NOW() - INTERVAL '30 days'
    ) INTO v_has_accepted_transfer;

    IF NOT v_has_accepted_transfer THEN
      RAISE EXCEPTION 'Cannot delete PRIMARY admin without an accepted transfer request (BR-SOA-011)';
    END IF;
    RETURN OLD;
  END IF;

  -- For UPDATE: prevent status change to Deactivated without transfer
  IF TG_OP = 'UPDATE' AND NEW.status = 'Deactivated' AND OLD.status != 'Deactivated' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admin_transfer_requests
      WHERE organization_id = OLD.organization_id
        AND from_admin_id = OLD.id
        AND status = 'accepted'
        AND created_at > NOW() - INTERVAL '30 days'
    ) INTO v_has_accepted_transfer;

    IF NOT v_has_accepted_transfer THEN
      RAISE EXCEPTION 'Cannot deactivate PRIMARY admin without an accepted transfer request (BR-SOA-011)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seeking_org_admins_protect_primary ON public.seeking_org_admins;
CREATE TRIGGER trg_seeking_org_admins_protect_primary
  BEFORE DELETE OR UPDATE ON public.seeking_org_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seeking_org_admins_protect_primary();
