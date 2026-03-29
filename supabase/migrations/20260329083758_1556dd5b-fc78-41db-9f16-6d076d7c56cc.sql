-- Seed 24 section prompt configs with structured JSONB data (Phase 6 Step 3)
DO $$
DECLARE
  preamble TEXT := 'You are a senior management consultant and innovation architect with deep expertise across digital transformation, technology strategy, enterprise architecture, and open innovation program design. Your reviews and content must meet the quality bar of KPMG, PwC, EY, and Deloitte advisory deliverables — but your role is to help achieve these outcomes at 50% lower cost through open innovation with globally distributed solvers enrolled into our platform.

PLATFORM CONTEXT:
This is an enterprise open innovation platform. Challenges seek solution blueprints, POCs, and pilots across: digital business models, digital strategy, intelligent process design (SCM, procurement, finance, HR), technology architecture, data strategy, AI/ML solutions, agentic AI lifecycle management, cybersecurity, cloud modernization, smart workplaces, and operating model transformation.

QUALITY STANDARDS:
- CONSULTANT-GRADE: Every sentence should be something a Deloitte partner would sign off on. No filler. No platitudes. Specific, actionable, measurable.
- INDUSTRY-INFORMED: Reference frameworks (TOGAF, ITIL, SAFe, Design Thinking, JTBD, Value Chain Analysis, Blue Ocean Strategy) where applicable. Cite analyst perspectives (Gartner, Forrester, McKinsey, HBR).
- OPEN INNOVATION AWARE: Deliverables must be self-contained, well-scoped, and assessable by external solvers with no internal organizational context.
- MATURITY-DRIVEN: Blueprint = strategic document. POC = working prototype. Pilot = production-ready system. Never confuse these.

ANTI-HALLUCINATION RULES:
- NEVER invent technical specifications not mentioned in the challenge context.
- NEVER suggest dates without computing from today''s date + duration.
- NEVER recommend master data values outside the provided valid options.
- If you lack context for a specific recommendation, say exactly what information is needed and from which section.
- NEVER generate generic consulting boilerplate. Every sentence must reference THIS specific challenge.';
BEGIN

-- context_and_background
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 1, tab_group = 'Problem Definition',
  quality_criteria = '[{"name":"SPECIFICITY","description":"Names specific industry, organization type, domain, and quantifies the problem.","severity":"warning","crossReferences":[]},{"name":"PRIOR ART","description":"Mentions what has been tried before and why it failed.","severity":"warning","crossReferences":[]},{"name":"ALIGNMENT","description":"Logically leads into the Problem Statement.","severity":"error","crossReferences":["problem_statement"]}]'::jsonb,
  cross_references = '["problem_statement"]'::jsonb,
  content_templates = '{"blueprint":"Structure as: (1) Industry landscape in 2-3 sentences with data, (2) Specific pain point with metrics, (3) Why existing approaches fall short, (4) Opportunity statement.","poc":"Same as blueprint, plus: (5) Technical landscape.","pilot":"Same as poc, plus: (6) Organizational readiness."}'::jsonb,
  web_search_queries = '[{"purpose":"Industry benchmarks","queryTemplate":"{{domain}} industry challenges statistics 2024 2025","when":"for_generation_only"}]'::jsonb,
  industry_frameworks = '["Value Chain Analysis","Porter Five Forces"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'context_and_background';

-- problem_statement
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 1, tab_group = 'Problem Definition',
  quality_criteria = '[{"name":"SINGLE PROBLEM","description":"Describes ONE clear problem, not a laundry list.","severity":"error","crossReferences":[]},{"name":"MEASURABLE","description":"A solver can know exactly when they have succeeded.","severity":"error","crossReferences":["expected_outcomes"]},{"name":"SCOPE ALIGNMENT","description":"Problem fits within Scope.","severity":"error","crossReferences":["scope"]},{"name":"NO EMBEDDED SOLUTION","description":"Describes the PROBLEM, not a specific solution approach.","severity":"warning","crossReferences":[]},{"name":"COMPLEXITY MATCH","description":"Problem described in simple terms but rated L4/L5 suggests superficial description.","severity":"warning","crossReferences":["complexity"]}]'::jsonb,
  cross_references = '["expected_outcomes","scope","complexity"]'::jsonb,
  content_templates = '{"blueprint":"[Stakeholder] needs [capability] because [pain point], but currently [barrier]. A successful solution blueprint would define [measurable outcome].","poc":"[Stakeholder] needs [capability] because [pain point]. Current tools [specific limitation]. A successful POC would demonstrate [measurable technical outcome].","pilot":"[Stakeholder] needs [capability deployed at scale] because [quantified business impact]. A successful pilot would achieve [measurable business outcome]."}'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'problem_statement';

