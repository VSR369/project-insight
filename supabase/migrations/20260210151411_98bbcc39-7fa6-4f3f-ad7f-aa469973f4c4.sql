
-- ============================================================
-- Phase 7: Team Management, Challenge Creation & Billing
-- ============================================================

-- 1. org_roles: System + custom roles for team management
CREATE TABLE IF NOT EXISTS public.org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, code)
);

-- Seed system roles (tenant_id will be set per-org; these are templates)
-- We'll use a special "system" approach: system roles have is_system_role = true

-- 2. Enhance org_users with subsidiary support and role reference
ALTER TABLE public.org_users
  ADD COLUMN IF NOT EXISTS subsidiary_org_id UUID REFERENCES public.seeker_organizations(id),
  ADD COLUMN IF NOT EXISTS org_role_id UUID REFERENCES public.org_roles(id),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'active'
    CHECK (invitation_status IN ('pending', 'active', 'expired', 'revoked'));

-- 3. seeker_invoices: Billing documents
CREATE TABLE IF NOT EXISTS public.seeker_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  subscription_id UUID REFERENCES public.seeker_subscriptions(id),
  invoice_number VARCHAR(50) NOT NULL,
  invoice_type VARCHAR(30) NOT NULL DEFAULT 'subscription'
    CHECK (invoice_type IN ('subscription', 'topup', 'shadow', 'credit_note', 'adjustment')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded')),
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_period_start DATE,
  billing_period_end DATE,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  stripe_invoice_id VARCHAR(255),
  notes TEXT,
  is_shadow BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4. seeker_invoice_line_items
CREATE TABLE IF NOT EXISTS public.seeker_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.seeker_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  line_type VARCHAR(30) NOT NULL DEFAULT 'charge'
    CHECK (line_type IN ('charge', 'discount', 'tax', 'credit', 'shadow_charge')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  challenge_id UUID REFERENCES public.challenges(id),
  metadata JSONB DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_org_roles_tenant ON public.org_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_users_subsidiary ON public.org_users(subsidiary_org_id) WHERE subsidiary_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_users_org_role ON public.org_users(org_role_id) WHERE org_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seeker_invoices_tenant ON public.seeker_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_invoices_org ON public.seeker_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_seeker_invoices_status ON public.seeker_invoices(status);
CREATE INDEX IF NOT EXISTS idx_seeker_invoices_org_status ON public.seeker_invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_seeker_invoice_line_items_invoice ON public.seeker_invoice_line_items(invoice_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- org_roles RLS
ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_roles_tenant_read" ON public.org_roles
  FOR SELECT USING (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
  );

CREATE POLICY "org_roles_tenant_insert" ON public.org_roles
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
  );

CREATE POLICY "org_roles_tenant_update" ON public.org_roles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
  );

-- seeker_invoices RLS
ALTER TABLE public.seeker_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_tenant_read" ON public.seeker_invoices
  FOR SELECT USING (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
  );

CREATE POLICY "invoices_tenant_insert" ON public.seeker_invoices
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
  );

CREATE POLICY "invoices_tenant_update" ON public.seeker_invoices
  FOR UPDATE USING (
    tenant_id IN (
      SELECT so.id FROM public.seeker_organizations so
      INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
      WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
    )
  );

-- seeker_invoice_line_items RLS (inherits via invoice join)
ALTER TABLE public.seeker_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "line_items_read" ON public.seeker_invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT si.id FROM public.seeker_invoices si
      WHERE si.tenant_id IN (
        SELECT so.id FROM public.seeker_organizations so
        INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
        WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
      )
    )
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin')
  );

CREATE POLICY "line_items_insert" ON public.seeker_invoice_line_items
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT si.id FROM public.seeker_invoices si
      WHERE si.tenant_id IN (
        SELECT so.id FROM public.seeker_organizations so
        INNER JOIN public.seeker_contacts sc ON sc.organization_id = so.id
        WHERE sc.created_by = auth.uid() AND sc.is_deleted = false
      )
    )
  );
