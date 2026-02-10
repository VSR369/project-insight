
-- Junction table: Organization ↔ Industries (many-to-many)
CREATE TABLE IF NOT EXISTS public.seeker_org_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.md_industries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

-- Junction table: Organization ↔ Operating Geographies (many-to-many with countries)
CREATE TABLE IF NOT EXISTS public.seeker_org_operating_geographies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, country_id)
);

CREATE INDEX idx_seeker_org_geographies_org ON public.seeker_org_operating_geographies(organization_id);
CREATE INDEX idx_seeker_org_geographies_country ON public.seeker_org_operating_geographies(country_id);

ALTER TABLE public.seeker_org_operating_geographies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read org geographies" ON public.seeker_org_operating_geographies
  FOR SELECT USING (true);

CREATE POLICY "Allow insert during registration" ON public.seeker_org_operating_geographies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete own org geographies" ON public.seeker_org_operating_geographies
  FOR DELETE USING (true);