-- scope
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 1, tab_group = 'Problem Definition',
  quality_criteria = '[{"name":"IN-SCOPE SPECIFICITY","description":"Each in-scope item must be testable.","severity":"warning","crossReferences":[]},{"name":"OUT-OF-SCOPE COMPLETENESS","description":"Deliverables requiring capabilities NOT in scope must be flagged.","severity":"error","crossReferences":["deliverables"]},{"name":"COMPLEXITY ALIGNMENT","description":"If complexity cites multi-system integration but scope does not mention systems, flag.","severity":"error","crossReferences":["complexity"]}]'::jsonb,
  cross_references = '["deliverables","complexity"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'scope';

-- expected_outcomes
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 1, tab_group = 'Problem Definition',
  quality_criteria = '[{"name":"MEASURABILITY","description":"Every outcome has a metric + threshold.","severity":"error","crossReferences":[]},{"name":"PROBLEM TRACE","description":"Every outcome traces back to the Problem Statement.","severity":"error","crossReferences":["problem_statement"]},{"name":"EVALUATION LINK","description":"Every outcome maps to at least one Evaluation Criterion.","severity":"warning","crossReferences":["evaluation_criteria"]}]'::jsonb,
  cross_references = '["problem_statement","evaluation_criteria"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'expected_outcomes';

-- Challenge Context sections (wave 2)
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 2, tab_group = 'Challenge Context',
  quality_criteria = '[{"name":"DEPTH","description":"Goes beyond surface symptoms to structural/systemic factors.","severity":"warning","crossReferences":["problem_statement","context_and_background"]},{"name":"SPECIFICITY","description":"References specific technologies, processes, or organizational factors.","severity":"warning","crossReferences":["scope","deliverables"]},{"name":"CONSISTENCY","description":"Does not contradict other sections.","severity":"error","crossReferences":["problem_statement","scope"]}]'::jsonb,
  cross_references = '["problem_statement","scope","context_and_background"]'::jsonb,
  web_search_queries = '[{"purpose":"Industry analysis","queryTemplate":"{{domain}} common challenges root causes enterprise","when":"for_generation_only"}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key IN ('root_causes','affected_stakeholders','current_deficiencies','preferred_approach','approaches_not_of_interest');

-- deliverables
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 3, tab_group = 'Scope & Complexity',
  quality_criteria = '[{"name":"MATURITY MATCH","description":"Blueprint = documents. POC = working prototype. Pilot = deployed system.","severity":"error","crossReferences":["maturity_level"]},{"name":"ASSESSABILITY","description":"Every deliverable assessable by external evaluator.","severity":"warning","crossReferences":["evaluation_criteria"]},{"name":"SELF-CONTAINED","description":"Must not assume access to internal systems not provided.","severity":"error","crossReferences":["scope"]},{"name":"OUTCOME COVERAGE","description":"Every Expected Outcome has >=1 deliverable.","severity":"error","crossReferences":["expected_outcomes"]}]'::jsonb,
  cross_references = '["maturity_level","evaluation_criteria","scope","expected_outcomes"]'::jsonb,
  content_templates = '{"blueprint":"Typical: Solution architecture doc, Business case with ROI, Technology stack recommendation, Implementation roadmap, Risk assessment matrix.","poc":"Typical: Working prototype, Technical documentation, Demo video, Performance benchmarks, Architecture decision records.","pilot":"Typical: All POC deliverables + Production deployment guide, UAT results, Load test results, Security assessment, Operations runbook."}'::jsonb,
  web_search_queries = '[{"purpose":"Deliverable templates","queryTemplate":"{{domain}} {{maturityLevel}} deliverables template enterprise","when":"for_generation_only"}]'::jsonb,
  industry_frameworks = '["TOGAF ADM","SAFe","Design Thinking"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'deliverables';

-- maturity_level
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 3, tab_group = 'Scope & Complexity',
  quality_criteria = '[{"name":"DELIVERABLE ALIGNMENT","description":"Blueprint maturity + production-ready deliverables = mismatch.","severity":"warning","crossReferences":["deliverables"]},{"name":"COMPLEXITY COHERENCE","description":"Research-stage maturity with L1 complexity is suspicious.","severity":"warning","crossReferences":["complexity"]}]'::jsonb,
  cross_references = '["deliverables","complexity"]'::jsonb,
  master_data_constraints = '[{"fieldName":"maturityLevel","validValuesSource":"validMaturityLevels","enforceStrictly":true}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'maturity_level';

