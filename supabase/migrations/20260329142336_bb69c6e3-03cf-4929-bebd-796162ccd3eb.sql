
-- Priority 1a: Fix success_metrics_kpis web_search_queries (wrong key names: query → queryTemplate + add purpose)
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose":"KPI benchmarks","queryTemplate":"{{domain}} KPI benchmarks industry standards","when":"always"},{"purpose":"Success metrics best practices","queryTemplate":"{{solution_type}} success metrics best practices","when":"always"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation';

-- Priority 1b: Bump data_resources_provided version to 2
UPDATE ai_review_section_config
SET version = 2,
    web_search_queries = '[{"purpose":"Open data sources","queryTemplate":"{{domain}} open data sources datasets","when":"always"},{"purpose":"Data anonymization","queryTemplate":"data anonymization best practices {{domain}}","when":"if_sensitive_data"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'data_resources_provided' AND role_context = 'curation';

-- Priority 2: Add missing dos/donts for 7 sections
UPDATE ai_review_section_config
SET dos = 'Tie each outcome to a measurable KPI with baseline and target values. Reference the evaluation criteria to ensure outcomes are scoreable.',
    donts = 'Do not list vague aspirations like "improve efficiency". Do not duplicate deliverables — outcomes describe impact, not artifacts.',
    updated_at = now()
WHERE section_key = 'expected_outcomes' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'Ensure every KPI has a baseline, target, measurement method, and timeframe. Cross-reference against expected_outcomes for alignment.',
    donts = 'Do not accept KPIs without baselines. Do not accept unmeasurable metrics like "user satisfaction" without a defined instrument (e.g., NPS, CSAT).',
    updated_at = now()
WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'List each resource with its format, size, access method, and any restrictions. Flag missing resources that would be needed to complete the deliverables.',
    donts = 'Do not assume resources exist if not explicitly listed. Do not suggest the seeker share proprietary data without restrictions.',
    updated_at = now()
WHERE section_key = 'data_resources_provided' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'Map required expertise to specific deliverables. Distinguish between required and preferred qualifications. Flag overspecification that would exclude qualified solvers.',
    donts = 'Do not add expertise requirements beyond what the deliverables demand. Do not use vague descriptors like "experienced" without quantifiable criteria.',
    updated_at = now()
WHERE section_key = 'solver_expertise' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'Preserve seeker content exactly. Only flag if the list is empty when it should not be.',
    updated_at = now()
WHERE section_key = 'approaches_not_of_interest' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'Frame each deficiency as a factual observation with evidence. Cross-reference against context_and_background for consistency.',
    donts = 'Do not write aspirational statements. Keep as factual current-state observations with measurable impact where possible.',
    updated_at = now()
WHERE section_key = 'current_deficiencies' AND role_context = 'curation';

UPDATE ai_review_section_config
SET dos = 'Identify structural causes, not symptoms. Link each root cause to evidence from the context or intake data.',
    donts = 'Do not list symptoms as root causes. Do not speculate beyond what the intake data supports.',
    updated_at = now()
WHERE section_key = 'root_causes' AND role_context = 'curation';

-- Priority 3: Add missing examples for 6 sections
UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Success Metrics KPIs):
"| KPI: Mean Time Between Failures (MTBF) | Baseline: 340 hours | Target: ≥720 hours | Measurement: SCADA event logs, rolling 30-day average | Timeframe: 6 months post-deployment |
| KPI: Prediction Accuracy | Baseline: N/A (new capability) | Target: ≥85% true positive rate | Measurement: Confusion matrix against maintenance records | Timeframe: 3-month validation period |
| KPI: False Alarm Rate | Baseline: 38% (2019 pilot) | Target: <5% | Measurement: Alert log vs. confirmed failures | Timeframe: 3-month validation period |"',
    example_poor = 'POOR EXAMPLE (Success Metrics KPIs):
"| Improve uptime | - | Better | TBD | Soon |
| Reduce costs | High | Low | Quarterly review | This year |"',
    updated_at = now()
WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation';

UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Approaches Not of Interest):
"1. Pure rules-based expert systems — the problem space has too many edge cases for hand-crafted rules to scale.
2. Solutions requiring replacement of existing SCADA infrastructure — capital budget is not available for hardware changes.
3. Cloud-only architectures — OT network isolation policy requires edge processing with local data residency."',
    example_poor = 'POOR EXAMPLE (Approaches Not of Interest):
