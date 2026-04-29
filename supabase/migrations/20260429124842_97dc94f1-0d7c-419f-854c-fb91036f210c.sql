-- ============================================================
-- Phase 10c — Enterprise Tier Configuration
-- ============================================================

-- 1) Feature gate key lookup
CREATE TABLE public.md_enterprise_feature_gate_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.md_enterprise_feature_gate_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_gate_keys_read_authenticated"
  ON public.md_enterprise_feature_gate_keys FOR SELECT
  TO authenticated USING (is_active = TRUE);

CREATE POLICY "feature_gate_keys_platform_write"
  ON public.md_enterprise_feature_gate_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.admin_tier IN ('supervisor','senior_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.admin_tier IN ('supervisor','senior_admin')
    )
  );

-- Seed common feature gates
INSERT INTO public.md_enterprise_feature_gate_keys (key, display_name, description, category, sort_order) VALUES
  ('sso',                'Single Sign-On',         'SAML/OIDC enterprise SSO',                 'auth',     10),
  ('white_label',        'White Label',            'Custom branding, domain, and theming',     'branding', 20),
  ('api_access',         'API Access',             'Programmatic API access with rate limits', 'platform', 30),
  ('dedicated_support',  'Dedicated Support',      'Named CSM and priority SLA',               'support',  40),
  ('audit_export',       'Audit Log Export',       'Export full audit trail (SIEM-ready)',     'security', 50),
  ('custom_integrations','Custom Integrations',    'Bespoke connector development',            'platform', 60),
  ('priority_ai',        'Priority AI Throughput', 'Reserved AI gateway capacity',             'platform', 70);

-- 2) Enterprise agreements
CREATE TABLE public.enterprise_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE RESTRICT,
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),

  -- Commercial
  agreement_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (agreement_status IN ('draft','in_negotiation','signed','active','expired','terminated')),
  acv_amount NUMERIC(14,2),
  currency_code TEXT NOT NULL DEFAULT 'USD'
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  billing_cadence TEXT NOT NULL DEFAULT 'annual'
    CHECK (billing_cadence IN ('annual','quarterly','monthly','custom')),
  contract_start_date DATE,
  contract_end_date DATE,

  -- Negotiated overrides (NULL = use tier default)
  max_challenges_override INTEGER,
  max_users_override INTEGER,
  max_storage_gb_override INTEGER,
  governance_mode_override TEXT
    CHECK (governance_mode_override IS NULL OR governance_mode_override IN ('QUICK','STRUCTURED','CONTROLLED')),

  -- Feature gates (key -> bool)
  feature_gates JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Documents / metadata
  msa_document_url TEXT,
  notes TEXT,
  signed_at TIMESTAMPTZ,
  signed_by_org_user UUID,
  signed_by_platform_user UUID,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT chk_dates CHECK (contract_end_date IS NULL OR contract_start_date IS NULL OR contract_end_date >= contract_start_date)
);

CREATE UNIQUE INDEX idx_enterprise_agreements_active_per_org
  ON public.enterprise_agreements(organization_id)
  WHERE agreement_status = 'active';

CREATE INDEX idx_enterprise_agreements_org      ON public.enterprise_agreements(organization_id);
CREATE INDEX idx_enterprise_agreements_status   ON public.enterprise_agreements(agreement_status);
CREATE INDEX idx_enterprise_agreements_tier     ON public.enterprise_agreements(tier_id);

ALTER TABLE public.enterprise_agreements ENABLE ROW LEVEL SECURITY;

-- Platform admins: full read/write
CREATE POLICY "enterprise_agreements_platform_all"
  ON public.enterprise_agreements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.admin_tier IN ('supervisor','senior_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.admin_tier IN ('supervisor','senior_admin')
    )
  );

-- Org PRIMARY admins: SELECT only, only their org
CREATE POLICY "enterprise_agreements_primary_read"
  ON public.enterprise_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seeking_org_admins soa
      WHERE soa.user_id = auth.uid()
        AND soa.organization_id = enterprise_agreements.organization_id
        AND soa.status = 'active'
        AND soa.admin_tier = 'PRIMARY'
    )
  );

-- 3) Append-only audit
CREATE TABLE public.enterprise_agreement_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.enterprise_agreements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created','updated','status_changed','activated','terminated')),
  previous_status TEXT,
  new_status TEXT,
  changed_fields JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_ent_agreement_audit_agreement ON public.enterprise_agreement_audit(agreement_id);
CREATE INDEX idx_ent_agreement_audit_org       ON public.enterprise_agreement_audit(organization_id);

ALTER TABLE public.enterprise_agreement_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ent_audit_platform_read"
  ON public.enterprise_agreement_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.admin_tier IN ('supervisor','senior_admin')
    )
  );

CREATE POLICY "ent_audit_primary_read"
  ON public.enterprise_agreement_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seeking_org_admins soa
      WHERE soa.user_id = auth.uid()
        AND soa.organization_id = enterprise_agreement_audit.organization_id
        AND soa.status = 'active'
        AND soa.admin_tier = 'PRIMARY'
    )
  );

CREATE POLICY "ent_audit_insert_authenticated"
  ON public.enterprise_agreement_audit FOR INSERT
  TO authenticated WITH CHECK (TRUE);

-- Block UPDATE / DELETE entirely (append-only)
CREATE OR REPLACE FUNCTION public.block_ent_audit_mutations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'enterprise_agreement_audit is append-only';
END;
$$;

CREATE TRIGGER trg_ent_audit_block_update
  BEFORE UPDATE ON public.enterprise_agreement_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_ent_audit_mutations();

CREATE TRIGGER trg_ent_audit_block_delete
  BEFORE DELETE ON public.enterprise_agreement_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_ent_audit_mutations();

