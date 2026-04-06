/**
 * promptConstants.ts — Shared constants, format maps, and quality exemplars
 * extracted from promptTemplate.ts.
 */

export interface SectionConfig {
  role_context: string;
  section_key: string;
  section_label: string;
  importance_level: string;
  section_description: string | null;
  review_instructions: string | null;
  dos: string | null;
  donts: string | null;
  tone: string;
  min_words: number;
  max_words: number;
  required_elements: string[];
  example_good: string | null;
  example_poor: string | null;
  platform_preamble?: string | null;
  quality_criteria?: any[] | null;
  master_data_constraints?: any[] | null;
  computation_rules?: string[] | null;
  content_templates?: Record<string, string> | null;
  web_search_queries?: any[] | null;
  industry_frameworks?: string[] | null;
  analyst_sources?: string[] | null;
  supervisor_examples?: any[] | null;
  cross_references?: string[] | null;
  wave_number?: number | null;
  tab_group?: string | null;
}

export const ROLE_CONTEXT_LABELS: Record<string, string> = {
  intake: 'intake brief submitted by an Account Manager or Challenge Requestor',
  spec: 'AI-generated challenge specification from the Creator/Architect perspective',
  curation: 'challenge specification for publication readiness',
  legal: 'challenge legal documentation and compliance',
  finance: 'challenge financial configuration and escrow setup',
  evaluation: 'challenge evaluation methodology and scoring rubric',
};

export const FORMAT_INSTRUCTIONS: Record<string, string> = {
  rich_text: 'Output: formatted markdown with headings and bullet lists. No tables. No JSON.',
  line_items: 'Output: a JSON array of strings. Each string is one discrete item. Max 20 items. No prose.',
  table: 'Output: a JSON array of row objects. Use exact column keys from the section definition.',
  schedule_table: 'Output: a JSON array of phase objects with keys: phase_name (string), duration_days (number), start_date (ISO date YYYY-MM-DD or null), end_date (ISO date YYYY-MM-DD or null). Propose realistic dates based on challenge scope and complexity.',
  checkbox_multi: 'Output: a JSON array of selected option codes from the allowed values list ONLY. Do NOT invent new codes.',
  checkbox_single: 'Output: a JSON object: { "selected_id": "...", "rationale": "one sentence" }. The selected_id MUST be from the allowed values list.',
  structured_fields: 'Output: { "status": "complete"|"incomplete", "missing_fields": [...], "comments": "..." }.',
  select: 'Output: a single string value from the allowed options.',
  radio: 'Output: a single string value from the allowed options.',
  tag_input: 'Output: a JSON array of tag strings.',
  custom: 'Output: structured JSON appropriate to the section context.',
  complexity_assessment: 'Output: Use the assess_complexity tool to return per-parameter ratings with justifications. Do NOT use the review_sections tool for this section.',
};

export const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text',
  scope: 'rich_text',
  deliverables: 'line_items',
  expected_outcomes: 'line_items',
  submission_guidelines: 'line_items',
  evaluation_criteria: 'table',
  reward_structure: 'custom',
  phase_schedule: 'schedule_table',
  complexity: 'complexity_assessment',
  ip_model: 'checkbox_single',
  maturity_level: 'checkbox_single',
  eligibility: 'checkbox_multi',
  visibility: 'checkbox_multi',
  hook: 'rich_text',
  domain_tags: 'tag_input',
  legal_docs: 'table',
  escrow_funding: 'structured_fields',
  solver_expertise: 'custom',
  context_and_background: 'rich_text',
  root_causes: 'line_items',
  affected_stakeholders: 'table',
  current_deficiencies: 'line_items',
  preferred_approach: 'line_items',
  approaches_not_of_interest: 'line_items',
  success_metrics_kpis: 'table',
  data_resources_provided: 'table',
  solution_type: 'checkbox_multi',
};

