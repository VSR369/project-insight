-- ============================================================
-- PHASE 2: High Priority Fixes (Issues 6-7, 11, 15-16)
-- ============================================================

-- Issue 6a: Add good/bad examples for context_and_background
UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Context & Background):
"GlobalTech Manufacturing, a $2.4B automotive parts supplier with 12 plants across APAC, has experienced a 23% increase in unplanned downtime over the past 18 months. Their current SCADA systems (Siemens WinCC, deployed 2016) lack predictive analytics capabilities. Three prior attempts at IoT-based monitoring (2019 pilot with PTC ThingWorx, 2021 internal build, 2022 vendor evaluation) failed due to integration complexity with legacy PLCs and insufficient data engineering capacity. Industry benchmarks (Gartner 2024) suggest best-in-class manufacturers achieve <2% unplanned downtime vs. GlobalTech''s current 8.7%."',
example_poor = 'POOR EXAMPLE (Context & Background):
"The company has manufacturing issues and needs a better system. They have tried some things before but they didn''t work. The industry is moving towards digital transformation and they need to keep up with competitors."',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'context_and_background';

-- Issue 6b: Add good/bad examples for expected_outcomes
UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Expected Outcomes):
"1. Reduce unplanned downtime from 8.7% to <3% within 6 months of pilot deployment, measured via SCADA event logs. 2. Achieve ≥85% prediction accuracy for critical equipment failures with ≥4 hours lead time, validated against maintenance records. 3. Deliver ROI model showing ≥150% return within 18 months based on avoided downtime costs ($340K/hour average)."',
example_poor = 'POOR EXAMPLE (Expected Outcomes):
"1. Improve manufacturing efficiency. 2. Reduce costs. 3. Better use of data."',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'expected_outcomes';

-- Issue 6c: Add good/bad examples for solver_expertise
UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Solver Expertise):
"Required: (1) Industrial IoT architecture experience — minimum 2 deployments integrating with legacy SCADA/PLC systems. (2) Time-series ML — proven track record with predictive maintenance models (LSTM, transformer-based, or similar). (3) Edge computing deployment — experience with constrained environments (<4GB RAM, intermittent connectivity). Preferred: Familiarity with Siemens MindSphere or equivalent industrial cloud platforms."',
example_poor = 'POOR EXAMPLE (Solver Expertise):
"Must be experienced in AI and IoT. Should have relevant industry background."',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'solver_expertise';

-- Issue 6d: Add good/bad examples for affected_stakeholders
UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Affected Stakeholders):
"| Plant Operations Managers (12) | Primary users — will rely on predictive alerts for shift scheduling and maintenance planning. Adoption challenge: distrust of AI recommendations due to 2019 pilot false positives (38% false alarm rate). | Maintenance Technicians (85) | Must integrate new alert workflows into existing CMMS (SAP PM). Adoption challenge: limited digital literacy; 60% have no tablet/mobile device experience. | IT/OT Security Team (4) | Must approve edge device deployment and network segmentation. Adoption challenge: OT network isolation policy conflicts with cloud connectivity requirements."',
example_poor = 'POOR EXAMPLE (Affected Stakeholders):
"| Management | Will use the system | None | | Workers | Will be impacted | Training needed |"',
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'affected_stakeholders';

-- Issue 7: Add deliverables + scope cross-refs to phase_schedule
UPDATE ai_review_section_config
SET cross_references = '["maturity_level", "complexity", "evaluation_criteria", "deliverables", "scope"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'phase_schedule';

-- Issue 11a: Add web search directive to expected_outcomes
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose": "Industry KPI benchmarks", "queryTemplate": "{{domain}} KPI benchmarks enterprise", "when": "always"}]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'expected_outcomes';

-- Issue 11b: Add web search directive to evaluation_criteria
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose": "Evaluation best practices", "queryTemplate": "open innovation challenge evaluation criteria best practices", "when": "if_available"}]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'evaluation_criteria';

-- Issue 11c: Add web search directive to scope
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose": "Scope templates", "queryTemplate": "{{domain}} solution scope template enterprise", "when": "for_generation_only"}]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'scope';

-- Issue 11d: Add web search directive to problem_statement
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose": "Industry challenge statistics", "queryTemplate": "{{domain}} industry challenges statistics 2025", "when": "for_generation_only"}]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'problem_statement';

-- Issue 11e: Add web search directive to solver_expertise
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose": "Required skills reference", "queryTemplate": "{{domain}} required skills expertise enterprise", "when": "for_generation_only"}]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'solver_expertise';

-- Issue 15a: Add SELF_CONTAINED quality criterion to scope
UPDATE ai_review_section_config
SET quality_criteria = (
  quality_criteria::jsonb || '[{"name": "SELF_CONTAINED", "severity": "warning", "description": "An external solver with no organizational context should be able to understand the full scope from this section alone, without needing to reference other sections.", "crossReferences": ["problem_statement", "deliverables"]}]'::jsonb
)::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'scope';

-- Issue 15b: Add SELF_CONTAINED quality criterion to submission_guidelines
UPDATE ai_review_section_config
SET quality_criteria = (
  quality_criteria::jsonb || '[{"name": "SELF_CONTAINED", "severity": "warning", "description": "Submission instructions must be understandable by an external solver without access to internal tools or processes.", "crossReferences": ["deliverables"]}]'::jsonb
)::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'submission_guidelines';

-- Issue 16a: Add approaches_not_of_interest cross-ref to preferred_approach
UPDATE ai_review_section_config
SET cross_references = '["problem_statement", "scope", "context_and_background", "approaches_not_of_interest"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'preferred_approach';

-- Issue 16b: Add preferred_approach + deliverables cross-refs to approaches_not_of_interest
UPDATE ai_review_section_config
SET cross_references = '["problem_statement", "scope", "context_and_background", "preferred_approach", "deliverables"]'::json,
updated_at = now()
WHERE role_context = 'curation' AND section_key = 'approaches_not_of_interest';