-- 4) FSM enforcement
CREATE OR REPLACE FUNCTION public.enforce_enterprise_agreement_fsm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_platform BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.agreement_status IS DISTINCT FROM NEW.agreement_status THEN
    -- Allowed transitions
    IF NOT (
      (OLD.agreement_status = 'draft'          AND NEW.agreement_status IN ('in_negotiation','terminated')) OR
      (OLD.agreement_status = 'in_negotiation' AND NEW.agreement_status IN ('signed','draft','terminated')) OR
      (OLD.agreement_status = 'signed'         AND NEW.agreement_status IN ('active','terminated')) OR
      (OLD.agreement_status = 'active'         AND NEW.agreement_status IN ('expired','terminated')) OR
      (OLD.agreement_status = 'expired'        AND NEW.agreement_status IN ('terminated'))
    ) THEN
      RAISE EXCEPTION 'Invalid agreement status transition: % -> %', OLD.agreement_status, NEW.agreement_status;
    END IF;

    -- Activation is platform-only
    IF NEW.agreement_status = 'active' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.platform_admin_profiles pap
        WHERE pap.user_id = auth.uid()
          AND pap.admin_tier IN ('supervisor','senior_admin')
      ) INTO v_is_platform;

      IF NOT v_is_platform THEN
        RAISE EXCEPTION 'Only platform admins can activate enterprise agreements';
      END IF;

      IF NEW.contract_start_date IS NULL OR NEW.contract_end_date IS NULL THEN
        RAISE EXCEPTION 'contract_start_date and contract_end_date required for activation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enterprise_agreement_fsm
  BEFORE UPDATE ON public.enterprise_agreements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_enterprise_agreement_fsm();

-- 5) Audit-write trigger
CREATE OR REPLACE FUNCTION public.write_enterprise_agreement_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.enterprise_agreement_audit
      (agreement_id, organization_id, action, new_status, performed_by)
    VALUES (NEW.id, NEW.organization_id, 'created', NEW.agreement_status, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.agreement_status IS DISTINCT FROM NEW.agreement_status THEN
      INSERT INTO public.enterprise_agreement_audit
        (agreement_id, organization_id, action, previous_status, new_status, performed_by)
      VALUES (
        NEW.id, NEW.organization_id,
        CASE WHEN NEW.agreement_status = 'active' THEN 'activated'
             WHEN NEW.agreement_status = 'terminated' THEN 'terminated'
             ELSE 'status_changed' END,
        OLD.agreement_status, NEW.agreement_status, auth.uid()
      );
    ELSE
      INSERT INTO public.enterprise_agreement_audit
        (agreement_id, organization_id, action, performed_by, changed_fields)
      VALUES (NEW.id, NEW.organization_id, 'updated', auth.uid(),
              jsonb_build_object(
                'acv_amount', NEW.acv_amount,
                'feature_gates', NEW.feature_gates,
                'governance_mode_override', NEW.governance_mode_override
              ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enterprise_agreement_audit
  AFTER INSERT OR UPDATE ON public.enterprise_agreements
  FOR EACH ROW EXECUTE FUNCTION public.write_enterprise_agreement_audit();

-- 6) Governance auto-sync on activation
CREATE OR REPLACE FUNCTION public.sync_enterprise_governance_override()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agreement_status = 'active'
     AND (OLD.agreement_status IS DISTINCT FROM 'active')
     AND NEW.governance_mode_override IS NOT NULL THEN

    INSERT INTO public.org_governance_overrides
      (organization_id, governance_mode, is_active, created_by)
    VALUES
      (NEW.organization_id, NEW.governance_mode_override, TRUE, auth.uid())
    ON CONFLICT (organization_id, governance_mode)
    DO UPDATE SET is_active = TRUE, updated_by = auth.uid(), updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enterprise_governance_sync
  AFTER UPDATE ON public.enterprise_agreements
  FOR EACH ROW EXECUTE FUNCTION public.sync_enterprise_governance_override();

-- 7) Read-only view for UI
CREATE OR REPLACE VIEW public.v_org_active_enterprise_agreement AS
SELECT
  ea.id,
  ea.organization_id,
  ea.tier_id,
  t.code AS tier_code,
  t.name AS tier_name,
  ea.agreement_status,
  ea.acv_amount,
  ea.currency_code,
  ea.billing_cadence,
  ea.contract_start_date,
  ea.contract_end_date,
  ea.max_challenges_override,
  ea.max_users_override,
  ea.max_storage_gb_override,
  ea.governance_mode_override,
  ea.feature_gates,
  ea.signed_at,
  ea.created_at,
  ea.updated_at
FROM public.enterprise_agreements ea
JOIN public.md_subscription_tiers t ON t.id = ea.tier_id
WHERE ea.agreement_status = 'active';

-- 8) updated_at trigger
CREATE TRIGGER trg_enterprise_agreements_updated_at
  BEFORE UPDATE ON public.enterprise_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROLLBACK (for reference, do not run):
-- DROP VIEW IF EXISTS public.v_org_active_enterprise_agreement;
-- DROP TABLE IF EXISTS public.enterprise_agreement_audit CASCADE;
-- DROP TABLE IF EXISTS public.enterprise_agreements CASCADE;
-- DROP TABLE IF EXISTS public.md_enterprise_feature_gate_keys CASCADE;
-- DROP FUNCTION IF EXISTS public.enforce_enterprise_agreement_fsm() CASCADE;
-- DROP FUNCTION IF EXISTS public.write_enterprise_agreement_audit() CASCADE;
-- DROP FUNCTION IF EXISTS public.sync_enterprise_governance_override() CASCADE;
-- DROP FUNCTION IF EXISTS public.block_ent_audit_mutations() CASCADE;
-- ============================================================
