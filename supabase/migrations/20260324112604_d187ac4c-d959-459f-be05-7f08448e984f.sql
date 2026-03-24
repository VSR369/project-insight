
-- ═══════════════════════════════════════════════════════════
-- AI Review Section Config + Global Config tables
-- ═══════════════════════════════════════════════════════════

-- Table A: ai_review_section_config
CREATE TABLE IF NOT EXISTS public.ai_review_section_config (
  role_context TEXT NOT NULL CHECK (role_context IN ('intake','spec','curation','legal','finance','evaluation')),
  section_key TEXT NOT NULL,
  section_label TEXT NOT NULL,
  importance_level TEXT NOT NULL DEFAULT 'Medium' CHECK (importance_level IN ('Critical','High','Medium','Low')),
  section_description TEXT,
  review_instructions TEXT,
  dos TEXT,
  donts TEXT,
  tone TEXT NOT NULL DEFAULT 'Balanced' CHECK (tone IN ('Formal','Balanced','Encouraging')),
  min_words INT NOT NULL DEFAULT 0,
  max_words INT NOT NULL DEFAULT 1000,
  required_elements TEXT[] NOT NULL DEFAULT '{}',
  example_good VARCHAR(500),
  example_poor VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (role_context, section_key)
);

-- Table B: ai_review_global_config (singleton)
CREATE TABLE IF NOT EXISTS public.ai_review_global_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  batch_split_threshold INT NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert singleton row
INSERT INTO public.ai_review_global_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.ai_review_section_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_review_global_config ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated users
CREATE POLICY "authenticated_read_section_config" ON public.ai_review_section_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_global_config" ON public.ai_review_global_config
  FOR SELECT TO authenticated USING (true);

-- Manage for platform_admin (supervisor restriction enforced at UI via PermissionGuard)
CREATE POLICY "platform_admin_manage_section_config" ON public.ai_review_section_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

CREATE POLICY "platform_admin_manage_global_config" ON public.ai_review_global_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

-- Service role bypass for edge functions
CREATE POLICY "service_role_section_config" ON public.ai_review_section_config
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_role_global_config" ON public.ai_review_global_config
  FOR SELECT TO service_role USING (true);

-- ═══════════════════════════════════════════════════════════
-- Seed Data: 36 rows
-- ═══════════════════════════════════════════════════════════

-- INTAKE sections (4)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements, example_good, example_poor) VALUES
('intake', 'problem_statement', 'Problem Statement', 'Critical',
 'The core business problem the seeker wants solved.',
 'Check for: specific pain point, affected stakeholder, measurable impact, what has been tried. Flag vague descriptions.',
 'Look for concrete metrics. Acknowledge strengths before issues.',
 'Do not suggest solutions. Do not rewrite unless asked.',
 'Balanced', 80, 300,
 ARRAY['specific pain point','affected stakeholder','measurable impact','prior attempts'],
 'Our supply chain loses $2.3M annually due to manual inventory reconciliation across 12 warehouses. Barcode scanning accuracy remains below 91%.',
 'We need to improve our processes and be more efficient.'),
('intake', 'scope', 'Solution Expectations', 'High',
 'What the seeker expects as outcomes or deliverables.',
 'Check for: clear expected outcomes, bounded scope, realistic expectations. Flag open-ended expectations.',
 'Verify expectations are achievable. Note overly broad scope.',
 'Do not assess technical feasibility. Do not add deliverables.',
 'Balanced', 50, 250, ARRAY['expected outcomes','scope boundaries'],
 'Working prototype integrating with SAP, reducing reconciliation time by 50% within 6 months.',
 'We want a solution that fixes everything.'),
('intake', 'beneficiaries_mapping', 'Stakeholder Mapping', 'Medium',
 'Affected parties and expected benefits per stakeholder group.',
 'Check for: identified groups, benefits per group, adoption challenges.',
 'Note missing stakeholder groups.',
 'Do not invent stakeholders.',
 'Encouraging', 40, 200, ARRAY['stakeholder groups','expected benefits'],
 'Primary: warehouse managers. Secondary: finance team. Impacted: floor staff.',
 'Everyone will benefit.'),
