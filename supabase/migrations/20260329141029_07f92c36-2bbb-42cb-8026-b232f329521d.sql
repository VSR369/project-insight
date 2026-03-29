
-- Fix 1: Bump success_metrics_kpis version to 2
UPDATE ai_review_section_config
SET version = 2, updated_at = now()
WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation';

-- Fix 2: Maturity Level — Remove all TRL terminology
UPDATE ai_review_section_config
SET review_instructions = 'The maturity level sets solver expectations for the depth of solution required. Check: (1) maturity level is explicitly set on the challenge record, (2) the level is consistent with the deliverables — if deliverables require a working prototype, maturity should not be set to "concept only", (3) the level is consistent with the evaluation criteria — scoring a working prototype as if it were a concept is a mismatch, (4) POC and Pilot maturity levels require evidence of technical context being provided in the description section. Flag mismatches between maturity level and deliverable depth.

MATURITY LEVEL DEFINITIONS (use these exact terms):
- Blueprint: Strategic analysis, framework design, feasibility study. No working code required.
- POC / Proof of Concept: Working prototype demonstrating technical feasibility. Limited scope, controlled environment.
- Pilot: Production-ready system tested in real-world conditions. Full operational documentation required.

When reviewing maturity level selection, verify the deliverables match the selected level. A Blueprint should never require working code. A Pilot should never accept a strategy document as the primary deliverable.',
    supervisor_examples = '[{"scenario":"Maturity level: POC. Consistent with deliverables (working prototype tested on staging). Evaluation criteria score prototype performance — aligned. Timeline (10 weeks) sufficient for POC at L3 complexity.","verdict":"pass"},{"scenario":"Maturity says Blueprint but deliverables list a working prototype and evaluation criteria score technical performance.","verdict":"fail — maturity/deliverable mismatch"}]'::jsonb,
    version = 2,
    updated_at = now()
WHERE section_key = 'maturity_level' AND role_context = 'curation';

-- Fix 3a: affected_stakeholders — differentiated search query
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose":"Stakeholder analysis","queryTemplate":"{{domain}} stakeholder analysis change management enterprise","when":"for_generation_only"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'affected_stakeholders' AND role_context = 'curation';

-- Fix 3b: current_deficiencies — differentiated search query
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose":"Technology gap analysis","queryTemplate":"{{domain}} current system limitations technology gaps","when":"for_generation_only"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'current_deficiencies' AND role_context = 'curation';

-- Fix 3c: preferred_approach — differentiated search query
UPDATE ai_review_section_config
SET web_search_queries = '[{"purpose":"Solution approaches","queryTemplate":"{{domain}} solution approaches best practices emerging","when":"for_generation_only"}]'::jsonb,
    updated_at = now()
WHERE section_key = 'preferred_approach' AND role_context = 'curation';

-- Fix 3d: approaches_not_of_interest — remove search query (human-only section)
UPDATE ai_review_section_config
SET web_search_queries = '[]'::jsonb,
    updated_at = now()
WHERE section_key = 'approaches_not_of_interest' AND role_context = 'curation';

-- Fix 4: evaluation_criteria — align supervisor instructions with validation layer
UPDATE ai_review_section_config
SET review_instructions = 'This is the most governance-sensitive section at curation stage. A disputed evaluation is a legal and reputational risk. Check: (1) Flag weight errors explicitly — state the computed sum. The system validation layer will suggest normalization, but the curator must approve. (2) each criterion has a scoring method that produces a numeric score, not a subjective assessment, (3) every deliverable maps to at least one criterion, (4) evaluator roles are specified per criterion — no anonymous "we will score", (5) the criteria are free of conflicts of interest — no criterion that can only be assessed by the seeker with undisclosed internal data. If weights do not sum to 100%, flag the error with the computed sum.',
    version = 2,
    updated_at = now()
WHERE section_key = 'evaluation_criteria' AND role_context = 'curation';
