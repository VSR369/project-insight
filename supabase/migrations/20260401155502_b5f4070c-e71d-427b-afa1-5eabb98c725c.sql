-- Append SCOPE_PROPORTIONALITY quality criteria to 6 sections (idempotent)

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"error","description":"Number and complexity of deliverables must be achievable within budget and timeline.","cross_references":["reward_structure","phase_schedule"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'deliverables'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"warning","description":"Outcomes must be achievable within scope.","cross_references":["reward_structure","scope"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'expected_outcomes'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"warning","description":"KPI count must match challenge scale.","cross_references":["reward_structure","deliverables"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'success_metrics_kpis'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"warning","description":"Expertise level must match budget.","cross_references":["reward_structure","complexity"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'solver_expertise'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"error","description":"Phase count must fit within Creator timeline.","cross_references":["reward_structure","deliverables"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'phase_schedule'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';

UPDATE public.ai_review_section_config
SET quality_criteria = COALESCE(quality_criteria, '[]'::jsonb) || '[{"criterion":"SCOPE_PROPORTIONALITY","severity":"warning","description":"Criteria count proportional to deliverables.","cross_references":["deliverables","reward_structure"]}]'::jsonb,
    updated_at = NOW()
WHERE section_key = 'evaluation_criteria'
  AND role_context = 'curation'
  AND NOT COALESCE(quality_criteria, '[]'::jsonb)::text LIKE '%SCOPE_PROPORTIONALITY%';