('intake', 'budget_reasonableness', 'Budget Reasonableness', 'High',
 'Whether the budget range is realistic for the problem scope.',
 'Check: budget range specified, alignment with complexity, supports deliverables. Flag mismatches.',
 'Compare budget to scope complexity.',
 'Do not suggest specific amounts.',
 'Formal', 30, 150, ARRAY['budget range','scope alignment'],
 'Budget: $50K-$80K for 3-month prototype with SAP integration.',
 'Budget: TBD.');

-- SPEC sections (9)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements) VALUES
('spec', 'problem_statement', 'Problem Statement', 'Critical',
 'Clarity and solver-readiness of the problem definition.',
 'Would a solver understand? Check specificity, context, constraints. Flag unexplained jargon.',
 'Assess from solver perspective. Note ambiguities.', 'Do not rewrite. Do not suggest solutions.',
 'Balanced', 80, 400, ARRAY['problem clarity','solver context','constraints']),
('spec', 'expected_outcomes', 'Expected Outcomes', 'Critical',
 'Clear, measurable outcomes solvers should deliver.',
 'Check measurability, clarity, alignment with problem. Flag vague outcomes.',
 'Verify outcomes are testable.', 'Do not add outcomes.',
 'Formal', 50, 300, ARRAY['measurable outcomes','success criteria']),
('spec', 'scope', 'Scope', 'High',
 'Bounded in-scope vs out-of-scope clarity.',
 'Check explicit in-scope, exclusions, boundary clarity. Flag ambiguity.',
 'Note gaps between scope and deliverables.', 'Do not expand scope.',
 'Balanced', 50, 300, ARRAY['in-scope items','exclusions']),
('spec', 'beneficiaries_mapping', 'Stakeholder Mapping', 'Medium',
 'Stakeholders and beneficiaries for solver context.',
 'Check solvers understand who benefits and evaluates.',
 'Note missing groups.', 'Do not assess org dynamics.',
 'Encouraging', 40, 200, ARRAY['stakeholder groups','evaluation stakeholders']),
('spec', 'description', 'Description', 'High',
 'Detailed context and constraints for solvers.',
 'Check technical context, domain explanation, constraint clarity.',
 'Verify a domain-expert solver could start.', 'Do not add details.',
 'Balanced', 100, 500, ARRAY['technical context','domain explanation','constraints']),
('spec', 'deliverables', 'Deliverables', 'Critical',
 'Measurable, concrete deliverables with acceptance criteria.',
 'Check specific items, acceptance criteria, format requirements. Flag vague deliverables.',
 'Cross-reference with evaluation criteria.', 'Do not add deliverables.',
 'Formal', 50, 400, ARRAY['deliverable items','acceptance criteria','format requirements']),
('spec', 'evaluation_criteria', 'Evaluation Criteria', 'Critical',
 'Clear criteria with proper weights aligned with deliverables.',
 'Check weights sum to 100%, alignment with deliverables, scoring clarity.',
 'Verify weight totals.', 'Do not change weights.',
 'Formal', 50, 400, ARRAY['weights','scoring method','deliverable alignment']),
('spec', 'hook', 'Challenge Hook', 'Medium',
 'Engaging, concise text for potential solvers.',
 'Check clarity, engagement, accurate representation. Flag misleading hooks.',
 'Assess solver audience appeal.', 'Do not rewrite the hook.',
 'Encouraging', 20, 150, ARRAY['engagement','accuracy']),
('spec', 'ip_model', 'IP Model', 'High',
 'Clear IP ownership, licensing, and transfer terms.',
 'Check ownership clarity, licensing terms, transfer conditions.',
 'Verify IP model matches challenge type.', 'Do not suggest IP models.',
 'Formal', 30, 200, ARRAY['ownership clarity','licensing terms']);

-- CURATION sections (14)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements) VALUES
('curation', 'problem_statement', 'Problem Statement', 'Critical',
 'Publication-quality problem statement.',
 'Assess clarity, specificity, context, prior attempts. Must be publication-ready.',
 'Check solver comprehension.', 'Do not rewrite.',
 'Balanced', 80, 400, ARRAY['specificity','context','prior attempts']),
('curation', 'scope', 'Scope', 'High',
 'Bounded in-scope vs out-of-scope clarity.',
 'Check boundaries, exclusions, deliverable alignment.',
 'Cross-reference with deliverables.', 'Do not expand scope.',
 'Balanced', 50, 300, ARRAY['boundaries','exclusions']),
