
ALTER TABLE public.saas_agreements
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES md_departments(id),
  ADD COLUMN IF NOT EXISTS functional_area_id UUID REFERENCES md_functional_areas(id);

CREATE INDEX IF NOT EXISTS idx_saas_agreements_department ON public.saas_agreements(department_id);
CREATE INDEX IF NOT EXISTS idx_saas_agreements_functional_area ON public.saas_agreements(functional_area_id);
