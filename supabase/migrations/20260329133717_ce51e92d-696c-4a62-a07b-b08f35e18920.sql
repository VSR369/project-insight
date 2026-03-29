-- ============================================================
-- PHASE 3: Medium/Low Priority Fixes (Issues 12-14, 17-18, 20)
-- ============================================================

-- Issue 12a: Add maturity-specific content templates to expected_outcomes
UPDATE ai_review_section_config
SET content_templates = '[
  {"maturity": "blueprint", "template": "Expected outcomes for Blueprint-level challenges should focus on strategic metrics: market sizing accuracy, framework adoption indicators, stakeholder alignment scores, and decision-quality improvements. Avoid operational KPIs that require a working system."},
  {"maturity": "poc", "template": "Expected outcomes for POC-level challenges should demonstrate technical feasibility: accuracy benchmarks, performance thresholds, integration success criteria, and scalability indicators. Include both functional and non-functional metrics."},
  {"maturity": "pilot", "template": "Expected outcomes for Pilot-level challenges should prove production readiness: SLA compliance, user adoption rates, ROI projections with confidence intervals, operational cost baselines, and measurable business impact within a defined timeframe."}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'expected_outcomes';

-- Issue 12b: Add maturity-specific content templates to evaluation_criteria
UPDATE ai_review_section_config
SET content_templates = '[
  {"maturity": "blueprint", "template": "Blueprint evaluation should weight strategic thinking (40%), feasibility analysis (30%), and presentation quality (30%). Avoid criteria requiring working code or prototypes."},
  {"maturity": "poc", "template": "POC evaluation should weight technical implementation (40%), innovation/approach (30%), and documentation/reproducibility (30%). Include measurable performance benchmarks."},
  {"maturity": "pilot", "template": "Pilot evaluation should weight production readiness (35%), scalability evidence (25%), user acceptance (20%), and operational documentation (20%). Require evidence of real-world testing."}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'evaluation_criteria';

-- Issue 12c: Add maturity-specific content templates to solver_expertise
UPDATE ai_review_section_config
SET content_templates = '[
  {"maturity": "blueprint", "template": "Blueprint challenges should emphasize strategic consulting experience, industry domain knowledge, and framework expertise. Implementation skills are less critical than analytical and communication abilities."},
  {"maturity": "poc", "template": "POC challenges should require hands-on technical skills relevant to the technology stack, prototyping experience, and ability to demonstrate feasibility within constrained timeframes."},
  {"maturity": "pilot", "template": "Pilot challenges should require production deployment experience, enterprise integration skills, change management capabilities, and proven track record with similar-scale implementations."}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'solver_expertise';

-- Issue 13: Add phase_schedule cross-ref + TIMING criterion to escrow_funding
UPDATE ai_review_section_config
SET cross_references = '["reward_structure", "phase_schedule"]'::json,
quality_criteria = '[
  {"name": "AMOUNT_MATCH", "severity": "error", "description": "Escrow = total prize pool in Reward Structure.", "crossReferences": ["reward_structure"]},
  {"name": "TIMING", "severity": "warning", "description": "Escrow funding timeline should align with Phase Schedule — funds must be secured before the challenge opens for submissions.", "crossReferences": ["phase_schedule"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'escrow_funding';

-- Issue 14: Add eligibility cross-ref + JURISDICTION_COVERAGE criterion to legal_docs
UPDATE ai_review_section_config
SET cross_references = '["ip_model", "eligibility"]'::json,
quality_criteria = '[
  {"name": "IP_CONSISTENCY", "severity": "error", "description": "Legal terms match IP Model.", "crossReferences": ["ip_model"]},
  {"name": "JURISDICTION_COVERAGE", "severity": "warning", "description": "Legal documents should cover all jurisdictions implied by the Eligibility settings. If eligibility is global, legal docs must address cross-border IP and dispute resolution.", "crossReferences": ["eligibility"]}
]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'legal_docs';

-- Issue 17: Fix maturity_level TRL terminology in review instructions
UPDATE ai_review_section_config
SET review_instructions = COALESCE(review_instructions, '') || '

MATURITY LEVEL DEFINITIONS (use these exact terms):
- Blueprint (TRL 1-3): Strategic analysis, framework design, feasibility study. No working code required.
- POC / Proof of Concept (TRL 4-6): Working prototype demonstrating technical feasibility. Limited scope, controlled environment.
- Pilot (TRL 7-9): Production-ready system tested in real-world conditions. Full operational documentation required.
When reviewing maturity level selection, verify the deliverables match the selected level. A Blueprint should never require working code. A Pilot should never accept a strategy document as the primary deliverable.',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'maturity_level';

-- Issue 18: Add complexity cross-ref to data_resources_provided
UPDATE ai_review_section_config
SET cross_references = '["scope", "deliverables", "submission_guidelines", "ip_model", "complexity"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'data_resources_provided';

-- Issue 20: Add INCENTIVE_HIGHLIGHT quality criterion to hook
UPDATE ai_review_section_config
SET quality_criteria = (
  quality_criteria::jsonb || '[{"name": "INCENTIVE_HIGHLIGHT", "severity": "suggestion", "description": "For challenges with non-monetary incentives (mentorship, co-development, licensing), the hook should highlight these alongside or instead of the prize amount to attract intrinsically motivated solvers.", "crossReferences": ["reward_structure"]}]'::jsonb
)::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'hook';
