-- Add missing AI review section configs for curation context
-- These sections exist in the edge function fallback but were never added to the DB,
-- causing them to be skipped since DB config takes precedence when any rows exist.

-- 1. Rename visibility_eligibility → visibility (edge function expects 'visibility')
UPDATE ai_review_section_config
SET section_key = 'visibility',
    section_label = 'Visibility',
    section_description = 'Solver visibility types properly configured',
    updated_at = NOW()
WHERE role_context = 'curation'
  AND section_key = 'visibility_eligibility';

-- 2. Insert expected_outcomes
INSERT INTO ai_review_section_config (
  role_context, section_key, section_label, importance_level, section_description,
  review_instructions, tone, min_words, max_words, required_elements, is_active
) VALUES (
  'curation', 'expected_outcomes', 'Expected Outcomes', 'High',
  'Clear, measurable outcomes solvers should deliver',
  'Check that expected outcomes are: (1) measurable and verifiable, (2) aligned with deliverables, (3) specific enough for evaluators to assess completion, (4) not duplicating deliverables but describing the impact or result of deliverables.',
  'Formal', 30, 300, ARRAY['measurable outcomes', 'alignment with deliverables', 'verifiable criteria'], true
) ON CONFLICT (role_context, section_key) DO NOTHING;

-- 3. Insert solver_expertise
INSERT INTO ai_review_section_config (
  role_context, section_key, section_label, importance_level, section_description,
  review_instructions, tone, min_words, max_words, required_elements, is_active
) VALUES (
  'curation', 'solver_expertise', 'Solver Expertise Requirements', 'Medium',
  'Required solver expertise areas, sub-domains, and specialities',
  'Check that solver expertise requirements: (1) are specific enough to attract qualified solvers, (2) are not overly restrictive to exclude capable solvers, (3) align with the challenge domain and complexity, (4) include relevant sub-domains and specialities where applicable.',
  'Balanced', 10, 200, ARRAY['expertise areas defined', 'not overly restrictive'], true
) ON CONFLICT (role_context, section_key) DO NOTHING;

-- 4. Insert Extended Brief subsections
INSERT INTO ai_review_section_config (
  role_context, section_key, section_label, importance_level, section_description,
  review_instructions, dos, donts, tone, min_words, max_words, required_elements, is_active
) VALUES
(
  'curation', 'context_and_background', 'Context & Background', 'High',
  'Comprehensive context for external solvers — operational setting, prior attempts',
  'Check that the context: (1) provides meaningful background beyond the problem statement, (2) includes prior attempts or existing solutions, (3) is well-organized and readable, (4) does not contradict the main specification, (5) adds value for external solvers who have no prior knowledge of the organization.',
  'Include domain-specific context that helps solvers understand the operational environment.',
  'Do not repeat the problem statement verbatim. Do not include confidential information.',
  'Balanced', 50, 500, ARRAY['meaningful context beyond problem statement', 'prior attempts mentioned', 'no contradictions with spec'], true
),
(
  'curation', 'root_causes', 'Root Causes', 'Medium',
  'Discrete root causes inferred from problem statement — phrase labels, max 8',
  'Check that root causes: (1) are discrete phrase labels, not full sentences, (2) are logically derived from the problem statement, (3) do not exceed 8 items, (4) are distinct from each other without overlap.',
  NULL, 'Do not write full explanations. Keep as concise phrase labels.',
  'Balanced', 10, 200, ARRAY['discrete phrase labels', 'derived from problem statement', 'max 8 items'], true
),
(
  'curation', 'affected_stakeholders', 'Affected Stakeholders', 'Medium',
  'Stakeholder table with name, role, impact, adoption challenge',
  'Check that the stakeholder table: (1) identifies key stakeholders by name or role, (2) describes impact on each stakeholder, (3) includes adoption challenges — this is the most valuable field, (4) does not have empty or generic entries.',
  'Always populate adoption_challenge — it is the most valuable field.',
  'Do not leave adoption_challenge empty or generic.',
  'Balanced', 20, 400, ARRAY['stakeholder names or roles', 'impact descriptions', 'adoption challenges populated'], true
),
(
  'curation', 'current_deficiencies', 'Current Deficiencies', 'Medium',
  'Current-state observation phrases — factual, not aspirational, max 10',
  'Check that current deficiencies: (1) are factual observations about the current state, (2) are not wishes or solution hints, (3) do not exceed 10 items, (4) are distinct from root causes.',
  NULL, 'Do not write aspirational statements. Keep as factual current-state observations.',
  'Balanced', 10, 300, ARRAY['factual observations', 'current state focus', 'max 10 items'], true
),
(
  'curation', 'extended_brief_expected_outcomes', 'Extended Brief Expected Outcomes', 'Medium',
  'Expected outcomes aligned with deliverables — never remove streamed items',
  'Check that expected outcomes: (1) are aligned with deliverables, (2) do not remove outcomes that were streamed from the spec phase, (3) are measurable and verifiable.',
  'Preserve all outcomes streamed from spec. Add new ones if gaps exist.',
  'Never remove outcomes that came from the specification phase.',
  'Balanced', 20, 300, ARRAY['aligned with deliverables', 'streamed outcomes preserved'], true
),
(
  'curation', 'preferred_approach', 'Preferred Approach', 'Low',
  'Seeker''s strategic preferences — never rewrite human content',
  'If content exists, do NOT rewrite it. This represents the seeker''s stated preferences and must be preserved exactly as written. Only provide review comments about completeness or clarity.',
  'Preserve seeker content exactly as written.',
  'Never rewrite or paraphrase the seeker''s preferred approach.',
  'Balanced', 10, 400, ARRAY['seeker preferences preserved'], true
),
(
  'curation', 'approaches_not_of_interest', 'Approaches Not of Interest', 'Low',
  'Human-only section — approaches to exclude',
  'Always flag as requires_human_input. This section requires explicit human input about excluded approaches. Never generate content for this section.',
  NULL, 'Never generate content for this section. It requires explicit human input.',
  'Balanced', 0, 200, ARRAY[]::text[], true
)
ON CONFLICT (role_context, section_key) DO NOTHING;