export const EXTENDED_BRIEF_FORMAT_INSTRUCTIONS: Record<string, string> = {
  root_causes: 'Output: JSON array of short phrase strings only. No sentences. No explanations. Each item is a cause label, not a description. Max 8 items.',
  affected_stakeholders: 'Output: JSON array of row objects with keys stakeholder_name, role, impact_description (max 100 chars), adoption_challenge (max 100 chars). Always populate adoption_challenge — this is the most valuable field.',
  current_deficiencies: 'Output: JSON array of current-state observation phrases. Max 10 items. Each item must be a factual observation about current state, not a wish or solution hint.',
  preferred_approach: 'Review existing content for clarity, completeness, and consistency with challenge scope. Output: JSON array of refined preferred approach phrases. Preserve the seeker\'s original intent. If section is empty, set status to "warning" with a comment requesting human input.',
  approaches_not_of_interest: 'Review existing content for clarity, completeness, and consistency with challenge scope. Output: JSON array of refined exclusion phrases. Preserve the seeker\'s original intent. If section is empty, set status to "warning" with a comment requesting human input.',
  reward_structure: 'REWARD STRUCTURE RULES:\n'
    + '1. If the challenge reward_structure already has budget_min/budget_max from AM/CA, tier amounts MUST fit within that budget. Total of all tiers ≤ budget_max.\n'
    + '2. If no budget exists, estimate based on complexity and maturity: Blueprint $5K-$25K, POC $25K-$100K, Pilot $100K-$500K. Scale with complexity level.\n'
    + '3. ALWAYS output type "both" — include monetary tiers AND non-monetary items.\n'
    + '4. Monetary: 1-3 tiers. Simple = platinum only. Complex = platinum + gold + silver.\n'
    + '5. Non-monetary: 3-5 items relevant to solver profile (e.g. "Featured on platform", "Direct engagement with seeker CTO", "Publication co-authorship").\n'
    + '6. OUTPUT FORMAT: { "type": "both", "monetary": { "tiers": { "platinum": 75000, "gold": 25000, "silver": 10000 }, "currency": "USD" }, "nonMonetary": { "items": ["item1", "item2", "item3"] } }.\n'
    + 'CRITICAL: tiers must be an OBJECT (NOT array). Valid keys: platinum, gold, silver. Amounts as plain numbers.',
  success_metrics_kpis: 'Output: JSON array of objects with keys: kpi (string), baseline (string), target (string), measurement_method (string), timeframe (string). Example: [{"kpi":"Model Accuracy","baseline":"N/A","target":"F1 > 0.85","measurement_method":"Cross-validation on test set","timeframe":"8 weeks"}]',
  data_resources_provided: 'Output: JSON array of objects with keys: resource (string — name of dataset/API/document), type (string — Dataset/API/Document/Tool), format (string — CSV/JSON/PDF/REST API), size (string — estimated size), access_method (string — how solver gets access), restrictions (string — any usage limitations). Example: [{"resource":"Historical sales data","type":"Dataset","format":"CSV","size":"2.3 GB","access_method":"Secure FTP after NDA","restrictions":"No redistribution"}]',
  evaluation_criteria: 'Output: JSON array of objects with keys: criterion_name (string), weight_percentage (number 0-100, all must sum to 100), description (string), scoring_method (string), evaluator_role (string). Example: [{"criterion_name":"Technical Feasibility","weight_percentage":30,"description":"Solution demonstrates technical viability","scoring_method":"Expert panel review","evaluator_role":"CTO"}]',
  solver_expertise: 'Output: JSON object: { "expertise_areas": [{ "area": "string", "sub_areas": ["string"], "level": "required"|"preferred"|"nice_to_have" }], "certifications": ["string"], "experience_years": number, "domain_knowledge": ["string"] }',
  problem_statement: 'Output: Rich HTML with clear structure. MUST include: (1) Business context — what the organization does and its operating environment, (2) The specific problem — measurable gap or challenge with quantified impact, (3) Impact — what happens if unsolved (cost, risk, opportunity loss), (4) Constraints — boundaries solvers must respect (technical, regulatory, timeline). Length: 200-400 words. Avoid jargon without definition. A solver from outside this industry should understand the problem after reading this section alone.',
  scope: 'Output: Rich HTML with two clear sections: (1) IN SCOPE — specific items, deliverables, and boundaries solvers should address. Each must be testable and unambiguous. (2) OUT OF SCOPE — explicit exclusions to prevent scope creep. Avoid vague boundaries like "as needed" or "where appropriate". Each scope item should be directly traceable to the problem statement.',
  hook: 'Output: A compelling 2-3 sentence hook (50-100 words) that: (1) Grabs solver attention with a provocative question or bold statement, (2) Hints at the opportunity/impact with a specific number or outcome, (3) Motivates action with urgency or uniqueness. Think "TED talk opening" — not "corporate memo". Reference the reward structure or unique solver benefit if available.',
  deliverables: 'Output: JSON array of objects: [{ "name": "Deliverable name", "description": "What it includes and how it will be used", "acceptance_criteria": "Specific testable criteria for completion", "format": "PDF/Code/Dataset/API/Presentation" }]. Each deliverable must be independently assessable by an evaluator. MUST align with maturity level: Blueprint = documents/frameworks/recommendations. POC = working code/prototype with demo. Pilot = production-ready system with documentation.',
  expected_outcomes: 'Output: JSON array of SMART outcome strings. Each MUST specify: what changes, by how much, measured how, by when. Bad: "Improved efficiency". Good: "Reduce processing time from 48hrs to <4hrs for 95% of transactions, measured via system logs within 6 months of implementation". Include both primary outcomes (directly from deliverables) and secondary outcomes (downstream business impact).',
  submission_guidelines: 'Output: JSON array of guideline objects with name and description. MUST include: (1) Submission format — exact file types, naming conventions (PDF, code repo, video demo), (2) Required sections/structure — what the submission document must contain, (3) Page/size limits — maximum pages or file sizes, (4) Evaluation-ready requirements — demo instructions, test data inclusion, environment setup. Align with evaluation_criteria — every criterion must be assessable from the submission format.',
  phase_schedule: 'Output: JSON array of phase objects with keys: phase_name, duration_days, start_date (ISO YYYY-MM-DD), end_date (ISO YYYY-MM-DD). Standard phases: Registration → Submission → Evaluation → Winner Announcement. Duration MUST align with challenge complexity and maturity: Blueprint = 4-8 weeks total, POC = 8-16 weeks, Pilot = 16-32 weeks. All dates MUST be in the future relative to today\'s date. Include buffer between phases for administrative processing.',
  maturity_level: 'Output: { "selected_id": "BLUEPRINT"|"POC"|"PROTOTYPE"|"PILOT"|"PRODUCTION", "rationale": "2-3 sentences explaining why this level fits" }. Decision guide: BLUEPRINT = strategic recommendations, frameworks, analysis documents (no working code). POC = working prototype demonstrating technical feasibility (functional but not production-ready). PILOT = production-ready system deployable in real environment. Assess based on deliverables — if deliverables include working code/prototype, it is NOT a blueprint. MUST use codes from the allowed values list only.',
  eligibility: 'Output: JSON array of tier codes from the allowed values list ONLY. Selection guide: TIER_1 (individual experts) = suitable for Blueprint challenges or specialized analysis. TIER_2 (small teams 2-5) = suitable for POC challenges requiring diverse skills. TIER_3 (organizations/firms) = suitable for Pilot challenges needing infrastructure and support. Consider solver_expertise requirements and challenge complexity when selecting. Multiple tiers can be selected to widen the solver pool.',
  visibility: 'Output: JSON array of visibility codes from the allowed values list ONLY. "anonymous" = solver identity hidden during evaluation — reduces bias, recommended for most challenges especially those with objective evaluation criteria. "named" = solver identity visible — needed for team-based challenges, relationship-dependent work, or when evaluator needs to assess team composition. Default to anonymous unless the challenge specifically requires team assessment.',
  domain_tags: 'Output: JSON array of 3-8 tag strings. Tags MUST be: (1) Specific enough to attract the right solvers — not "technology" but "predictive maintenance" or "NLP for healthcare", (2) Include both domain tags (industry vertical) AND capability tags (technology/methodology), (3) Match the platform\'s 17 solution domains where applicable (Digital Strategy, AI/ML Solutions, Cybersecurity & Trust, etc.). Derive from problem_statement, scope, and deliverables. Avoid generic tags like "innovation" or "digital".',
  solution_type: 'Output: JSON array of solution type codes from the allowed values list ONLY. Select types that match the challenge\'s deliverables and required approach. A challenge may span multiple types (e.g., a data analytics challenge needing ML and visualization). Select 1-3 most relevant types. Cross-reference with problem_statement and scope to ensure alignment.',
  context_and_background: 'Output: Rich HTML providing comprehensive context for external solvers who have NO internal organizational knowledge. MUST include: (1) Organization/industry context — what the org does, market position, (2) Operational setting — systems, processes, scale of operations, (3) Prior attempts — what has been tried and why it failed or was insufficient, (4) Triggering event — why this challenge is being launched now. Length: 150-300 words.',
  ip_model: 'Output: { "selected_id": "IP-EA"|"IP-NEL"|"IP-EL"|"IP-JO"|"IP-SR", "rationale": "..." }. Selection guide: IP-EA (Full Transfer) = when seeker will commercialize exclusively (proprietary algorithms, patents). IP-NEL (Non-Exclusive License) = when solution has broad applicability, seeker only needs usage rights. IP-EL (Exclusive License) = seeker needs exclusive usage but solver retains ownership. IP-JO (Joint Ownership) = collaborative R&D with shared contributions. IP-SR (Solver Retains) = advisory/consulting with no tangible IP created. Analyze deliverables, maturity level, and reward to justify recommendation.',
};

