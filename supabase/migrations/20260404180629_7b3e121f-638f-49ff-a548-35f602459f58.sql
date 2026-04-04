-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Correct field rules: Creator fields, AI-drafted,            ║
-- ║  Curator-enriched, Platform defaults                         ║
-- ║  QUICK: 5 required | STRUCTURED: 8 | CONTROLLED: 12         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- PLATFORM DEFAULTS — same for ALL modes
UPDATE public.md_governance_field_rules SET visibility = 'auto'
WHERE field_key IN (
  'reward_type','silver_award','rejection_fee_pct','payment_mode','payment_milestones',
  'review_duration','required_expertise_level_id','required_proficiencies',
  'required_sub_domains','required_specialities','permitted_artifact_types',
  'submission_template_url','targeting_filters'
) AND is_active = true;

-- CURATOR-OWNED — hidden in QUICK, optional in STRUCTURED + CONTROLLED
UPDATE public.md_governance_field_rules SET visibility = 'hidden'
WHERE governance_mode = 'QUICK' AND field_key IN (
  'industry_segment_id','taxonomy_tags','experience_countries','gold_award',
  'num_rewarded_solutions','effort_level','submission_deadline','phase_durations',
  'complexity_params','complexity_notes','eligible_participation_modes',
  'solver_eligibility_id','solver_eligibility_ids','challenge_visibility',
  'challenge_enrollment','challenge_submission','preferred_approach',
  'approaches_not_of_interest','phase_notes','solution_category_description'
) AND is_active = true;

UPDATE public.md_governance_field_rules SET visibility = 'optional'
WHERE governance_mode IN ('STRUCTURED','CONTROLLED') AND field_key IN (
  'industry_segment_id','taxonomy_tags','experience_countries','gold_award',
  'num_rewarded_solutions','effort_level','submission_deadline','phase_durations',
  'complexity_params','complexity_notes','eligible_participation_modes',
  'solver_eligibility_id','solver_eligibility_ids','challenge_visibility',
  'challenge_enrollment','challenge_submission','preferred_approach',
  'approaches_not_of_interest','phase_notes','solution_category_description'
) AND is_active = true;

-- AI-DRAFTED — hidden in QUICK, ai_drafted in STRUCTURED + CONTROLLED
UPDATE public.md_governance_field_rules SET visibility = 'hidden'
WHERE governance_mode = 'QUICK' AND field_key IN (
  'description','detailed_description','root_causes','affected_stakeholders',
  'current_deficiencies','expected_outcomes','submission_guidelines',
  'reward_description','eligibility'
) AND is_active = true;

UPDATE public.md_governance_field_rules SET visibility = 'ai_drafted'
WHERE governance_mode IN ('STRUCTURED','CONTROLLED') AND field_key IN (
  'description','detailed_description','root_causes','affected_stakeholders',
  'current_deficiencies','expected_outcomes','submission_guidelines',
  'reward_description','eligibility'
) AND is_active = true;

UPDATE public.md_governance_field_rules SET visibility = 'ai_drafted'
WHERE governance_mode IN ('STRUCTURED','CONTROLLED') AND field_key = 'deliverables_list' AND is_active = true;

-- CREATOR FIELDS — governance controls rigor
UPDATE public.md_governance_field_rules SET visibility = 'optional' WHERE governance_mode = 'QUICK' AND field_key = 'maturity_level' AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'hidden' WHERE governance_mode = 'QUICK' AND field_key IN ('scope','hook','context_background') AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'auto' WHERE governance_mode = 'QUICK' AND field_key = 'ip_model' AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'optional' WHERE governance_mode = 'QUICK' AND field_key = 'expected_timeline' AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'required' WHERE governance_mode = 'STRUCTURED' AND field_key IN ('ip_model','expected_timeline') AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'optional' WHERE governance_mode = 'STRUCTURED' AND field_key IN ('hook','context_background') AND is_active = true;
UPDATE public.md_governance_field_rules SET visibility = 'required' WHERE governance_mode = 'CONTROLLED' AND field_key IN ('hook','context_background','ip_model','expected_timeline') AND is_active = true;