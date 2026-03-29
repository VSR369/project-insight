
-- Populate quality criteria, cross-references, and research directives for 5 under-configured sections

-- 1. data_resources_provided (HIGH priority - new Phase 7 section)
UPDATE ai_review_section_config SET
  quality_criteria = '[
    {"name": "COMPLETENESS", "description": "Every data dependency mentioned in Scope or Deliverables must have a corresponding resource listed with name, description, and access method.", "severity": "error", "crossReferences": ["scope", "deliverables"]},
    {"name": "ACCESS_CLARITY", "description": "Each resource must specify format (CSV, API, database), approximate size, and how solvers will access it (download link, API key, sandbox).", "severity": "warning", "crossReferences": ["submission_guidelines"]},
    {"name": "FORMAT_SPECIFICITY", "description": "Prefer structured formats (CSV, JSON, API endpoint) over vague descriptions like will be provided or TBD.", "severity": "suggestion", "crossReferences": []},
    {"name": "SENSITIVITY_FLAGGING", "description": "If data contains PII, financial, or proprietary information, it must be flagged with appropriate handling instructions.", "severity": "warning", "crossReferences": ["ip_model"]}
  ]'::jsonb,
  cross_references = '["scope", "deliverables", "submission_guidelines", "ip_model"]'::jsonb,
  web_search_queries = '[
    {"query": "{{domain}} open data sources datasets", "when": "always"},
    {"query": "data anonymization best practices {{domain}}", "when": "if_sensitive_data"}
  ]'::jsonb,
  industry_frameworks = '["FAIR Data Principles", "Data Governance Framework"]'::jsonb,
  review_instructions = 'Ensure every data dependency in Scope or Deliverables has a corresponding resource listed. Check that each resource specifies format, size, and access method. Flag any PII or proprietary data that lacks handling instructions. Cross-reference with IP Model for consistency.'
WHERE section_key = 'data_resources_provided' AND role_context = 'curation';

-- 2. success_metrics_kpis (HIGH priority - new Phase 7 section)
UPDATE ai_review_section_config SET
  quality_criteria = '[
    {"name": "QUANTITATIVE", "description": "Every KPI must have a numeric target value or range, not qualitative descriptions like improve or enhance.", "severity": "error", "crossReferences": ["expected_outcomes"]},
    {"name": "OUTCOME_ALIGNMENT", "description": "Each KPI must map to at least one Expected Outcome. Orphan KPIs with no outcome connection should be flagged.", "severity": "warning", "crossReferences": ["expected_outcomes"]},
    {"name": "EVALUATION_ALIGNMENT", "description": "KPIs should be measurable by the defined evaluation criteria. If a KPI cannot be assessed by any criterion, flag the gap.", "severity": "warning", "crossReferences": ["evaluation_criteria", "deliverables"]},
    {"name": "BASELINE_REALITY", "description": "Where possible, include current baseline values so solvers understand the gap to close. Flag KPIs with no baseline context.", "severity": "suggestion", "crossReferences": []},
    {"name": "MEASURABILITY_WINDOW", "description": "Each KPI should specify when it will be measured (during challenge, at delivery, post-implementation) to set realistic expectations.", "severity": "suggestion", "crossReferences": ["phase_schedule"]}
  ]'::jsonb,
  cross_references = '["expected_outcomes", "evaluation_criteria", "deliverables", "phase_schedule"]'::jsonb,
  web_search_queries = '[
    {"query": "{{domain}} KPI benchmarks industry standards", "when": "always"},
    {"query": "{{solution_type}} success metrics best practices", "when": "always"}
  ]'::jsonb,
  industry_frameworks = '["SMART Goals Framework", "OKR Methodology", "Balanced Scorecard"]'::jsonb,
  review_instructions = 'Ensure every KPI is quantitative with a numeric target, not qualitative. Each KPI must map to at least one Expected Outcome. Check that KPIs are measurable by the defined evaluation criteria. Suggest including current baselines and measurement windows where missing.'
WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation';

-- 3. challenge_visibility (MEDIUM priority)
UPDATE ai_review_section_config SET
  quality_criteria = '[
    {"name": "CONSISTENCY", "description": "Visibility setting must be consistent with IP model and solver eligibility. Open visibility with restrictive IP is contradictory.", "severity": "error", "crossReferences": ["ip_model", "eligibility"]},
    {"name": "TARGETING_MATCH", "description": "If targeting filters are set, visibility should not be fully open as this creates conflicting signals for the platform.", "severity": "warning", "crossReferences": ["solver_expertise_requirements"]}
  ]'::jsonb,
  cross_references = '["ip_model", "eligibility", "solver_expertise_requirements"]'::jsonb
WHERE section_key = 'challenge_visibility' AND role_context = 'curation';

-- 4. effort_level (MEDIUM priority)
UPDATE ai_review_section_config SET
  quality_criteria = '[
    {"name": "SCOPE_ALIGNMENT", "description": "Effort level must be proportionate to the scope and deliverables. A large scope with low effort is unrealistic.", "severity": "warning", "crossReferences": ["scope", "deliverables"]},
    {"name": "COMPLEXITY_MATCH", "description": "Effort level should align with the complexity score. High complexity with low effort signals misalignment.", "severity": "warning", "crossReferences": ["problem_statement"]}
  ]'::jsonb,
  cross_references = '["scope", "deliverables", "problem_statement"]'::jsonb
WHERE section_key = 'effort_level' AND role_context = 'curation';

-- 5. submission_deadline (LOW priority but still benefits)
UPDATE ai_review_section_config SET
  quality_criteria = '[
    {"name": "REALISTIC_TIMELINE", "description": "Deadline must allow sufficient time for the complexity level: minimum 2 weeks for simple, 4-6 weeks for complex challenges.", "severity": "error", "crossReferences": ["phase_schedule"]},
    {"name": "FORMAT_COMPLETENESS", "description": "Deadline must include date, time, and timezone. Missing timezone causes ambiguity for global solvers.", "severity": "warning", "crossReferences": []},
    {"name": "FUTURE_DATE", "description": "Submission deadline must be in the future. Flag any deadline that has already passed.", "severity": "error", "crossReferences": []}
  ]'::jsonb,
  cross_references = '["phase_schedule", "scope"]'::jsonb
WHERE section_key = 'submission_deadline' AND role_context = 'curation';