-- complexity
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 3, tab_group = 'Scope & Complexity',
  quality_criteria = '[{"name":"DIMENSION VERIFICATION","description":"Each dimension score must be supported by Scope and Deliverables content.","severity":"error","crossReferences":["scope","deliverables"]},{"name":"LEVEL COMPUTATION","description":"Overall level must match computed average of 5 dimensions.","severity":"error","crossReferences":[]},{"name":"MATURITY ALIGNMENT","description":"Blueprint + L5 is suspicious. Pilot + L1 is suspicious.","severity":"warning","crossReferences":["maturity_level"]}]'::jsonb,
  cross_references = '["scope","deliverables","maturity_level"]'::jsonb,
  master_data_constraints = '[{"fieldName":"complexityLevel","validValuesSource":"validComplexityLevels","enforceStrictly":true}]'::jsonb,
  web_search_queries = '[{"purpose":"Complexity benchmarks","queryTemplate":"{{domain}} solution complexity enterprise estimate effort","when":"if_available"}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'complexity';

-- solver_expertise
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 4, tab_group = 'Solvers & Schedule',
  quality_criteria = '[{"name":"DERIVATION CHECK","description":"Every skill traces to Deliverables, Scope, or Complexity.","severity":"error","crossReferences":["deliverables","scope","complexity"]},{"name":"REALISTIC BAR","description":"PhD for L2 challenge with $5K reward = unrealistic.","severity":"warning","crossReferences":["complexity","reward_structure"]},{"name":"NO OVER-SPECIFICATION","description":"Do not require specific tools unless scope mandates them.","severity":"warning","crossReferences":["scope"]}]'::jsonb,
  cross_references = '["deliverables","scope","complexity","reward_structure"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'solver_expertise';

-- eligibility
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 4, tab_group = 'Solvers & Schedule',
  quality_criteria = '[{"name":"GEOGRAPHIC ALIGNMENT","description":"GDPR data = geographic restrictions needed.","severity":"warning","crossReferences":["scope","legal_docs"]},{"name":"EXPERTISE CONFLICT","description":"Requiring certifications but allowing students = conflict.","severity":"warning","crossReferences":["solver_expertise"]}]'::jsonb,
  cross_references = '["scope","legal_docs","solver_expertise"]'::jsonb,
  master_data_constraints = '[{"fieldName":"eligibilityTypes","validValuesSource":"validEligibilityTypes","enforceStrictly":true}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'eligibility';

-- phase_schedule
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 4, tab_group = 'Solvers & Schedule',
  quality_criteria = '[{"name":"MATURITY-DURATION MATCH","description":"Total duration within range for maturity level.","severity":"error","crossReferences":["maturity_level"]},{"name":"DEVELOPMENT ADEQUACY","description":"Dev phase gives enough time for complexity level.","severity":"error","crossReferences":["complexity"]},{"name":"EVALUATION REALISM","description":"Evaluation time scales with criteria count.","severity":"warning","crossReferences":["evaluation_criteria"]}]'::jsonb,
  cross_references = '["maturity_level","complexity","evaluation_criteria"]'::jsonb,
  computation_rules = '["All dates MUST be future relative to today","End Date = Start Date + Duration (calendar days)","Phases MUST be sequential","Total duration must fall within range for maturity x complexity x solution type","Q&A must end >= 14 days before submission deadline","Phase 1 Start = today + 14 days minimum"]'::jsonb,
  web_search_queries = '[{"purpose":"Timeline benchmarks","queryTemplate":"open innovation challenge timeline {{domain}} {{maturityLevel}}","when":"if_available"}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'phase_schedule';

-- submission_guidelines
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 4, tab_group = 'Solvers & Schedule',
  quality_criteria = '[{"name":"DELIVERABLE COVERAGE","description":"Every deliverable has a submission instruction.","severity":"error","crossReferences":["deliverables"]},{"name":"DEADLINE ALIGNMENT","description":"Submission deadline matches Phase Schedule.","severity":"error","crossReferences":["phase_schedule"]}]'::jsonb,
  cross_references = '["deliverables","phase_schedule"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'submission_guidelines';

