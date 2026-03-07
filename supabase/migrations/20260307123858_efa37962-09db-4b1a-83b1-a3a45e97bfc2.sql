
-- Recreate seeker_org_industries with original schema
CREATE TABLE public.seeker_org_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.industry_segments(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, industry_id)
);

CREATE INDEX idx_seeker_org_industries_org ON public.seeker_org_industries(organization_id);
CREATE INDEX idx_seeker_org_industries_ind ON public.seeker_org_industries(industry_id);

ALTER TABLE public.seeker_org_industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read org industries" ON public.seeker_org_industries
  FOR SELECT USING (true);

CREATE POLICY "Allow insert during registration" ON public.seeker_org_industries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete own org industries" ON public.seeker_org_industries
  FOR DELETE USING (true);