('curation', 'deliverables', 'Deliverables', 'Critical',
 'Measurable, concrete, complete list with acceptance criteria.',
 'Check completeness, measurability, acceptance criteria.',
 'Verify evaluation criteria alignment.', 'Do not add deliverables.',
 'Formal', 50, 400, ARRAY['completeness','acceptance criteria']),
('curation', 'evaluation_criteria', 'Evaluation Criteria', 'Critical',
 'Clear criteria with weights summing to 100%.',
 'Verify weight sum, deliverable alignment, scoring clarity.',
 'Calculate weight totals explicitly.', 'Do not modify weights.',
 'Formal', 50, 400, ARRAY['weight totals','deliverable alignment','scoring clarity']),
('curation', 'reward_structure', 'Reward Structure', 'High',
 'Fair rewards matching challenge complexity.',
 'Check fairness, structure, complexity alignment.',
 'Compare reward to scope.', 'Do not suggest amounts.',
 'Balanced', 30, 300, ARRAY['fairness','complexity alignment']),
('curation', 'phase_schedule', 'Phase Schedule', 'High',
 'Realistic timelines for scope and complexity.',
 'Check timeline realism, dependencies, complexity buffer.',
 'Flag compressed timelines.', 'Do not suggest dates.',
 'Balanced', 30, 300, ARRAY['timeline realism','phase dependencies']),
('curation', 'submission_guidelines', 'Submission Guidelines', 'Medium',
 'Clear format, content, and process requirements.',
 'Check format clarity, content requirements, process.',
 'Verify solver-actionability.', 'Do not add requirements.',
 'Encouraging', 30, 250, ARRAY['format requirements','content requirements']),
('curation', 'eligibility', 'Eligibility', 'Medium',
 'Specific qualifications, not overly broad or restrictive.',
 'Check specificity, fairness, challenge alignment.',
 'Flag overly restrictive criteria.', 'Do not modify requirements.',
 'Balanced', 30, 200, ARRAY['qualification specificity','fairness']),
('curation', 'complexity', 'Complexity Assessment', 'Medium',
 'Properly assessed with justified parameters.',
 'Check parameter justification, content alignment.',
 'Verify complexity matches difficulty.', 'Do not change parameters.',
 'Formal', 20, 200, ARRAY['parameter justification','content alignment']),
('curation', 'ip_model', 'IP Model', 'High',
 'Clear IP ownership, licensing, transfer terms.',
 'Check ownership, licensing completeness, transfer conditions.',
 'Verify cross-section consistency.', 'Do not suggest changes.',
 'Formal', 30, 200, ARRAY['ownership clarity','licensing terms','transfer conditions']),
('curation', 'legal_docs', 'Legal Documents', 'High',
 'Required legal documents attached and reviewed.',
 'Check completeness, review status, tier appropriateness.',
 'Flag missing documents.', 'Do not assess legal content.',
 'Formal', 10, 150, ARRAY['document completeness','review status']),
('curation', 'escrow_funding', 'Escrow Funding', 'High',
 'Escrow funded if required.',
 'Check funding status, amount adequacy, currency consistency.',
 'Flag unfunded escrow.', 'Do not assess financial viability.',
 'Formal', 10, 100, ARRAY['funding status','amount adequacy']),
('curation', 'maturity_level', 'Maturity Level', 'Medium',
 'Set and consistent with challenge depth.',
 'Check maturity matches complexity and content depth.',
 'Verify deliverable/scope consistency.', 'Do not change maturity.',
 'Balanced', 10, 100, ARRAY['maturity set','content consistency']),
('curation', 'visibility_eligibility', 'Visibility & Eligibility', 'Medium',
 'Visibility and eligibility properly configured.',
 'Check visibility/eligibility consistency.',
 'Flag mismatches.', 'Do not modify settings.',
 'Balanced', 10, 100, ARRAY['visibility settings','eligibility config']);

-- LEGAL sections (3)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements, example_good, example_poor) VALUES
('legal', 'nda_adequacy', 'NDA Adequacy', 'Critical',
 'NDA presence, IP model alignment, and LC review status.',
 'Check NDA attached if IP requires it, tier match, LC review status. Flag missing NDAs.',
 'Cross-reference IP model with NDA presence.', 'Do not assess legal language.',
 'Formal', 20, 200, ARRAY['NDA presence','IP model alignment','LC review status'],
 'NDA attached (Standard tier), LC approved. Covers submission data and IP transfer per Full Transfer model.',
 'No NDA despite Full Transfer IP model.'),