-- evaluation_criteria
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 5, tab_group = 'Evaluation & Rewards',
  quality_criteria = '[{"name":"OUTCOME COVERAGE","description":"Every Expected Outcome maps to >=1 criterion.","severity":"error","crossReferences":["expected_outcomes"]},{"name":"DELIVERABLE COVERAGE","description":"Every deliverable assessable via >=1 criterion.","severity":"error","crossReferences":["deliverables"]},{"name":"MEASURABILITY","description":"Each criterion describes HOW it will be scored.","severity":"warning","crossReferences":[]}]'::jsonb,
  cross_references = '["expected_outcomes","deliverables"]'::jsonb,
  computation_rules = '["Weights must total exactly 100%","Minimum 3 criteria","No single criterion >40% unless justified"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'evaluation_criteria';

-- reward_structure
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 5, tab_group = 'Evaluation & Rewards',
  quality_criteria = '[{"name":"RATE FLOOR CHECK","description":"total_reward / effort_midpoint >= rate floor.","severity":"error","crossReferences":["complexity"]},{"name":"BUDGET ALIGNMENT","description":"Reward <= seeker budget.","severity":"error","crossReferences":[]},{"name":"NON-MONETARY","description":"For L4+ suggest non-monetary incentives.","severity":"warning","crossReferences":[]}]'::jsonb,
  cross_references = '["complexity"]'::jsonb,
  computation_rules = '["minimum_reward = MAX(effort_midpoint x rateCard.effortRateFloor, rateCard.rewardFloorAmount)","Prize tiers must sum <= total pool","Each tier amount > 0","Effective rate must meet rate floor"]'::jsonb,
  web_search_queries = '[{"purpose":"Reward benchmarks","queryTemplate":"open innovation challenge prize pool {{domain}} {{maturityLevel}}","when":"if_available"}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'reward_structure';

-- ip_model
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 5, tab_group = 'Evaluation & Rewards',
  quality_criteria = '[{"name":"LEGAL CONSISTENCY","description":"IP model matches Legal Documents.","severity":"error","crossReferences":["legal_docs"]},{"name":"SOLVER ATTRACTIVENESS","description":"Full IP transfer + small reward may deter solvers.","severity":"warning","crossReferences":["reward_structure"]}]'::jsonb,
  cross_references = '["legal_docs","reward_structure"]'::jsonb,
  master_data_constraints = '[{"fieldName":"ipModel","validValuesSource":"validIPModels","enforceStrictly":true}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'ip_model';

-- escrow_funding
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 5, tab_group = 'Evaluation & Rewards',
  quality_criteria = '[{"name":"AMOUNT MATCH","description":"Escrow = total prize pool in Reward Structure.","severity":"error","crossReferences":["reward_structure"]}]'::jsonb,
  cross_references = '["reward_structure"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'escrow_funding';

-- legal_docs
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 5, tab_group = 'Evaluation & Rewards',
  quality_criteria = '[{"name":"IP CONSISTENCY","description":"Legal terms match IP Model.","severity":"error","crossReferences":["ip_model"]}]'::jsonb,
  cross_references = '["ip_model"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'legal_docs';

-- hook
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 6, tab_group = 'Publish & Discover',
  quality_criteria = '[{"name":"ACCURACY","description":"Every claim supported by challenge content.","severity":"error","crossReferences":["problem_statement","scope","reward_structure"]},{"name":"SPECIFICITY","description":"Conveys domain, prize, and key constraint.","severity":"warning","crossReferences":["phase_schedule","deliverables"]}]'::jsonb,
  cross_references = '["problem_statement","scope","reward_structure","phase_schedule","deliverables"]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'hook';

-- visibility
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 6, tab_group = 'Publish & Discover',
  quality_criteria = '[{"name":"DATA SENSITIVITY","description":"Proprietary data + public visibility = error.","severity":"error","crossReferences":["scope","legal_docs"]}]'::jsonb,
  cross_references = '["scope","legal_docs"]'::jsonb,
  master_data_constraints = '[{"fieldName":"visibility","validValuesSource":"validVisibilityOptions","enforceStrictly":true}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'visibility';