export const SECTION_QUALITY_EXEMPLARS: Partial<Record<string, string>> = {
  scope: `IN SCOPE:
- Demand forecasting for 847 SKUs across our 12 North American distribution centers
- Integration with SAP ERP (S/4HANA) for real-time inventory feeds
- Model training on 36 months of historical order data (provided)
- Automated weekly retraining pipeline

OUT OF SCOPE:
- Supply-side forecasting (vendor lead times, procurement optimization)
- International distribution centers (EU/APAC expansion planned for Phase 2)
- Real-time pricing adjustments (separate initiative in Q3)`,

  evaluation_criteria: `[{"criterion_name":"Forecast Accuracy","weight_percentage":35,"description":"Mean Absolute Percentage Error (MAPE) on held-out test set of 12 weeks. Must demonstrate improvement over our current 23% MAPE baseline.","scoring_method":"Automated: compute MAPE on provided test dataset. Threshold: <15% = full marks, 15-20% = partial, >20% = fail.","evaluator_role":"Data Science Lead"},{"criterion_name":"System Integration","weight_percentage":25,"description":"API successfully connects to SAP S/4HANA sandbox, processes real inventory feeds, and returns forecasts within SLA.","scoring_method":"Live demo: evaluator triggers 3 forecast runs via API. All must complete within 60-second SLA.","evaluator_role":"Enterprise Architect"}]`,

  success_metrics_kpis: `[{"kpi":"Forecast MAPE","baseline":"23% (current Excel model)","target":"<15%","measurement_method":"Automated MAPE computation on 12-week holdout set","timeframe":"8 weeks from project start"},{"kpi":"Stockout Reduction","baseline":"340 events/quarter","target":"<170 events/quarter (50% reduction)","measurement_method":"Monthly stockout count from SAP inventory reports","timeframe":"First quarter post-deployment"}]`,

  hook: `Can your AI outpredict our 18-month-old Excel forecasts? We need to cut our 23% forecast error rate in half across 847 SKUs and 12 distribution centers — and we are offering $75,000 to the solver who can prove it with a working API.`,

  solver_expertise: `{"expertise_areas":[{"area":"Machine Learning / Time Series","sub_areas":["demand forecasting","ARIMA/Prophet/LSTM","feature engineering for retail"],"level":"required"},{"area":"Enterprise Integration","sub_areas":["SAP S/4HANA","REST API development","ETL pipelines"],"level":"required"},{"area":"MLOps","sub_areas":["model monitoring","automated retraining","drift detection"],"level":"preferred"}],"certifications":["AWS ML Specialty or equivalent cloud ML cert"],"experience_years":5,"domain_knowledge":["retail/CPG supply chain","inventory optimization"]}`,

  reward_structure: `Monetary: 3-tier competitive structure. 1st place: $45,000, 2nd place: $20,000, 3rd place: $10,000. Total pool: $75,000 USD. Non-monetary: Featured case study on our innovation portal, letter of recommendation from our VP Supply Chain, priority consideration for Phase 2 pilot engagement.`,
};

