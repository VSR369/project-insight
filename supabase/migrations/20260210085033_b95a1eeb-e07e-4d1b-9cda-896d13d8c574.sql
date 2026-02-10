
-- =====================================================
-- Gap-Fill Migration: Missing columns, indexes, RLS policies
-- Based on Tech Specs REG-001/REG-002 gap analysis
-- =====================================================

-- 1. seeker_organizations: add trade_brand_name and registration_step
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS trade_brand_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS registration_step INTEGER NOT NULL DEFAULT 1;

-- 2. seeker_contacts: add soft-delete fields
ALTER TABLE public.seeker_contacts
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 3. email_otp_verifications: add organization_id and locked_until
ALTER TABLE public.email_otp_verifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.seeker_organizations(id),
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_email_otp_organization_id
  ON public.email_otp_verifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_seeker_contacts_tenant_deleted
  ON public.seeker_contacts(tenant_id, is_deleted);

-- 5. Pre-auth INSERT policies for registration flow
-- seeker_contacts
CREATE POLICY "Registration insert pre-auth seeker_contacts"
  ON public.seeker_contacts
  FOR INSERT
  WITH CHECK (true);

-- seeker_org_industries
CREATE POLICY "Registration insert pre-auth seeker_org_industries"
  ON public.seeker_org_industries
  FOR INSERT
  WITH CHECK (true);

-- seeker_org_geographies
CREATE POLICY "Registration insert pre-auth seeker_org_geographies"
  ON public.seeker_org_geographies
  FOR INSERT
  WITH CHECK (true);

-- seeker_org_documents
CREATE POLICY "Registration insert pre-auth seeker_org_documents"
  ON public.seeker_org_documents
  FOR INSERT
  WITH CHECK (true);
