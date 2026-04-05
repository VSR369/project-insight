
-- ================================================================
-- ITEM 1: Escrow Deposit Percentage on md_governance_mode_config
-- ================================================================
ALTER TABLE md_governance_mode_config
ADD COLUMN IF NOT EXISTS escrow_deposit_pct NUMERIC(5,2) DEFAULT 100.00;

COMMENT ON COLUMN md_governance_mode_config.escrow_deposit_pct IS
  'Percentage of total_fee required as escrow deposit. 0 = no escrow.';

UPDATE md_governance_mode_config SET escrow_deposit_pct = 0 WHERE governance_mode = 'QUICK';
UPDATE md_governance_mode_config SET escrow_deposit_pct = 80.00 WHERE governance_mode = 'STRUCTURED';
UPDATE md_governance_mode_config SET escrow_deposit_pct = 100.00 WHERE governance_mode = 'CONTROLLED';

-- ================================================================
-- ITEM 2: Legal Review Thresholds
-- ================================================================
CREATE TABLE IF NOT EXISTS public.md_legal_review_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  currency_code TEXT NOT NULL DEFAULT 'USD',
  threshold_amount NUMERIC(12,2) NOT NULL DEFAULT 50000.00,
  governance_mode TEXT NOT NULL DEFAULT 'STRUCTURED'
    CHECK (governance_mode IN ('STRUCTURED','CONTROLLED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(country_id, governance_mode)
);

COMMENT ON TABLE md_legal_review_thresholds IS
  'Prize threshold per country above which legal review must be routed to separate LC.';

CREATE INDEX IF NOT EXISTS idx_legal_thresholds_country ON md_legal_review_thresholds(country_id);
CREATE INDEX IF NOT EXISTS idx_legal_thresholds_mode ON md_legal_review_thresholds(governance_mode);

ALTER TABLE md_legal_review_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read thresholds"
  ON md_legal_review_thresholds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors can manage thresholds"
  ON md_legal_review_thresholds FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier IN ('supervisor','senior_admin')
    )
  );

-- Seed defaults (lookup country UUIDs)
INSERT INTO md_legal_review_thresholds (country_id, currency_code, threshold_amount, governance_mode)
SELECT c.id, 'USD', 50000.00, 'STRUCTURED'
FROM countries c WHERE c.code = 'US'
ON CONFLICT DO NOTHING;

INSERT INTO md_legal_review_thresholds (country_id, currency_code, threshold_amount, governance_mode)
SELECT c.id, 'GBP', 40000.00, 'STRUCTURED'
FROM countries c WHERE c.code = 'GB'
ON CONFLICT DO NOTHING;

INSERT INTO md_legal_review_thresholds (country_id, currency_code, threshold_amount, governance_mode)
SELECT c.id, 'INR', 4000000.00, 'STRUCTURED'
FROM countries c WHERE c.code = 'IN'
ON CONFLICT DO NOTHING;

INSERT INTO md_legal_review_thresholds (country_id, currency_code, threshold_amount, governance_mode)
SELECT c.id, 'EUR', 45000.00, 'STRUCTURED'
FROM countries c WHERE c.code = 'DE'
ON CONFLICT DO NOTHING;

-- ================================================================
-- ITEM 5: Org Legal Document Templates
-- ================================================================
CREATE TABLE IF NOT EXISTS public.org_legal_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tenant_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_code TEXT,
  document_type TEXT NOT NULL DEFAULT 'standard',
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'TIER_1',
  content TEXT,
  content_json JSONB,
  template_content TEXT,
  default_template_url TEXT,
  original_file_name TEXT,
  original_file_url TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  version_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (version_status IN ('DRAFT','ACTIVE','ARCHIVED')),
  applies_to_mode TEXT NOT NULL DEFAULT 'ALL'
    CHECK (applies_to_mode IN ('ALL','QUICK','STRUCTURED','CONTROLLED')),
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_legal_templates_org ON org_legal_document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_legal_templates_tenant ON org_legal_document_templates(tenant_id);

ALTER TABLE org_legal_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read legal templates"
  ON org_legal_document_templates FOR SELECT TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage legal templates"
  ON org_legal_document_templates FOR ALL TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','owner')
    )
  );

-- ================================================================
-- ITEM 6: Org Finance Config
-- ================================================================
CREATE TABLE IF NOT EXISTS public.org_finance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) UNIQUE,
  tenant_id UUID NOT NULL,
  default_bank_name TEXT,
  default_bank_branch TEXT,
  default_bank_address TEXT,
  preferred_escrow_currency TEXT DEFAULT 'USD',
  auto_deposit_enabled BOOLEAN DEFAULT false,
  budget_approval_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_finance_org ON org_finance_config(organization_id);

ALTER TABLE org_finance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read finance config"
  ON org_finance_config FOR SELECT TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage finance config"
  ON org_finance_config FOR ALL TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','owner')
    )
  );

-- ================================================================
-- ITEM 7: Org Governance Overrides
-- ================================================================
CREATE TABLE IF NOT EXISTS public.org_governance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  governance_mode TEXT NOT NULL CHECK (governance_mode IN ('QUICK','STRUCTURED','CONTROLLED')),
  legal_review_threshold_override NUMERIC(12,2),
  escrow_deposit_pct_override NUMERIC(5,2),
  curation_checklist_override INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, governance_mode)
);

CREATE INDEX IF NOT EXISTS idx_org_gov_overrides_org ON org_governance_overrides(organization_id);

ALTER TABLE org_governance_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read governance overrides"
  ON org_governance_overrides FOR SELECT TO authenticated USING (
    organization_id IN (
      SELECT organization_id FROM org_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage governance overrides"
  ON org_governance_overrides FOR ALL TO authenticated USING (
    organization_id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','owner')
    )
  );

-- ================================================================
-- ITEM 9: Org Compliance Config
-- ================================================================
CREATE TABLE IF NOT EXISTS public.org_compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) UNIQUE,
  tenant_id UUID NOT NULL,
  export_control_enabled BOOLEAN DEFAULT false,
  controlled_technology_default BOOLEAN DEFAULT false,
  data_residency_country TEXT,
  gdpr_dpa_auto_attach BOOLEAN DEFAULT false,
  sanctions_screening_level TEXT DEFAULT 'standard'
    CHECK (sanctions_screening_level IN ('standard','enhanced')),
  compliance_officer_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_compliance_org ON org_compliance_config(organization_id);

ALTER TABLE org_compliance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read compliance config"
  ON org_compliance_config FOR SELECT TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage compliance config"
  ON org_compliance_config FOR ALL TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','owner')
    )
  );

-- ================================================================
-- ITEM 10: Org Custom Fields
-- ================================================================
CREATE TABLE IF NOT EXISTS public.org_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tenant_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','number','select','multi_select','date','textarea')),
  is_required BOOLEAN DEFAULT false,
  select_options JSONB,
  display_order INTEGER DEFAULT 0,
  applies_to_mode TEXT DEFAULT 'ALL'
    CHECK (applies_to_mode IN ('ALL','QUICK','STRUCTURED','CONTROLLED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_org_custom_fields_org ON org_custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_custom_fields_tenant ON org_custom_fields(tenant_id);

ALTER TABLE org_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read custom fields"
  ON org_custom_fields FOR SELECT TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage custom fields"
  ON org_custom_fields FOR ALL TO authenticated USING (
    tenant_id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','owner')
    )
  );