export const DEFAULT_QUALITY_CRITERIA: Record<string, any[]> = {
  problem_statement: [
    { name: 'Specificity', severity: 'error', description: 'Must state a concrete, bounded problem — not a general wish. Bad: "Improve customer experience". Good: "Reduce cart abandonment rate from 73% to below 40% on mobile checkout".' },
    { name: 'Solver Comprehension', severity: 'warning', description: 'A solver with NO internal context should understand the problem after reading this section alone. No undefined acronyms, no assumed knowledge.' },
    { name: 'Impact Quantification', severity: 'suggestion', description: 'Should include at least one quantified impact (cost, time, revenue, risk).' },
  ],
  deliverables: [
    { name: 'Acceptance Criteria', severity: 'error', description: 'Each deliverable MUST have testable acceptance criteria. Bad: "Working prototype". Good: "REST API accepting JSON input, returning predictions within 200ms, documented with OpenAPI 3.0 spec".', crossReferences: ['evaluation_criteria'] },
    { name: 'Evaluation Alignment', severity: 'warning', description: 'Every evaluation criterion must map to at least one deliverable. Every deliverable must be assessable.', crossReferences: ['evaluation_criteria'] },
    { name: 'Maturity Match', severity: 'error', description: 'Deliverables must match maturity level. Blueprint = documents/frameworks. POC = working code/prototype. Pilot = production system.', crossReferences: ['maturity_level'] },
  ],
  evaluation_criteria: [
    { name: 'Weight Sum', severity: 'error', description: 'Criterion weights MUST sum to exactly 100%. If they do not, flag as error and normalize.' },
    { name: 'Deliverable Coverage', severity: 'warning', description: 'Each criterion should map to specific deliverables. Criteria without clear deliverable linkage are unassessable.', crossReferences: ['deliverables'] },
    { name: 'Evaluator Feasibility', severity: 'suggestion', description: 'Scoring methods must be practical. "Expert panel" needs available experts. "Automated testing" needs test infrastructure.' },
  ],
  phase_schedule: [
    { name: 'Date Validity', severity: 'error', description: 'All start dates must be in the future relative to today. End dates must be after start dates. No overlapping phases.' },
    { name: 'Duration Alignment', severity: 'warning', description: 'Total duration must align with complexity: Blueprint 4-8 weeks, POC 8-16 weeks, Pilot 16-32 weeks. Flag significant deviations.', crossReferences: ['complexity', 'maturity_level'] },
  ],
  reward_structure: [
    { name: 'Budget Alignment', severity: 'error', description: 'If budget_min/budget_max are set, total tier amounts must fall within that range. Never exceed budget_max.' },
    { name: 'Tier Rationale', severity: 'warning', description: 'Reward amounts should align with complexity and maturity: Blueprint $5K-$25K, POC $25K-$100K, Pilot $100K-$500K.', crossReferences: ['complexity', 'maturity_level'] },
    { name: 'Non-Monetary Items', severity: 'suggestion', description: 'Should include 3-5 relevant non-monetary incentives that motivate the target solver profile.' },
  ],
  solver_expertise: [
    { name: 'Solution Type Alignment', severity: 'warning', description: 'Required expertise areas must match the solution type(s) and deliverable requirements.', crossReferences: ['solution_type', 'deliverables'] },
    { name: 'Specificity', severity: 'suggestion', description: 'Expertise requirements should be specific enough to filter solvers but not so narrow that they exclude qualified candidates.' },
  ],
  submission_guidelines: [
    { name: 'Deliverable Coverage', severity: 'warning', description: 'Every deliverable must have a corresponding submission format requirement. Evaluators need to know what to expect.', crossReferences: ['deliverables', 'evaluation_criteria'] },
    { name: 'Evaluation Feasibility', severity: 'suggestion', description: 'Submission format must enable all evaluation criteria to be assessed. If a criterion requires a demo, submission guidelines must request demo instructions.' },
  ],
  scope: [
    { name: 'Boundary Clarity', severity: 'warning', description: 'Must explicitly state what is IN scope and OUT of scope. Ambiguous scope leads to misaligned submissions.' },
    { name: 'Problem Alignment', severity: 'suggestion', description: 'Scope items should directly trace to the problem statement. No scope items that address unrelated issues.', crossReferences: ['problem_statement'] },
  ],
  expected_outcomes: [
    { name: 'SMART Format', severity: 'warning', description: 'Each outcome must be Specific, Measurable, Achievable, Relevant, and Time-bound. Generic outcomes like "improved efficiency" are insufficient.' },
    { name: 'Deliverable Traceability', severity: 'suggestion', description: 'Each outcome should be achievable through the defined deliverables.', crossReferences: ['deliverables'] },
  ],
  legal_docs: [
    { name: 'IP Consistency', severity: 'error', description: 'Legal terms must match the selected IP Model. An IP-EA challenge with an NDA that allows solver retention is contradictory.', crossReferences: ['ip_model'] },
    { name: 'Jurisdiction Coverage', severity: 'warning', description: 'Legal documents should cover all jurisdictions implied by Eligibility settings. Global eligibility requires cross-border IP and dispute resolution clauses.', crossReferences: ['eligibility'] },
  ],
  escrow_funding: [
    { name: 'Amount Match', severity: 'error', description: 'Escrow deposit must equal total prize pool defined in Reward Structure. Any discrepancy blocks publication.', crossReferences: ['reward_structure'] },
    { name: 'Timing', severity: 'warning', description: 'Escrow funding must be secured before challenge opens for submissions. Timeline must align with Phase Schedule.', crossReferences: ['phase_schedule'] },
  ],
  visibility: [
    { name: 'Data Sensitivity', severity: 'error', description: 'Challenges involving proprietary data or sensitive IP must NOT use public visibility. Flag if scope references confidential assets with public solver visibility.', crossReferences: ['scope', 'legal_docs'] },
  ],
};

