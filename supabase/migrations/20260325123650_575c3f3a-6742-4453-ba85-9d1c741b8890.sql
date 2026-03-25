-- Remove stale ai_review_section_config entries that don't correspond to real curation sections
-- extended_brief is a parent container (not a reviewable section)
-- extended_brief_expected_outcomes was removed (duplicates expected_outcomes in Content group)
DELETE FROM public.ai_review_section_config
WHERE role_context = 'curation'
  AND section_key IN ('extended_brief', 'extended_brief_expected_outcomes');