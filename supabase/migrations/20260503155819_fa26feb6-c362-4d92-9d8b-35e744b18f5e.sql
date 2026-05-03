
CREATE TABLE IF NOT EXISTS public.org_type_industry_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type_id UUID NOT NULL REFERENCES public.organization_types(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.industry_segments(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_org_type_industry UNIQUE (org_type_id, industry_id)
);

CREATE INDEX IF NOT EXISTS idx_otis_org_type ON public.org_type_industry_segments(org_type_id);
CREATE INDEX IF NOT EXISTS idx_otis_industry ON public.org_type_industry_segments(industry_id);

ALTER TABLE public.org_type_industry_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otis_select_authenticated" ON public.org_type_industry_segments;
CREATE POLICY "otis_select_authenticated"
  ON public.org_type_industry_segments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "otis_admin_write" ON public.org_type_industry_segments;
CREATE POLICY "otis_admin_write"
  ON public.org_type_industry_segments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

INSERT INTO public.industry_segments (code, name, is_active, display_order) VALUES
  ('edu_pre_primary',          'Pre-Primary Education (Foundational Stage)',                 true, 100),
  ('edu_primary_middle',       'Primary and Middle Education (Preparatory and Middle Stages)', true, 101),
  ('edu_secondary',            'Secondary and Higher Secondary Education',                   true, 102),
  ('edu_ug',                   'Undergraduate (UG) Institutions',                            true, 103),
  ('edu_pg_research',          'Postgraduate (PG) & Research Institutions',                  true, 104),
  ('gov_public_edu_admin',         'Public Education Administration',                        true, 200),
  ('gov_edu_policy_governance',    'Educational Policy and Governance',                      true, 201),
  ('gov_curriculum_assessment',    'Curriculum Development and Assessment Boards',           true, 202),
  ('gov_he_regulation',            'Higher Education Regulation and Accreditation',          true, 203),
  ('gov_public_health_nutrition',  'Public Health and School Nutrition (Mid-Day Meal Schemes)', true, 204),
  ('gov_teacher_certification',    'Teacher Certification and Institutional Training',       true, 205),
  ('gov_edu_infra_development',    'Public Educational Infrastructure Development',          true, 206),
  ('gov_academic_research_grants', 'Academic Research and Public Grant Funding',             true, 207),
  ('ngo_ecce',                     'Early Childhood Care and Education (ECCE)',              true, 300),
  ('ngo_child_rights',             'Child Rights and Educational Advocacy',                  true, 301),
  ('ngo_sen_inclusive',            'Special Educational Needs (SEN) and Inclusive Education', true, 302),
  ('ngo_digital_literacy',         'Digital Literacy and EdTech Accessibility',              true, 303),
  ('ngo_girl_marginalized',        'Girl Child and Marginalized Community Education',        true, 304),
  ('ngo_skill_vocational',         'Skill Development and Vocational Training',              true, 305),
  ('ngo_funding_scholarships',     'Educational Funding, Endowments, and Scholarships',      true, 306),
  ('ngo_teacher_capacity',         'Teacher Capacity Building and Support',                  true, 307),
  ('ngo_community_literacy',       'Community-Based Learning and Literacy Programs',         true, 308),
  ('ent_automotive',               'Automotive & Auto Components',                           true, 400),
  ('ent_aerospace_defense',        'Aerospace & Defense',                                    true, 401),
  ('ent_pharma_lifesciences',      'Pharmaceuticals & Life Sciences',                        true, 402),
  ('ent_healthcare_hospitals',     'Healthcare & Hospitals',                                 true, 403),
  ('ent_biotechnology',            'Biotechnology',                                          true, 404),
  ('ent_chemicals_petro',          'Chemicals & Petrochemicals',                             true, 405),
  ('ent_oil_gas_energy',           'Oil & Gas / Energy',                                     true, 406),
  ('ent_power_utilities',          'Power & Utilities (Renewable / Conventional)',           true, 407),
  ('ent_construction_infra',       'Construction & Infrastructure',                          true, 408),
  ('ent_real_estate',              'Real Estate',                                            true, 409)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_academic UUID; v_school UUID; v_college1 UUID; v_college2 UUID; v_uni UUID;
  v_govt UUID; v_ngo UUID;
  v_large UUID; v_medium UUID; v_small UUID; v_micro UUID; v_msme UUID; v_startup UUID;
BEGIN
  SELECT id INTO v_academic FROM public.organization_types WHERE code='ACADEMIC';
  SELECT id INTO v_school   FROM public.organization_types WHERE code='SCHOOL';
  SELECT id INTO v_college1 FROM public.organization_types WHERE code='COL';
  SELECT id INTO v_college2 FROM public.organization_types WHERE code='COLLEGE';
  SELECT id INTO v_uni      FROM public.organization_types WHERE code='UNI';
  SELECT id INTO v_govt     FROM public.organization_types WHERE code='GOVT';
  SELECT id INTO v_ngo      FROM public.organization_types WHERE code='NGO';
  SELECT id INTO v_large    FROM public.organization_types WHERE code='LARGE_ENTERPRISE';
  SELECT id INTO v_medium   FROM public.organization_types WHERE code='MEDIUM_ENTERPRISE';
  SELECT id INTO v_small    FROM public.organization_types WHERE code='SMALL_ENTERPRISE';
  SELECT id INTO v_micro    FROM public.organization_types WHERE code='MICRO_ENTERPRISE';
  SELECT id INTO v_msme     FROM public.organization_types WHERE code='MSME';
  SELECT id INTO v_startup  FROM public.organization_types WHERE code='STARTUP';

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT ot, i.id, i.display_order
  FROM (VALUES (v_academic), (v_uni)) AS o(ot)
  CROSS JOIN public.industry_segments i
  WHERE ot IS NOT NULL AND i.code IN ('edu_pre_primary','edu_primary_middle','edu_secondary','edu_ug','edu_pg_research')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT v_school, i.id, i.display_order FROM public.industry_segments i
  WHERE v_school IS NOT NULL AND i.code IN ('edu_pre_primary','edu_primary_middle','edu_secondary')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT ot, i.id, i.display_order
  FROM (VALUES (v_college1), (v_college2)) AS o(ot)
  CROSS JOIN public.industry_segments i
  WHERE ot IS NOT NULL AND i.code IN ('edu_ug','edu_pg_research')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT v_govt, i.id, i.display_order FROM public.industry_segments i
  WHERE v_govt IS NOT NULL AND i.code IN (
    'gov_public_edu_admin','gov_edu_policy_governance','gov_curriculum_assessment',
    'gov_he_regulation','gov_public_health_nutrition','gov_teacher_certification',
    'gov_edu_infra_development','gov_academic_research_grants'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT v_ngo, i.id, i.display_order FROM public.industry_segments i
  WHERE v_ngo IS NOT NULL AND i.code IN (
    'ngo_ecce','ngo_child_rights','ngo_sen_inclusive','ngo_digital_literacy',
    'ngo_girl_marginalized','ngo_skill_vocational','ngo_funding_scholarships',
    'ngo_teacher_capacity','ngo_community_literacy'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.org_type_industry_segments (org_type_id, industry_id, display_order)
  SELECT ot, i.id, i.display_order
  FROM (VALUES (v_large), (v_medium), (v_small), (v_micro), (v_msme), (v_startup)) AS o(ot)
  CROSS JOIN public.industry_segments i
  WHERE ot IS NOT NULL AND i.code IN (
    'manufacturing_auto_components','technology','technology_india_it',
    'ent_automotive','ent_aerospace_defense','ent_pharma_lifesciences',
    'ent_healthcare_hospitals','ent_biotechnology','ent_chemicals_petro',
    'ent_oil_gas_energy','ent_power_utilities','ent_construction_infra','ent_real_estate'
  )
  ON CONFLICT DO NOTHING;
END $$;
