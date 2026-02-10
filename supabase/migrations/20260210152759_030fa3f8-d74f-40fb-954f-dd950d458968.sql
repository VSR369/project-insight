
-- ================================================================
-- Gap Fill Migration: challenges columns, saas_agreements columns,
-- get_visible_org_ids function, is_email_verified on primaryContact
-- ================================================================

-- 1. Add missing spec columns to challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS shadow_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_solutions INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS solutions_awarded INTEGER DEFAULT 0;

-- Verify payment_status and visibility exist (they should from Phase 7)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='payment_status') THEN
    ALTER TABLE public.challenges ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','invoiced','paid','waived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='visibility') THEN
    ALTER TABLE public.challenges ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','marketplace','invited'));
  END IF;
END $$;

-- 2. Add missing fee-breakdown columns to saas_agreements
ALTER TABLE public.saas_agreements
  ADD COLUMN IF NOT EXISTS base_platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_department_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS support_tier_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_fee_1_label TEXT,
  ADD COLUMN IF NOT EXISTS custom_fee_1_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_fee_2_label TEXT,
  ADD COLUMN IF NOT EXISTS custom_fee_2_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS msa_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS msa_document_url TEXT,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly','quarterly','annually'));

-- 3. Create get_visible_org_ids function for subsidiary data scoping
CREATE OR REPLACE FUNCTION public.get_visible_org_ids(p_parent_org_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- Return the parent org itself plus all child orgs via saas_agreements
  SELECT p_parent_org_id
  UNION
  SELECT child_organization_id
  FROM saas_agreements
  WHERE parent_organization_id = p_parent_org_id
    AND lifecycle_status IN ('active', 'pending_renewal')
$$;

-- 4. Add department_functional_area_id to seeker_contacts if missing
ALTER TABLE public.seeker_contacts
  ADD COLUMN IF NOT EXISTS department_functional_area_id UUID REFERENCES public.md_functional_areas(id);

CREATE INDEX IF NOT EXISTS idx_seeker_contacts_func_area ON public.seeker_contacts(department_functional_area_id);

-- 5. Add verification_expiry_date to seeker_organizations for BR-SUB-002
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS verification_expiry_date TIMESTAMPTZ;