export const DEFAULT_PLATFORM_PREAMBLE = `You are a senior management consultant and innovation architect with deep expertise across digital transformation, technology strategy, enterprise architecture, and open innovation program design. Your reviews and content must meet the quality bar of KPMG, PwC, EY, and Deloitte advisory deliverables — but your role is to help achieve these outcomes at 50% lower cost through open innovation with globally distributed solvers enrolled into our platform.

PLATFORM CONTEXT:
This is an enterprise open innovation platform. Challenges seek solution blueprints, POCs, and pilots across 17 solution domains: (1) Digital Business Models, (2) Digital Strategy, (3) Enterprise Strategy Design, (4) Intelligent Process Design (SCM, Procurement, Finance, HR), (5) Process Excellence & Automation, (6) Technology Architecture, (7) Enterprise Architecture, (8) Data Strategy & Analytics, (9) AI/ML Solutions, (10) Agentic AI & GenAI Lifecycle Management, (11) Cybersecurity & Trust, (12) Cloud Modernization & Infrastructure, (13) Smart Workplaces & Digital Experience, (14) Operating Model Transformation, (15) Product & Service Innovation, (16) Platform Ecosystems & API Strategy, (17) Workforce Transformation & Change Management.

QUALITY STANDARDS:
- CONSULTANT-GRADE: Every sentence should be something a Deloitte partner would sign off on. No filler. No platitudes. Specific, actionable, measurable.
- INDUSTRY-INFORMED: Reference frameworks (TOGAF, ITIL, SAFe, Design Thinking, JTBD, Value Chain Analysis, Blue Ocean Strategy) where applicable.
- OPEN INNOVATION AWARE: Deliverables must be self-contained, well-scoped, and assessable by external solvers with no internal organizational context.
- MATURITY-DRIVEN: Blueprint = strategic document. POC = working prototype. Pilot = production-ready system. Never confuse these.

ANTI-HALLUCINATION RULES:
- NEVER invent technical specifications not mentioned in the challenge context.
- NEVER suggest dates without computing from today's date + duration.
- NEVER recommend master data values outside the provided valid options.
- If you lack context, say exactly what information is needed and from which section.
- NEVER generate generic consulting boilerplate. Every sentence must reference THIS specific challenge.`;