('legal', 'ip_clause_completeness', 'IP Clause Completeness', 'Critical',
 'IP clauses covering all deliverables and edge cases.',
 'Check IP clauses per deliverable, licensing specificity, transfer conditions. Flag coverage gaps.',
 'Map each deliverable to its IP clause.', 'Do not draft clauses.',
 'Formal', 30, 300, ARRAY['deliverable IP coverage','licensing specificity','transfer conditions'],
 'Clauses cover all 4 deliverables: prototype (full transfer), docs (perpetual license), training (shared), source (full transfer with escrow).',
 'Full Transfer model but no per-deliverable clauses.'),
('legal', 'compliance_terms', 'Compliance Terms', 'High',
 'Platform terms, export controls, jurisdiction compliance.',
 'Check OFAC alignment, data residency, platform terms acceptance. Flag gaps.',
 'Check eligibility against restricted jurisdictions.', 'Do not provide legal advice.',
 'Formal', 20, 200, ARRAY['OFAC compliance','data residency','platform terms'], NULL, NULL);

-- FINANCE sections (3)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements, example_good, example_poor) VALUES
('finance', 'escrow_configuration', 'Escrow Configuration', 'Critical',
 'Escrow setup: funded, correct amount, currency match, rejection fee.',
 'Check escrow exists, deposit matches reward, currency matches, rejection fee set. Flag issues.',
 'Compare deposit to reward total.', 'Do not assess financial risk.',
 'Formal', 20, 200, ARRAY['escrow existence','deposit adequacy','currency match','rejection fee'],
 'Escrow funded: $75K USD matching reward. Rejection fee: 15%. Status: FUNDED.',
 'No escrow for $50K reward challenge.'),
('finance', 'reward_structure_viability', 'Reward Structure Viability', 'High',
 'Financial soundness: escrow alignment, distribution, milestones.',
 'Check reward total matches escrow, distribution is reasonable, milestone triggers defined.',
 'Cross-reference reward with escrow deposit.', 'Do not suggest amounts.',
 'Balanced', 20, 250, ARRAY['escrow alignment','distribution reasonableness','milestone triggers'], NULL, NULL),
('finance', 'payment_terms', 'Payment Terms', 'High',
 'Payment schedule, currency, and disbursement conditions.',
 'Check payment milestones in phase schedule, disbursement conditions, currency consistency.',
 'Verify milestones align with phases.', 'Do not suggest schedules.',
 'Formal', 20, 200, ARRAY['payment milestones','disbursement conditions','currency consistency'], NULL, NULL);

-- EVALUATION sections (3)
INSERT INTO public.ai_review_section_config (role_context, section_key, section_label, importance_level, section_description, review_instructions, dos, donts, tone, min_words, max_words, required_elements, example_good, example_poor) VALUES
('evaluation', 'scoring_rubric', 'Scoring Rubric', 'Critical',
 'Evaluation rubric with scoring bands, weights, and pass thresholds.',
 'Check rubric matches evaluation_criteria, weights sum to 100%, bands defined, threshold explicit.',
 'Calculate weight totals. Verify band coverage.', 'Do not modify bands.',
 'Formal', 30, 300, ARRAY['criteria alignment','weight totals','scoring bands','pass threshold'],
 'Rubric: 5 criteria, weights 100% (Innovation 25%, Feasibility 25%, Impact 20%, Completeness 20%, Presentation 10%). Pass: 60/100.',
 'Criteria listed but no rubric or threshold.'),
('evaluation', 'evaluation_methodology', 'Evaluation Methodology', 'High',
 'Evaluation process: stages, assignments, consensus mechanism.',
 'Check stages defined, reviewer requirements specified, consensus method stated.',
 'Verify fair and consistent methodology.', 'Do not prescribe methods.',
 'Balanced', 20, 250, ARRAY['evaluation stages','reviewer requirements','consensus mechanism'], NULL, NULL),
('evaluation', 'conflict_of_interest', 'Conflict of Interest', 'High',
 'CoI declarations and mitigation procedures for evaluators.',
 'Check CoI requirement exists, mitigation actions defined, records present.',
 'Check for declared conflicts.', 'Do not name individuals.',
 'Formal', 15, 200, ARRAY['CoI declaration requirement','mitigation procedures','CoI records'], NULL, NULL);