"We don''t want bad solutions or anything too expensive."',
    updated_at = now()
WHERE section_key = 'approaches_not_of_interest' AND role_context = 'curation';

UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Current Deficiencies):
"1. Manual reconciliation process requires 3.5 FTE across 12 sites — annual cost $420K.
2. Current SCADA alerting generates 38% false positives, causing alert fatigue and missed genuine failures.
3. No predictive capability — all maintenance is reactive, resulting in 8.7% unplanned downtime vs. industry benchmark of <2%."',
    example_poor = 'POOR EXAMPLE (Current Deficiencies):
"1. Things are not working well. 2. The system is old. 3. We need improvement."',
    updated_at = now()
WHERE section_key = 'current_deficiencies' AND role_context = 'curation';

UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Preferred Approach):
"1. Machine learning model trained on historical SCADA time-series data (vibration, temperature, pressure) to predict equipment failure 4-24 hours in advance.
2. Edge deployment architecture — model inference runs on local gateway devices to comply with OT network isolation policy.
3. Integration via OPC-UA protocol with existing Siemens S7-1500 PLCs — no hardware modifications required."',
    example_poor = 'POOR EXAMPLE (Preferred Approach):
"1. Use AI. 2. Make it work with our systems. 3. Something innovative."',
    updated_at = now()
WHERE section_key = 'preferred_approach' AND role_context = 'curation';

UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Root Causes):
"1. Legacy PLC communication protocols (Profibus DP) lack standardised data export — prevents automated data collection.
2. Maintenance team operates on reactive model inherited from 2012 outsourcing contract — no incentive structure for predictive maintenance.
3. Previous IoT pilot (2019) failed due to insufficient data engineering capacity — raw sensor data was too noisy for direct model training."',
    example_poor = 'POOR EXAMPLE (Root Causes):
"1. Old technology. 2. Not enough resources. 3. Management issues."',
    updated_at = now()
WHERE section_key = 'root_causes' AND role_context = 'curation';

UPDATE ai_review_section_config
SET example_good = 'GOOD EXAMPLE (Data & Resources):
"| 5 years of SCADA sensor data | Time-series CSV | CSV/Parquet | 2.3 TB | SFTP with SSH key | NDA required, no export outside platform |
| Equipment maintenance logs | Structured records | SAP PM export (XLSX) | 450 MB | Platform upload | Anonymised — no personnel identifiers |
| Plant floor layout diagrams | CAD drawings | DWG/PDF | 120 MB | Platform upload | Confidential — view-only, no redistribution |"',
    example_poor = 'POOR EXAMPLE (Data & Resources):
"| Some data | Various | Files | Large | Download | None |"',
    updated_at = now()
WHERE section_key = 'data_resources_provided' AND role_context = 'curation';

-- Priority 4: Add content templates for 5 high-impact sections
UPDATE ai_review_section_config
SET content_templates = '{"blueprint":"Scope for Blueprint challenges should define the analytical boundaries: which business processes are in/out of scope, which data sources will be examined, and what strategic questions must be answered. Avoid implementation-level detail.","poc":"Scope for POC challenges should define the technical boundaries: which systems will be integrated, what data volumes will be tested, what performance thresholds must be demonstrated, and what is explicitly excluded from the prototype.","pilot":"Scope for Pilot challenges should define operational boundaries: deployment sites, user populations, integration points with production systems, rollback criteria, and explicit exclusions to prevent scope creep."}'::jsonb,
    updated_at = now()
WHERE section_key = 'scope' AND role_context = 'curation';

UPDATE ai_review_section_config
SET content_templates = '{"blueprint":"Blueprint rewards should reflect strategic consulting value — typically $10K-$50K range. Consider multiple prizes to encourage diverse perspectives. Payment on delivery of final report and presentation.","poc":"POC rewards should reflect technical development effort — typically $25K-$150K range. Consider milestone-based payments tied to acceptance criteria. Winner-take-all is common but second prizes improve participation.","pilot":"Pilot rewards should reflect production-grade delivery — typically $50K-$500K range. Structure with milestone payments tied to deployment phases. Include performance bonuses for exceeding KPI targets."}'::jsonb,
    updated_at = now()
WHERE section_key = 'reward_structure' AND role_context = 'curation';