export const SECTION_DISPLAY_NAMES: Record<string, string> = {
  problem_statement: 'Problem Statement',
  scope: 'Scope',
  deliverables: 'Deliverables',
  submission_guidelines: 'Submission Guidelines',
  expected_outcomes: 'Expected Outcomes',
  maturity_level: 'Maturity Level',
  evaluation_criteria: 'Evaluation Criteria',
  reward_structure: 'Reward Structure',
  complexity: 'Complexity Assessment',
  ip_model: 'IP Model',
  legal_docs: 'Legal Documents',
  escrow_funding: 'Escrow & Funding',
  eligibility: 'Eligibility',
  visibility: 'Visibility',
  domain_tags: 'Domain Tags',
  phase_schedule: 'Phase Schedule',
  hook: 'Challenge Hook',
  context_and_background: 'Context & Background',
  root_causes: 'Root Causes',
  affected_stakeholders: 'Affected Stakeholders',
  current_deficiencies: 'Current Deficiencies',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Approaches NOT of Interest',
  solver_expertise: 'Solver Expertise Requirements',
  data_resources_provided: 'Data & Resources Provided',
  success_metrics_kpis: 'Success Metrics & KPIs',
  solution_type: 'Solution Type',
};

export function getSectionName(key: string): string {
  return SECTION_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function buildProportionalityAnchor(ctx?: any): string {
  if (!ctx) return '';

  const budgetMin = ctx.budgetMin ?? ctx.budget_min ?? 0;
  const budgetMax = ctx.budgetMax ?? ctx.budget_max ?? 0;
  const currency = ctx.currency ?? ctx.currencyCode ?? 'USD';
  const maturity = ctx.maturityLevel ?? ctx.maturity_level ?? 'not set';
  const timeline = ctx.timeline ?? ctx.totalWeeks ?? 'not set';

  let budgetTier = 'unknown';
  if (budgetMax > 0 && budgetMax < 25000) budgetTier = 'under $25K (micro-challenge)';
  else if (budgetMax >= 25000 && budgetMax <= 100000) budgetTier = '$25K–$100K (standard challenge)';
  else if (budgetMax > 100000 && budgetMax <= 500000) budgetTier = '$100K–$500K (premium challenge)';
  else if (budgetMax > 500000) budgetTier = '$500K+ (enterprise challenge)';

  const maturityMap: Record<string, string> = {
    blueprint: 'Blueprint — conceptual exploration, lightweight deliverables',
    demo: 'Demo — working demonstration, moderate deliverables',
    poc: 'POC — feasibility evidence, focused deliverables',
    prototype: 'Prototype — functional end-to-end demo, substantial deliverables',
    pilot: 'Pilot — real-world deployment test, comprehensive deliverables',
  };
  const maturityDesc = maturityMap[(maturity || '').toLowerCase()] ?? maturity;

  return `## PROPORTIONALITY ANCHOR (CRITICAL — SCOPE CALIBRATION)
Budget range: ${currency} ${budgetMin.toLocaleString()}–${budgetMax.toLocaleString()} (Tier: ${budgetTier})
Maturity level: ${maturityDesc}
Timeline: ${timeline} weeks

CALIBRATION RULES:
- Under $25K: Max 3 deliverables, max 5 KPIs, max 2 evaluation criteria, max 2 phases. Simple expertise requirements.
- $25K–$100K: Max 5 deliverables, max 8 KPIs, max 5 evaluation criteria, max 3 phases. Standard expertise.
- $100K–$500K: Max 8 deliverables, max 12 KPIs, max 7 evaluation criteria, max 4 phases. Advanced expertise.
- $500K+: Scale appropriately but justify complexity with budget headroom.

SCOPE CEILING RULE: Never generate more deliverables, criteria, or phases than the budget tier allows unless the seeker explicitly specified them.

10× TEST: Before finalizing ANY section, ask: "Would a reasonable sponsor paying ${currency} ${budgetMax.toLocaleString()} expect this level of scope/complexity?" If the answer is no, scale down.`;
}

export function hasStructuredData(config: SectionConfig): boolean {
  const qc = config.quality_criteria;
  const cr = config.cross_references;
  const mdc = config.master_data_constraints;
  return (
    (Array.isArray(qc) && qc.length > 0) ||
    (Array.isArray(cr) && cr.length > 0) ||
    (Array.isArray(mdc) && mdc.length > 0)
  );
}

export function getEffectiveQualityCriteria(config: SectionConfig): any[] {
  const dbCriteria = config.quality_criteria;
  if (Array.isArray(dbCriteria) && dbCriteria.length > 0) return dbCriteria;
  return DEFAULT_QUALITY_CRITERIA[config.section_key] ?? [];
}

export function sanitizeTableSuggestion(raw: string): string {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
    if (parsed?.items && Array.isArray(parsed.items)) return JSON.stringify(parsed.items);
    if (parsed?.rows && Array.isArray(parsed.rows)) return JSON.stringify(parsed.rows);
    if (parsed?.criteria && Array.isArray(parsed.criteria)) return JSON.stringify(parsed.criteria);
  } catch { /* not valid JSON directly */ }

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      let repaired = match[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');
      const open = (repaired.match(/\[/g) || []).length;
      const close = (repaired.match(/\]/g) || []).length;
      for (let i = close; i < open; i++) repaired += ']';
      try { JSON.parse(repaired); return repaired; } catch { /* give up */ }
    }
  }

  return raw;
}

export function getSuggestionFormatInstruction(sectionKey: string): string {
  const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[sectionKey];
  if (ebInstr) return ebInstr;
  const fmt = SECTION_FORMAT_MAP[sectionKey] || 'rich_text';
  return FORMAT_INSTRUCTIONS[fmt] || FORMAT_INSTRUCTIONS.rich_text;
}

export function getSectionFormatType(sectionKey: string): string {
  return SECTION_FORMAT_MAP[sectionKey] || 'rich_text';
}
