
-- ============================================================
-- Phase 6: Membership & SaaS Agreement Tables (retry)
-- Tables were already created in failed migration, so use IF NOT EXISTS
-- ============================================================

-- 1. seeker_memberships
CREATE TABLE IF NOT EXISTS public.seeker_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  membership_tier_id UUID NOT NULL REFERENCES public.md_membership_tiers(id),
  lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'expired', 'cancelled', 'suspended')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  fee_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  renewed_from_id UUID REFERENCES public.seeker_memberships(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON public.seeker_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.seeker_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_status ON public.seeker_memberships(organization_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_memberships_ends_at ON public.seeker_memberships(ends_at) WHERE lifecycle_status = 'active';

ALTER TABLE public.seeker_memberships ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist from partial run
DROP POLICY IF EXISTS "Users can view their org memberships" ON public.seeker_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.seeker_memberships;

CREATE POLICY "Users can view their org memberships"
  ON public.seeker_memberships FOR SELECT
  USING (tenant_id IN (
    SELECT so.tenant_id FROM public.seeker_organizations so
    JOIN public.seeker_contacts sc ON sc.organization_id = so.id
    WHERE sc.created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage memberships"
  ON public.seeker_memberships FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 2. saas_agreements
CREATE TABLE IF NOT EXISTS public.saas_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  parent_organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  child_organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  agreement_type TEXT NOT NULL DEFAULT 'saas_fee' CHECK (agreement_type IN ('saas_fee', 'shadow_billing', 'cost_sharing')),
  lifecycle_status TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle_status IN ('draft', 'active', 'expired', 'cancelled', 'suspended')),
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  fee_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (fee_frequency IN ('monthly', 'quarterly', 'annually')),
  shadow_charge_rate NUMERIC(5,2) DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT chk_saas_parent_child_different CHECK (parent_organization_id != child_organization_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_agreements_tenant ON public.saas_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_agreements_parent ON public.saas_agreements(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_agreements_child ON public.saas_agreements(child_organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_agreements_status ON public.saas_agreements(parent_organization_id, lifecycle_status);

ALTER TABLE public.saas_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org agreements" ON public.saas_agreements;
DROP POLICY IF EXISTS "Admins can manage agreements" ON public.saas_agreements;

CREATE POLICY "Users can view their org agreements"
  ON public.saas_agreements FOR SELECT
  USING (tenant_id IN (
    SELECT so.tenant_id FROM public.seeker_organizations so
    JOIN public.seeker_contacts sc ON sc.organization_id = so.id
    WHERE sc.created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage agreements"
  ON public.saas_agreements FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));