UPDATE ai_review_section_config
SET content_templates = '{"blueprint":"Blueprint timelines: 4-8 weeks typical. Phases: Brief review (1w), Research & Analysis (2-4w), Report drafting (1-2w), Evaluation (1-2w). Longer Q&A periods appropriate for strategic challenges.","poc":"POC timelines: 6-16 weeks typical. Phases: Brief review & Q&A (1-2w), Development (4-10w), Testing & Documentation (1-2w), Evaluation (2-3w). Include buffer for iteration.","pilot":"Pilot timelines: 12-26 weeks typical. Phases: Planning & Setup (2-4w), Development (6-12w), Deployment & Testing (2-6w), UAT & Documentation (2-4w), Evaluation (2-4w). Include rollback windows."}'::jsonb,
    updated_at = now()
WHERE section_key = 'phase_schedule' AND role_context = 'curation';

UPDATE ai_review_section_config
SET content_templates = '{"blueprint":"Blueprint submissions: Strategy document (PDF), Executive presentation (PDF/PPTX), Supporting data analysis. Emphasise clarity and actionability over volume.","poc":"POC submissions: Working code package (ZIP), Technical documentation, Demo video (5-10 min), Performance test results. Specify environment requirements for evaluation.","pilot":"Pilot submissions: Deployment package with installation guide, Full documentation suite, UAT results, Performance benchmarks, Operations runbook, Training materials. Specify handover requirements."}'::jsonb,
    updated_at = now()
WHERE section_key = 'submission_guidelines' AND role_context = 'curation';

-- Priority 5: Add supervisor examples for 5 critical sections
UPDATE ai_review_section_config
SET supervisor_examples = '[{"scenario":"Problem statement identifies a specific stakeholder (logistics operator), quantifies the pain ($2.3M annual loss), provides evidence (47 incidents/week, 30-90 min each), and avoids internal jargon or confidential details. Publication-ready.","verdict":"pass"},{"scenario":"Problem statement uses internal acronyms (OWMS), names the CEO, references internal restructuring dates, and provides no quantified impact. Would confuse external solvers and risks information leakage.","verdict":"fail — contains confidential details and lacks quantified impact"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'problem_statement' AND role_context = 'curation';

UPDATE ai_review_section_config
SET supervisor_examples = '[{"scenario":"Each deliverable has a unique identifier (D1-D3), specific acceptance criteria with measurable thresholds, and an identified evaluator role. Cross-referenced against evaluation criteria — all deliverables are scoreable.","verdict":"pass"},{"scenario":"Deliverables listed as a working solution with good documentation. No acceptance criteria, no evaluator roles, no measurable thresholds. Cannot be objectively evaluated.","verdict":"fail — missing acceptance criteria and evaluator assignments"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'deliverables' AND role_context = 'curation';

UPDATE ai_review_section_config
SET supervisor_examples = '[{"scenario":"Four criteria with weights summing to 100% (40+25+20+15). Each criterion has a scoring method (automated test, deployment test, checklist) and assigned evaluator role (IT Architect, IT Manager, AP Manager). Every deliverable maps to at least one criterion.","verdict":"pass"},{"scenario":"Three criteria with weights summing to 90%. No scoring methods specified. Evaluator listed as we will score for all criteria. One deliverable (D3: Exception ruleset) has no corresponding criterion.","verdict":"fail — weights sum to 90%, missing scoring methods, unassigned evaluators, unmapped deliverable"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'evaluation_criteria' AND role_context = 'curation';

UPDATE ai_review_section_config
SET supervisor_examples = '[{"scenario":"First prize $75K, second prize $25K. Total $100K matches escrow deposit. Payment terms clear: within 30 days of IP transfer. Prize conditional on acceptance tests. No partial payments. Proportional to L3 complexity and 8-week timeline.","verdict":"pass"},{"scenario":"Prize: to be confirmed. No amounts specified. Payment terms missing. Cannot assess proportionality to scope or verify escrow alignment.","verdict":"fail — no amounts, no payment terms, cannot validate against escrow"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'reward_structure' AND role_context = 'curation';

UPDATE ai_review_section_config
SET supervisor_examples = '[{"scenario":"Five phases with specific dates. 8-week submission window appropriate for L3 POC. Q&A period (2 weeks) allows meaningful clarification. 3-week evaluation period allows thorough review. All dates are business days. Dependencies between phases are logical.","verdict":"pass"},{"scenario":"Opens: soon. Submissions: in a few weeks. Evaluation: promptly. No specific dates, no phase durations, impossible to assess timeline adequacy or communicate to solvers.","verdict":"fail — no dates, no durations, unpublishable"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'phase_schedule' AND role_context = 'curation';