-- domain_tags
UPDATE ai_review_section_config SET
  platform_preamble = preamble, wave_number = 6, tab_group = 'Publish & Discover',
  quality_criteria = '[{"name":"RELEVANCE","description":"Tags reflect technologies and domains actually mentioned.","severity":"error","crossReferences":["problem_statement","scope","deliverables"]},{"name":"QUANTITY","description":"3-7 tags. <2 = poor discoverability. >10 = dilution.","severity":"warning","crossReferences":[]}]'::jsonb,
  cross_references = '["problem_statement","scope","deliverables"]'::jsonb,
  master_data_constraints = '[{"fieldName":"domainTags","validValuesSource":"validDomainTags","enforceStrictly":true}]'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE role_context = 'curation' AND section_key = 'domain_tags';

-- Seed 12 phase templates
INSERT INTO phase_templates (solution_type, maturity_level, phases, total_range_min_weeks, total_range_max_weeks) VALUES
('strategy_design','blueprint','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A / Office Hours","minDays":7,"maxDays":10},{"name":"Development & Submission","minDays":21,"maxDays":35},{"name":"Peer Review & Evaluation","minDays":7,"maxDays":14},{"name":"Winner Announcement","minDays":3,"maxDays":5}]'::jsonb,5,8),
('strategy_design','poc','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A / Office Hours","minDays":7,"maxDays":14},{"name":"Development & Submission","minDays":35,"maxDays":56},{"name":"Technical Evaluation","minDays":10,"maxDays":14},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,8,12),
('strategy_design','pilot','[{"name":"Launch & Briefing","minDays":14,"maxDays":21},{"name":"Q&A / Office Hours","minDays":10,"maxDays":14},{"name":"Development & Deployment","minDays":56,"maxDays":84},{"name":"UAT & Evaluation","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,12,18),
('technology_architecture','blueprint','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A + Technical Clarification","minDays":7,"maxDays":10},{"name":"Development & Submission","minDays":28,"maxDays":42},{"name":"Technical Review","minDays":7,"maxDays":14},{"name":"Winner Announcement","minDays":3,"maxDays":5}]'::jsonb,6,10),
('technology_architecture','poc','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A + Technical Clarification","minDays":10,"maxDays":14},{"name":"Environment Setup","minDays":7,"maxDays":14},{"name":"Development & Submission","minDays":42,"maxDays":70},{"name":"Technical Evaluation + Demo","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,10,16),
('technology_architecture','pilot','[{"name":"Launch & Briefing","minDays":14,"maxDays":21},{"name":"Q&A + Technical Clarification","minDays":10,"maxDays":14},{"name":"Environment Setup","minDays":7,"maxDays":14},{"name":"Development & Deployment","minDays":56,"maxDays":98},{"name":"UAT + Performance Testing","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,14,22),
('process_operations','blueprint','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A / Office Hours","minDays":7,"maxDays":10},{"name":"Development & Submission","minDays":21,"maxDays":35},{"name":"Review & Evaluation","minDays":7,"maxDays":14},{"name":"Winner Announcement","minDays":3,"maxDays":5}]'::jsonb,5,8),
('process_operations','poc','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A / Office Hours","minDays":7,"maxDays":14},{"name":"Process Modeling & Submission","minDays":35,"maxDays":56},{"name":"Evaluation & Demo","minDays":10,"maxDays":14},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,8,12),
('process_operations','pilot','[{"name":"Launch & Briefing","minDays":14,"maxDays":21},{"name":"Q&A / Office Hours","minDays":10,"maxDays":14},{"name":"Implementation & Rollout","minDays":56,"maxDays":84},{"name":"Process Assessment","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,12,18),
('product_innovation','blueprint','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A / Office Hours","minDays":7,"maxDays":10},{"name":"Ideation & Submission","minDays":21,"maxDays":42},{"name":"Review & Evaluation","minDays":7,"maxDays":14},{"name":"Winner Announcement","minDays":3,"maxDays":5}]'::jsonb,5,9),
('product_innovation','poc','[{"name":"Launch & Briefing","minDays":10,"maxDays":14},{"name":"Q&A + Design Review","minDays":10,"maxDays":14},{"name":"Prototyping & Submission","minDays":42,"maxDays":70},{"name":"User Testing & Evaluation","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,10,14),
('product_innovation','pilot','[{"name":"Launch & Briefing","minDays":14,"maxDays":21},{"name":"Q&A + Design Review","minDays":10,"maxDays":14},{"name":"Build & Deploy","minDays":56,"maxDays":98},{"name":"User Acceptance & Evaluation","minDays":14,"maxDays":21},{"name":"Winner Announcement","minDays":5,"maxDays":7}]'::jsonb,14,20)
ON CONFLICT DO NOTHING;

END $$;