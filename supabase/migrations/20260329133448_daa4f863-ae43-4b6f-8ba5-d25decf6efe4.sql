-- ============================================================
-- PHASE 1: Critical + Quick High Fixes (Issues 1-5, 8-10)
-- ============================================================

-- Issue 1: Deactivate 3 orphan sections (no wave/tab assignment)
UPDATE ai_review_section_config
SET is_active = false, updated_at = now()
WHERE role_context = 'curation'
  AND section_key IN ('challenge_visibility', 'effort_level', 'submission_deadline');

-- Issue 2: Enable platform preamble on 2 sections missing it
UPDATE ai_review_section_config
SET platform_preamble = (
  SELECT platform_preamble 
  FROM ai_review_section_config 
  WHERE role_context = 'curation' AND platform_preamble IS NOT NULL 
  LIMIT 1
),
updated_at = now()
WHERE role_context = 'curation'
  AND section_key IN ('data_resources_provided', 'success_metrics_kpis')
  AND platform_preamble IS NULL;

-- Issue 3a: root_causes — differentiated quality criteria
UPDATE ai_review_section_config
SET quality_criteria = '[
  {"name": "STRUCTURAL_DEPTH", "severity": "error", "description": "Goes beyond surface symptoms to identify structural, systemic, or process-level root causes. Each cause should be actionable.", "crossReferences": ["problem_statement", "context_and_background"]},
  {"name": "EVIDENCE_GROUNDING", "severity": "warning", "description": "Root causes reference specific data points, incidents, or observable patterns rather than assumptions.", "crossReferences": ["context_and_background"]},
  {"name": "CONSISTENCY", "severity": "error", "description": "Does not contradict Problem Statement or Context and Background.", "crossReferences": ["problem_statement", "scope"]},
  {"name": "DISTINCT_FROM_DEFICIENCIES", "severity": "warning", "description": "Root causes explain WHY deficiencies exist, not repeat the deficiencies themselves. Each root cause should be distinguishable from items in Current Deficiencies.", "crossReferences": ["current_deficiencies"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'root_causes';

-- Issue 3b: affected_stakeholders — differentiated quality criteria
UPDATE ai_review_section_config
SET quality_criteria = '[
  {"name": "COMPLETENESS", "severity": "error", "description": "All stakeholder groups impacted by the problem and solution are identified — including indirect stakeholders (IT ops, compliance, end-users).", "crossReferences": ["scope", "deliverables"]},
  {"name": "IMPACT_SPECIFICITY", "severity": "warning", "description": "Each stakeholder has a concrete impact description with quantifiable or observable effects, not generic statements.", "crossReferences": ["problem_statement", "context_and_background"]},
  {"name": "ADOPTION_CHALLENGE", "severity": "warning", "description": "Each stakeholder entry identifies realistic adoption barriers or change management considerations specific to their role.", "crossReferences": ["preferred_approach"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'affected_stakeholders';

-- Issue 3c: current_deficiencies — differentiated quality criteria
UPDATE ai_review_section_config
SET quality_criteria = '[
  {"name": "FACTUAL_NOT_ASPIRATIONAL", "severity": "error", "description": "Each deficiency describes a current observable problem, not a desired future state written in negative form.", "crossReferences": ["problem_statement"]},
  {"name": "TOOL_SPECIFICITY", "severity": "warning", "description": "Where applicable, names specific tools, systems, or processes that are deficient rather than generic descriptions.", "crossReferences": ["scope", "deliverables"]},
  {"name": "ROOT_CAUSE_DISTINCTION", "severity": "warning", "description": "Deficiencies describe WHAT is broken, not WHY it is broken. Root causes belong in the Root Causes section.", "crossReferences": ["root_causes"]},
  {"name": "CONSISTENCY", "severity": "error", "description": "Does not contradict Problem Statement or Context and Background.", "crossReferences": ["problem_statement", "scope"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'current_deficiencies';

-- Issue 3d: preferred_approach — differentiated quality criteria
UPDATE ai_review_section_config
SET quality_criteria = '[
  {"name": "NON_PRESCRIPTIVE", "severity": "warning", "description": "Describes directional preferences without dictating a specific implementation. Leaves room for solver creativity.", "crossReferences": ["deliverables"]},
  {"name": "CONTRADICTION_CHECK", "severity": "error", "description": "Does not contradict Approaches Not of Interest. If an approach appears in both, flag immediately.", "crossReferences": ["approaches_not_of_interest"]},
  {"name": "FEASIBILITY", "severity": "warning", "description": "Preferred approaches are realistic given the maturity level, complexity, and reward structure.", "crossReferences": ["maturity_level", "complexity", "reward_structure"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'preferred_approach';

-- Issue 3e: approaches_not_of_interest — differentiated quality criteria
UPDATE ai_review_section_config
SET quality_criteria = '[
  {"name": "SPECIFICITY", "severity": "warning", "description": "Each exclusion names a specific technology, methodology, or approach — not vague categories.", "crossReferences": ["scope"]},
  {"name": "JUSTIFICATION", "severity": "warning", "description": "Each exclusion has a brief rationale explaining why it is not of interest to the seeker.", "crossReferences": ["context_and_background"]},
  {"name": "CONTRADICTION_CHECK", "severity": "error", "description": "No excluded approach appears in Preferred Approach or is implied by Deliverables.", "crossReferences": ["preferred_approach", "deliverables"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'approaches_not_of_interest';

-- Issue 4: Add 4 cross-references to reward_structure
UPDATE ai_review_section_config
SET cross_references = '["complexity", "maturity_level", "phase_schedule", "escrow_funding", "solver_expertise"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'reward_structure';

-- Issue 5: Change complexity importance to Critical
UPDATE ai_review_section_config
SET importance_level = 'Critical',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'complexity';

-- Issue 8: Add problem_statement cross-ref to scope
UPDATE ai_review_section_config
SET cross_references = '["deliverables", "complexity", "problem_statement"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'scope';

-- Issue 9: Add scope cross-ref to context_and_background
UPDATE ai_review_section_config
SET cross_references = '["problem_statement", "scope"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'context_and_background';

-- Issue 10: Add deliverables cross-ref + DELIVERABLE_COVERAGE criterion to expected_outcomes
UPDATE ai_review_section_config
SET cross_references = '["problem_statement", "evaluation_criteria", "deliverables"]'::json,
quality_criteria = '[
  {"name": "MEASURABILITY", "severity": "error", "description": "Every outcome has a metric + threshold.", "crossReferences": []},
  {"name": "PROBLEM_TRACE", "severity": "error", "description": "Every outcome traces back to the Problem Statement.", "crossReferences": ["problem_statement"]},
  {"name": "EVALUATION_LINK", "severity": "warning", "description": "Every outcome maps to at least one Evaluation Criterion.", "crossReferences": ["evaluation_criteria"]},
  {"name": "DELIVERABLE_COVERAGE", "severity": "warning", "description": "Every deliverable should contribute to at least one expected outcome. Orphan deliverables with no outcome linkage should be flagged.", "crossReferences": ["deliverables"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'expected_outcomes';
