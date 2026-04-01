/**
 * promptTemplate.ts — Shared prompt template for AI Review edge function.
 *
 * SYNC: This template logic must match
 * src/lib/aiReviewPromptTemplate.ts (legacy)
 * src/lib/cogniblend/assemblePrompt.ts (structured — Phase 6)
 *
 * If you update the prompt structure here, update the frontend copies too.
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
  // Phase 6 structured fields
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

const ROLE_CONTEXT_LABELS: Record<string, string> = {
  intake: 'intake brief submitted by an Account Manager or Challenge Requestor',
  spec: 'AI-generated challenge specification from the Creator/Architect perspective',
  curation: 'challenge specification for publication readiness',
  legal: 'challenge legal documentation and compliance',
  finance: 'challenge financial configuration and escrow setup',
  evaluation: 'challenge evaluation methodology and scoring rubric',
};

/** Format-specific output instructions appended per section */
const FORMAT_INSTRUCTIONS: Record<string, string> = {
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

/** Gap 5: Section-specific quality bar exemplars as fallback when DB example_good is null */
const SECTION_QUALITY_EXEMPLARS: Partial<Record<string, string>> = {
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

/**
 * Proportionality Anchor — calibrates AI-generated content scale to the
 * challenge's budget, maturity level, and timeline.
 */
function buildProportionalityAnchor(ctx?: any): string {
  if (!ctx) return '';

  const budgetMin = ctx.budgetMin ?? ctx.budget_min ?? 0;
  const budgetMax = ctx.budgetMax ?? ctx.budget_max ?? 0;
  const currency = ctx.currency ?? ctx.currencyCode ?? 'USD';
  const maturity = ctx.maturityLevel ?? ctx.maturity_level ?? 'not set';
  const timeline = ctx.timeline ?? ctx.totalWeeks ?? 'not set';

  // Determine budget tier label
  let budgetTier = 'unknown';
  if (budgetMax > 0 && budgetMax < 25000) budgetTier = 'under $25K (micro-challenge)';
  else if (budgetMax >= 25000 && budgetMax <= 100000) budgetTier = '$25K–$100K (standard challenge)';
  else if (budgetMax > 100000 && budgetMax <= 500000) budgetTier = '$100K–$500K (premium challenge)';
  else if (budgetMax > 500000) budgetTier = '$500K+ (enterprise challenge)';

  // Maturity mapping
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

/** Map section keys to their format type for prompt enrichment */
const SECTION_FORMAT_MAP: Record<string, string> = {
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
  // Extended Brief subsections
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

/** Extended Brief subsection-specific format instructions — FIX 2: ALL 26 sections covered */
const EXTENDED_BRIEF_FORMAT_INSTRUCTIONS: Record<string, string> = {
  // ── Sections that already had instructions ──
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

  // ── FIX 2: NEW section-specific instructions for previously uncovered sections ──
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

/* ── FIX 5: Default quality criteria as code constants ── */

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
  hook: [
    { name: 'Solver Motivation', severity: 'warning', description: 'Must create urgency or highlight unique opportunity. Should reference specific reward or impact.' },
    { name: 'Length', severity: 'suggestion', description: 'Should be 50-100 words. Too short lacks impact; too long loses attention.' },
  ],
  domain_tags: [
    { name: 'Specificity', severity: 'warning', description: 'Tags must be specific enough to attract right solvers. "Technology" is too broad; "Predictive Maintenance for Wind Turbines" is ideal.' },
    { name: 'Coverage', severity: 'suggestion', description: 'Should include 3-8 tags covering both industry domain and technical capability.' },
  ],
  success_metrics_kpis: [
    { name: 'Outcome Alignment', severity: 'warning', description: 'Each KPI must map to an expected outcome. KPIs without corresponding outcomes are orphaned.', crossReferences: ['expected_outcomes'] },
    { name: 'Measurability', severity: 'error', description: 'Each KPI must include a specific measurement method and baseline/target values.' },
  ],

  // ── GAP 1 FIX: Quality criteria for 13 previously uncovered sections ──

  context_and_background: [
    { name: 'External Solver Accessibility', severity: 'error', description: 'Context must be understandable by solvers with ZERO internal organizational knowledge. No undefined acronyms, no references to internal systems by name without explanation, no assumed cultural context.' },
    { name: 'Prior Attempts', severity: 'warning', description: 'Should describe what has been tried before and why it was insufficient. This prevents solvers from re-proposing failed approaches and demonstrates organizational maturity.' },
    { name: 'Triggering Event', severity: 'suggestion', description: 'Should explain why this challenge is being launched NOW — regulatory deadline, competitive pressure, technology readiness, budget availability. Creates urgency context for solvers.' },
  ],

  solution_type: [
    { name: 'Deliverable Alignment', severity: 'error', description: 'Selected solution types must match the challenge deliverables. A "Data Strategy" challenge should not only select "Process Automation" types. Cross-check with deliverables and scope.', crossReferences: ['deliverables', 'scope'] },
    { name: 'Coverage Without Dilution', severity: 'warning', description: 'Select 1-3 types. Too many types (>3) dilutes solver targeting. Too few may miss qualified solvers from adjacent domains.' },
    { name: 'Solver Pool Impact', severity: 'suggestion', description: 'Consider which solution types correspond to the largest active solver pools on the platform. Niche types may limit participation.' },
  ],

  root_causes: [
    { name: 'Problem Traceability', severity: 'error', description: 'Every root cause must directly relate to the stated problem. Root causes that address unrelated issues indicate scope confusion.', crossReferences: ['problem_statement'] },
    { name: 'Actionability', severity: 'warning', description: 'Root causes should be at a level where a solver can address them. "Market dynamics" is too abstract. "Lack of real-time demand signal integration in the forecasting pipeline" is actionable.' },
    { name: 'Completeness', severity: 'suggestion', description: 'Should cover technical, process, and organizational root causes — not just one dimension. Mono-dimensional root cause analysis leads to incomplete solutions.' },
  ],

  affected_stakeholders: [
    { name: 'Adoption Challenge Required', severity: 'error', description: 'Every stakeholder MUST have an adoption_challenge filled in. This is the most valuable field — it tells solvers what resistance to expect and design around.' },
    { name: 'Role Specificity', severity: 'warning', description: 'Roles must be specific: "VP of Supply Chain Operations" not "Management". Generic roles make the stakeholder map useless for solver planning.' },
    { name: 'Completeness', severity: 'suggestion', description: 'Should include both primary stakeholders (directly impacted) and secondary stakeholders (indirectly affected, e.g., IT team for system integration, Legal for compliance review).', crossReferences: ['scope'] },
  ],

  current_deficiencies: [
    { name: 'Factual Observations', severity: 'error', description: 'Each deficiency must be a factual observation about the CURRENT state — not a wish, not a solution hint, not a future aspiration. Bad: "Need better analytics". Good: "Current reporting requires 3 manual data exports and 48-hour processing lag".' },
    { name: 'Problem Linkage', severity: 'warning', description: 'Deficiencies should clearly map to the stated root causes. Orphaned deficiencies (not linked to any root cause) suggest incomplete root cause analysis.', crossReferences: ['root_causes', 'problem_statement'] },
    { name: 'Quantification', severity: 'suggestion', description: 'Where possible, quantify the deficiency: processing time, error rate, cost impact, manual effort hours. Numbers give solvers calibration points.' },
  ],

  preferred_approach: [
    { name: 'Seeker Intent Preservation', severity: 'error', description: 'AI must NEVER rewrite human-authored preferred approaches. Only flag clarity issues or inconsistencies. The seeker knows their organization — respect their strategic direction.' },
    { name: 'Scope Consistency', severity: 'warning', description: 'Preferred approaches must be achievable within the stated scope and deliverables. An approach requiring "full enterprise transformation" contradicts a Blueprint-level challenge.', crossReferences: ['scope', 'maturity_level', 'deliverables'] },
    { name: 'Solver Guidance Value', severity: 'suggestion', description: 'Should provide strategic direction without being so prescriptive that it eliminates creative solver approaches. Balance guidance with openness.' },
  ],

  approaches_not_of_interest: [
    { name: 'Seeker Intent Preservation', severity: 'error', description: 'AI must NEVER remove or soften human-authored exclusions. Only flag if an exclusion contradicts other sections (e.g., excluding the only viable approach for a given deliverable).' },
    { name: 'Clarity', severity: 'warning', description: 'Each exclusion must be specific enough that a solver can clearly determine if their approach is excluded. "Approaches we have already tried" is not useful without listing what was tried.' },
    { name: 'Preferred Approach Consistency', severity: 'suggestion', description: 'Should not contradict preferred_approach. If preferred approach says "cloud-native" but exclusions don\'t mention on-premise, that may be an oversight.', crossReferences: ['preferred_approach'] },
  ],

  maturity_level: [
    { name: 'Deliverable Consistency', severity: 'error', description: 'Maturity level MUST match deliverables. If deliverables include "working API" or "deployable prototype", maturity cannot be "Blueprint". If deliverables are "strategic recommendations", maturity cannot be "Pilot".', crossReferences: ['deliverables'] },
    { name: 'Timeline Feasibility', severity: 'warning', description: 'Maturity level determines feasible timeline: Blueprint = 4-8 weeks, POC = 8-16 weeks, Pilot = 16-32 weeks. If phase_schedule contradicts this, flag the inconsistency.', crossReferences: ['phase_schedule', 'complexity'] },
    { name: 'Reward Proportionality', severity: 'suggestion', description: 'Reward amounts should scale with maturity: Blueprint rewards are typically lowest, Pilot rewards highest. Major mismatches reduce solver interest.', crossReferences: ['reward_structure'] },
  ],

  complexity: [
    { name: 'Dimension Independence', severity: 'error', description: 'Each complexity dimension must be rated independently. A challenge can have high technical novelty but low timeline urgency. All dimensions at the same score (e.g., all 5s) is almost certainly wrong.' },
    { name: 'Evidence-Based Justification', severity: 'warning', description: 'Every rating MUST cite specific challenge content. "Medium complexity" without referencing deliverables, scope, or constraints is useless. Quote field values, cite numbers.' },
    { name: 'Empty Section Handling', severity: 'suggestion', description: 'If a section that should inform a dimension is empty (e.g., no data_resources_provided for data_complexity), rate conservatively (lower) and state the gap explicitly.', crossReferences: ['solution_type', 'deliverables', 'scope', 'maturity_level'] },
  ],

  data_resources_provided: [
    { name: 'Solver Actionability', severity: 'error', description: 'Each resource must include an access_method — solvers need to know HOW to get the data. "Available upon request" is acceptable; no access method at all is not.' },
    { name: 'Deliverable Sufficiency', severity: 'warning', description: 'The listed resources must be sufficient for solvers to produce all deliverables. If deliverables require training data but no datasets are listed, flag the gap.', crossReferences: ['deliverables'] },
    { name: 'Restriction Clarity', severity: 'suggestion', description: 'Data restrictions (NDA, no redistribution, anonymization required) must be explicit. Ambiguous restrictions create legal risk for solvers and reduce participation.' },
  ],

  eligibility: [
    { name: 'Expertise Alignment', severity: 'error', description: 'Eligibility tiers must be appropriate for the required solver expertise. TIER_1 (individuals) should not be the only option for a Pilot challenge requiring multi-disciplinary teams.', crossReferences: ['solver_expertise', 'complexity'] },
    { name: 'Pool Size Consideration', severity: 'warning', description: 'Overly restrictive eligibility (single tier, high barrier) reduces the solver pool. Overly broad (all tiers for a niche challenge) dilutes submission quality. Balance based on maturity and complexity.', crossReferences: ['maturity_level'] },
    { name: 'Master Data Compliance', severity: 'error', description: 'Only codes from the allowed values list may be used. Do NOT invent new eligibility tiers or codes.' },
  ],

  ip_model: [
    { name: 'Deliverable-IP Alignment', severity: 'error', description: 'IP model must match deliverable nature. If deliverables include "proprietary algorithm" or "patentable invention", IP-NONE is inappropriate. If deliverables are "advisory report", IP-EA is excessive.', crossReferences: ['deliverables'] },
    { name: 'Solver Incentive Balance', severity: 'warning', description: 'Stronger IP transfer (IP-EA) requires higher rewards to attract solvers. If IP-EA is selected but reward is low, flag the imbalance — top solvers will avoid the challenge.', crossReferences: ['reward_structure'] },
    { name: 'Maturity Appropriateness', severity: 'suggestion', description: 'Blueprint challenges rarely need IP-EA (no tangible IP is produced). Pilot challenges with production code typically need IP-EA or IP-EL.', crossReferences: ['maturity_level'] },
  ],

  visibility: [
    { name: 'Evaluation Bias Prevention', severity: 'warning', description: 'Default to "anonymous" unless the challenge specifically requires team assessment. Named visibility during evaluation introduces unconscious bias (brand recognition, institutional prestige).' },
    { name: 'Challenge Type Match', severity: 'suggestion', description: 'Team-based challenges (Pilot, multi-phase) benefit from "named" visibility so evaluators can assess team composition and capability. Individual challenges (Blueprint, analysis) benefit from "anonymous".', crossReferences: ['maturity_level', 'eligibility'] },
    { name: 'Master Data Compliance', severity: 'error', description: 'Only codes from the allowed values list may be used. Do NOT invent new visibility types.' },
  ],
};

/* ── FIX 6: Domain-to-framework mapping ── */

export const DOMAIN_FRAMEWORKS: Record<string, string[]> = {
  supply_chain: ['SCOR Model', 'APICS CPIM', 'Lean Six Sigma', 'S&OP', 'Demand-Driven MRP'],
  cybersecurity: ['NIST CSF 2.0', 'ISO 27001', 'MITRE ATT&CK', 'Zero Trust Architecture', 'CIS Controls'],
  ai_ml: ['CRISP-DM', 'ML Ops Maturity Model', 'Responsible AI Framework', 'Model Cards', 'AI Ethics Guidelines'],
  machine_learning: ['CRISP-DM', 'ML Ops Maturity Model', 'Feature Store patterns', 'Model monitoring'],
  data_analytics: ['DAMA-DMBOK', 'Data Mesh', 'Medallion Architecture', 'DataOps', 'FAIR Data Principles'],
  digital_transformation: ['McKinsey 7S', 'Kotter 8-Step Change Model', 'SAFe', 'TOGAF ADM', 'Prosci ADKAR'],
  cloud: ['AWS Well-Architected Framework', 'Azure CAF', 'GCP Architecture Framework', '12-Factor App', 'FinOps'],
  process_automation: ['RPA CoE Model', 'Process Mining (Celonis)', 'BPMN 2.0', 'Intelligent Automation maturity'],
  product_innovation: ['Jobs-to-be-Done (JTBD)', 'Design Thinking (d.school)', 'Lean Startup', 'OKR Framework'],
  iot: ['IoT Reference Architecture (ISO/IEC 30141)', 'Edge Computing patterns', 'MQTT/OPC-UA protocols'],
  blockchain: ['Token Economics', 'Consensus Mechanism selection', 'Smart Contract audit standards'],
  healthcare: ['HL7 FHIR', 'HIPAA compliance', 'Clinical Decision Support standards', 'FDA SaMD guidelines'],
  finance: ['Basel III/IV', 'PSD2/Open Banking', 'Anti-Money Laundering (AML)', 'SOX compliance'],
  sustainability: ['GRI Standards', 'TCFD Framework', 'Science-Based Targets (SBTi)', 'ESG Reporting'],
  enterprise_architecture: ['TOGAF', 'Zachman Framework', 'ArchiMate', 'Business Capability Modeling'],
  predictive_maintenance: ['Predictive Maintenance maturity model', 'Vibration analysis', 'MTBF/MTTR', 'CBM standards'],
  nlp: ['Transformer architectures', 'BLEU/ROUGE evaluation', 'Named Entity Recognition', 'LLM fine-tuning patterns'],
  computer_vision: ['COCO evaluation metrics', 'mAP scoring', 'Edge deployment optimization', 'Data augmentation strategies'],
  api_strategy: ['API-first design', 'OpenAPI 3.0', 'API Gateway patterns', 'Developer Experience (DX) design'],
  workforce: ['Skills-based organization', 'Digital fluency assessment', 'Change saturation management'],
};

/**
 * Detect domain frameworks from challenge domain tags, problem statement, and scope.
 * Returns a deduplicated list of relevant frameworks.
 *
 * Scanning strategy:
 * 1. Direct match on domain_tags (highest confidence)
 * 2. Keyword scan on problem_statement and scope (broader catch, only if tags yield nothing)
 */
export function detectDomainFrameworks(
  domainTags: any,
  problemStatement?: string | null,
  scope?: string | null,
): string[] {
  const relevant = new Set<string>();

  // Strategy 1: Match against domain_tags (existing logic)
  if (domainTags && Array.isArray(domainTags)) {
    for (const tag of domainTags) {
      const tagLower = String(tag).toLowerCase().replace(/[\s\-]+/g, '_');
      for (const [domain, frameworks] of Object.entries(DOMAIN_FRAMEWORKS)) {
        if (tagLower.includes(domain) || domain.includes(tagLower)) {
          frameworks.forEach(f => relevant.add(f));
        }
      }
    }
  }

  // Strategy 2: Keyword scan on problem_statement and scope (only if tags yielded nothing)
  if (relevant.size === 0 && (problemStatement || scope)) {
    const textToScan = [
      problemStatement || '',
      scope || '',
    ].join(' ').toLowerCase().replace(/<[^>]*>/g, ' ');

    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      supply_chain: ['supply chain', 'logistics', 'procurement', 'warehouse', 'inventory', 'demand forecast', 'scm'],
      cybersecurity: ['cybersecurity', 'cyber security', 'information security', 'threat', 'vulnerability', 'penetration test', 'soc ', 'siem'],
      ai_ml: ['machine learning', 'artificial intelligence', ' ai ', ' ml ', 'deep learning', 'neural network', 'model training', 'llm', 'generative ai'],
      data_analytics: ['data analytics', 'data warehouse', 'business intelligence', ' bi ', 'data lake', 'data pipeline', 'etl', 'dashboard'],
      cloud: ['cloud migration', 'cloud native', 'aws', 'azure', 'gcp', 'kubernetes', 'containeriz', 'microservice', 'serverless'],
      digital_transformation: ['digital transformation', 'change management', 'organizational change', 'digital maturity', 'agile transformation'],
      process_automation: ['process automation', ' rpa ', 'robotic process', 'workflow automation', 'bpm', 'process mining', 'intelligent automation'],
      product_innovation: ['product innovation', 'product design', 'user experience', ' ux ', 'design thinking', 'customer journey', 'mvp'],
      iot: ['internet of things', ' iot ', 'sensor', 'edge computing', 'connected device', 'telemetry', 'scada'],
      blockchain: ['blockchain', 'distributed ledger', 'smart contract', 'token', 'web3', 'defi'],
      healthcare: ['healthcare', 'clinical', 'patient', 'medical', 'pharmaceutical', 'ehr', 'fhir', 'hipaa'],
      finance: ['financial', 'banking', 'fintech', 'payment', 'lending', 'insurance', 'aml', 'kyc', 'compliance'],
      sustainability: ['sustainability', 'esg', 'carbon', 'emissions', 'climate', 'renewable', 'circular economy'],
      enterprise_architecture: ['enterprise architecture', 'togaf', 'archimate', 'capability model', 'technology landscape'],
      predictive_maintenance: ['predictive maintenance', 'condition monitoring', 'vibration analysis', 'equipment failure', 'asset management'],
      nlp: ['natural language', ' nlp ', 'text mining', 'sentiment analysis', 'chatbot', 'language model', 'text classification'],
      computer_vision: ['computer vision', 'image recognition', 'object detection', 'video analytics', 'ocr'],
      api_strategy: ['api strategy', 'api gateway', 'api management', 'openapi', 'developer portal', 'api-first'],
      workforce: ['workforce', 'talent management', 'skills gap', 'reskilling', 'upskilling', 'employee experience', 'hr tech'],
    };

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (textToScan.includes(keyword)) {
          const frameworks = DOMAIN_FRAMEWORKS[domain];
          if (frameworks) {
            frameworks.forEach(f => relevant.add(f));
          }
          break; // One keyword match per domain is enough
        }
      }
    }
  }

  return [...relevant];
}

/* ── Default platform preamble ── */

const DEFAULT_PLATFORM_PREAMBLE = `You are a senior management consultant and innovation architect with deep expertise across digital transformation, technology strategy, enterprise architecture, and open innovation program design. Your reviews and content must meet the quality bar of KPMG, PwC, EY, and Deloitte advisory deliverables — but your role is to help achieve these outcomes at 50% lower cost through open innovation with globally distributed solvers enrolled into our platform.

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

/* ── Intelligence Directive — Domain Expert Consultant (replaces checklist-style directive) ── */

const INTELLIGENCE_DIRECTIVE = `
## YOUR ROLE: DOMAIN EXPERT CONSULTANT (NOT TEMPLATE AUDITOR)

You are a PRINCIPAL CONSULTANT who has spent 15+ years in this domain. You have:
- Delivered 200+ similar engagements across multiple geographies
- Published industry benchmarks and best practice guides
- Advised C-suite executives on exactly this type of challenge
- Seen what works, what fails, and why — from direct experience

### PRIMARY MODE: THINK, THEN CHECK

Do NOT start by checking format rules and word counts. START by understanding the challenge:

1. **COMPREHEND**: Read the entire challenge. What is this organization trying to achieve? What are the real constraints (stated and unstated)? What does success look like?

2. **CONTEXTUALIZE**: How does this compare to similar challenges you've seen? What worked? What failed? What were the non-obvious risks? What did the best solutions look like?

3. **THEN CRITIQUE**: Now check quality, completeness, consistency — but through the lens of "would this challenge attract a winning solution from a top solver?" Not "does this meet a checklist."

### WHAT YOU KNOW — AND MUST USE:

**From your training on consulting engagements:**
- Standard project structures for this type of work (what deliverables are typically expected)
- Typical timelines and budget ranges for similar scope
- Common failure modes and how to prevent them
- Industry-specific regulatory and compliance requirements
- Framework applicability (not just naming TOGAF — knowing WHEN and HOW it applies)

**From your training on open innovation platforms:**
- What makes a challenge attractive to top solvers (specificity, fairness, interesting problem)
- What makes solvers SKIP a challenge (vague scope, unfair IP terms, unrealistic timeline, low reward-to-effort ratio)
- Typical submission quality distribution (expect 5-10% excellent, 20-30% good, rest mediocre)
- How challenge design affects submission count and quality

**From your training on industry data:**
- Benchmarks: cost structures, KPIs, performance metrics for this industry
- Technology maturity: what's proven vs experimental in this domain
- Market dynamics: competitive landscape, vendor ecosystem, talent availability
- Regulatory: compliance requirements by geography and industry

### HOW TO EXPRESS THIS KNOWLEDGE:

In EVERY comment, ground your observation in domain experience:
- BAD: "The problem statement could be more specific."
- GOOD: "In predictive maintenance challenges, the #1 reason for poor submissions is that the problem statement doesn't specify the failure mode taxonomy. Solvers need to know whether they're detecting bearing wear, thermal anomalies, vibration patterns, or electrical faults — each requires different sensor data and different ML approaches. This problem statement should specify which failure modes are in scope."

- BAD: "Consider adding more evaluation criteria."
- GOOD: "For a POC-level AI/ML challenge, the standard evaluation framework includes: (1) Model accuracy on held-out test set (30-40% weight), (2) Inference latency under production load (15-20%), (3) Data preprocessing robustness (10-15%), (4) Documentation and reproducibility (10-15%), (5) Scalability assessment (10-15%). This challenge only has 2 criteria covering (1) and (5). Adding the others would dramatically improve submission quality and evaluation fairness."

### CHALLENGE ARCHETYPE RECOGNITION:

Before reviewing any section, identify which archetype this challenge fits:
- **Data/ML Pipeline**: Needs training data specification, model evaluation metrics, MLOps deployment plan, bias/fairness considerations
- **Enterprise Integration**: Needs system landscape, API contracts, auth requirements, rollback plan, performance SLAs
- **Process Redesign**: Needs current-state process map reference, change management stakeholders, adoption metrics, quick-win vs long-term phases
- **Strategic Advisory**: Needs executive audience framing, decision framework, implementation roadmap with governance gates
- **Product/UX Innovation**: Needs user persona reference, journey mapping, prototype fidelity definition, user testing protocol
- **Cybersecurity Assessment**: Needs threat model scope, compliance mapping, risk quantification method, remediation prioritization

Your comments MUST reflect the archetype. For a Data/ML challenge, flag missing training data specs as an ERROR, not a suggestion. For Strategic Advisory, flag missing governance framework as an ERROR.

### MATURITY-APPROPRIATE DEPTH:

- **Blueprint reviews**: Focus on strategic framing, stakeholder alignment, feasibility assessment. Flag overly technical deliverables as errors.
- **POC reviews**: Focus on technical feasibility, data availability, integration points, demo-readiness. Flag missing test criteria as errors.
- **Pilot reviews**: Focus on production readiness, scalability, security, operations handover, training plan. Flag missing SLAs as errors.

The SAME deliverable phrased differently is appropriate at different maturity levels:
- Blueprint: "Architecture recommendation document covering data flow, component selection rationale, and estimated infrastructure costs"
- POC: "Working data pipeline processing 1000 records/minute with <500ms latency, deployed on Docker, with automated test suite achieving >80% coverage"
- Pilot: "Production-grade data pipeline processing 50K records/minute with <100ms P99 latency, deployed on Kubernetes with auto-scaling, monitoring dashboard, runbook, and SLA of 99.9% uptime"

### SOLVER-PERSPECTIVE THINKING:

Before concluding your review of any section, mentally become a solver:
- "Would I understand this problem well enough to propose a solution?"
- "Do I know exactly what to deliver, in what format, by when?"
- "Is the reward worth the effort for this complexity level?"
- "What risks do I face (IP, scope creep, unclear acceptance criteria)?"

Flag every uncertainty a solver would have as a [SOLVER VIEW] warning.

### GUARDRAILS (still apply):
- Use domain knowledge for CONTEXT and BENCHMARKS — never for fabricated specifics about THIS organization
- Never invent system names, cost figures, regulatory citations you're not confident about
- If unsure about a domain-specific claim, say "in my experience" rather than stating as fact
- THE TEST: "Would a Deloitte principal consultant with 15 years in this domain say this from experience?" Yes → include.

### VOICE AND PERSPECTIVE

All AI-generated challenge content MUST be written from the SEEKING ORGANIZATION'S perspective — first person plural ("we", "our", "us"). The challenge is the seeker's own document addressed to potential solvers.

- WRONG: "The organization requires a predictive maintenance solution."
- RIGHT: "We need a predictive maintenance solution for our manufacturing lines."

- WRONG: "Solvers should note that the seeker has legacy SCADA systems."
- RIGHT: "Our factory floor runs on legacy SCADA systems (Siemens S7-300) with limited API access."

EXCEPTIONS:
- evaluation_criteria and submission_guidelines use neutral procedural voice ("Submissions will be evaluated...", "Solvers must provide...")
- AI review comments (speaking TO the curator) use second person ("Your problem statement should...", "Consider adding...")
`;

/* ── SECTION_WAVE_CONTEXT: Strategic role and lifecycle position for each section ── */

export const SECTION_WAVE_CONTEXT: Record<string, {
  wave: number;
  waveName: string;
  strategicRole: string;
  upstreamSections: string[];
  downstreamSections: string[];
}> = {
  problem_statement: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE ANCHOR — everything flows from this. If the problem is vague, every downstream section will be misaligned. This must be crystal clear to a solver who has never heard of this organization.',
    upstreamSections: [],
    downstreamSections: ['scope', 'deliverables', 'expected_outcomes', 'root_causes', 'hook', 'solver_expertise', 'solution_type'],
  },
  scope: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE BOUNDARY — defines what solvers should and should NOT address. Every downstream section must fit within scope. If scope is ambiguous, solvers waste effort on out-of-scope work.',
    upstreamSections: ['problem_statement'],
    downstreamSections: ['deliverables', 'solver_expertise', 'eligibility', 'submission_guidelines', 'domain_tags', 'complexity'],
  },
  expected_outcomes: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE MEASURE OF SUCCESS — these are what the seeker will use to judge whether the challenge was worth it. Must be SMART. Directly drives evaluation_criteria and success_metrics_kpis.',
    upstreamSections: ['problem_statement', 'scope'],
    downstreamSections: ['evaluation_criteria', 'deliverables', 'success_metrics_kpis'],
  },
  context_and_background: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE EQUALIZER — gives external solvers the same contextual understanding that internal teams have. Without this, solvers from outside the organization are at a massive disadvantage.',
    upstreamSections: ['problem_statement'],
    downstreamSections: ['root_causes', 'affected_stakeholders', 'current_deficiencies'],
  },
  success_metrics_kpis: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE SCORECARD — quantitative measures that make outcomes tangible and verifiable. These become the basis for evaluation criteria.',
    upstreamSections: ['expected_outcomes', 'deliverables'],
    downstreamSections: ['evaluation_criteria'],
  },
  solution_type: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE SOLVER FILTER — determines which solver pool this challenge reaches. Wrong type = wrong solvers = poor submissions.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables'],
    downstreamSections: ['complexity', 'solver_expertise', 'domain_tags', 'deliverables'],
  },
  root_causes: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE DIAGNOSTIC — tells solvers WHY the problem exists so they can address causes not symptoms.',
    upstreamSections: ['problem_statement', 'context_and_background'],
    downstreamSections: ['preferred_approach', 'current_deficiencies', 'deliverables'],
  },
  affected_stakeholders: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE ADOPTION MAP — tells solvers who will use their solution and what resistance to expect. Adoption challenges are the #1 reason innovation projects fail post-delivery.',
    upstreamSections: ['problem_statement', 'scope'],
    downstreamSections: [],
  },
  current_deficiencies: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE BASELINE — establishes the measurable current state so solvers know what "improvement" means and can quantify their impact.',
    upstreamSections: ['problem_statement', 'root_causes'],
    downstreamSections: ['deliverables', 'preferred_approach'],
  },
  preferred_approach: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE SEEKER VOICE — human-authored strategic direction. AI must NEVER override this. It represents organizational knowledge the AI cannot have.',
    upstreamSections: ['problem_statement', 'root_causes', 'deliverables'],
    downstreamSections: ['approaches_not_of_interest'],
  },
  approaches_not_of_interest: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE GUARDRAIL — prevents solvers from wasting time on approaches the seeker has already rejected or that violate organizational constraints.',
    upstreamSections: ['preferred_approach'],
    downstreamSections: [],
  },
  deliverables: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE CONTRACT — the most important section after problem_statement. This is what solvers COMMIT to produce. Vague deliverables = disputes, scope creep, and failed evaluations.',
    upstreamSections: ['problem_statement', 'scope', 'expected_outcomes', 'solution_type'],
    downstreamSections: ['complexity', 'solver_expertise', 'submission_guidelines', 'evaluation_criteria', 'maturity_level', 'data_resources_provided'],
  },
  maturity_level: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE CALIBRATOR — sets the depth expectation. Blueprint solvers write documents. POC solvers build prototypes. Pilot solvers deploy systems. Mismatched maturity = wrong deliverable quality.',
    upstreamSections: ['deliverables', 'scope'],
    downstreamSections: ['complexity', 'phase_schedule', 'reward_structure'],
  },
  complexity: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE PRICE SETTER — complexity directly determines appropriate reward, timeline, and solver tier. Underestimated complexity = underfunded challenge = no quality submissions.',
    upstreamSections: ['solution_type', 'deliverables', 'scope', 'maturity_level', 'data_resources_provided'],
    downstreamSections: ['phase_schedule', 'reward_structure', 'solver_expertise'],
  },
  data_resources_provided: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE ENABLER — solvers cannot produce deliverables without access to required data, APIs, and documentation. Missing resources = blocked solvers = failed challenge.',
    upstreamSections: ['deliverables', 'scope'],
    downstreamSections: ['submission_guidelines'],
  },
  solver_expertise: {
    wave: 4, waveName: 'Solvers & Timeline',
    strategicRole: 'THE TALENT SPECIFICATION — defines who can solve this. Too narrow = no submissions. Too broad = poor quality. Must precisely match deliverable requirements.',
    upstreamSections: ['solution_type', 'deliverables', 'scope', 'domain_tags'],
    downstreamSections: ['eligibility'],
  },
  eligibility: {
    wave: 4, waveName: 'Solvers & Timeline',
    strategicRole: 'THE ACCESS GATE — controls which solver tiers can participate. Blueprint challenges can accept individuals. Pilot challenges often need organizations with infrastructure.',
    upstreamSections: ['solver_expertise', 'maturity_level'],
    downstreamSections: [],
  },
  phase_schedule: {
    wave: 4, waveName: 'Solvers & Timeline',
    strategicRole: 'THE TIMELINE — must be realistic for the complexity and maturity level. Compressed timelines discourage top solvers. Overlong timelines lose urgency.',
    upstreamSections: ['deliverables', 'maturity_level', 'complexity'],
    downstreamSections: ['submission_guidelines', 'evaluation_criteria'],
  },
  submission_guidelines: {
    wave: 4, waveName: 'Solvers & Timeline',
    strategicRole: 'THE BRIDGE — connects what solvers produce (deliverables) with how they are assessed (evaluation_criteria). Every deliverable needs a submission format. Every criterion needs an assessable artifact.',
    upstreamSections: ['deliverables', 'evaluation_criteria', 'phase_schedule'],
    downstreamSections: [],
  },
  evaluation_criteria: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE JUDGE — weights must sum to 100%. Each criterion must map to at least one deliverable. Each deliverable must be assessed by at least one criterion. Poorly designed criteria = disputed results.',
    upstreamSections: ['deliverables', 'expected_outcomes', 'scope'],
    downstreamSections: [],
  },
  reward_structure: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE MOTIVATOR — must be proportional to complexity, competitive in the market, and fair given the IP model. Low rewards for high complexity = no top-tier submissions.',
    upstreamSections: ['complexity', 'maturity_level', 'deliverables', 'phase_schedule'],
    downstreamSections: [],
  },
  ip_model: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE VALUE EXCHANGE — defines who owns what. Stronger IP transfer demands higher rewards. Must match deliverable nature (can\'t transfer IP that doesn\'t exist in a Blueprint).',
    upstreamSections: ['deliverables', 'maturity_level', 'reward_structure'],
    downstreamSections: [],
  },
  hook: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE FIRST IMPRESSION — solvers see this first. 3 seconds to decide if they read further. Must communicate the "so what" — why THIS challenge is worth their time over alternatives.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables', 'reward_structure'],
    downstreamSections: [],
  },
  visibility: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE FAIRNESS SETTING — anonymous evaluation reduces bias but prevents team assessment. Named visibility enables credential review but introduces institutional bias.',
    upstreamSections: ['solver_expertise', 'eligibility'],
    downstreamSections: [],
  },
  domain_tags: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE DISCOVERY ENGINE — how solvers find this challenge. Wrong tags = invisible to the right solvers. Generic tags = drowned in noise.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables', 'solution_type'],
    downstreamSections: [],
  },
};

/* ── CURRENCY_TO_GEOGRAPHY: Infer geography from currency ── */

const CURRENCY_TO_GEOGRAPHY: Record<string, string> = {
  USD: 'North America (United States)',
  EUR: 'European Union',
  GBP: 'United Kingdom',
  INR: 'India',
  AED: 'United Arab Emirates / Gulf Region',
  SGD: 'Singapore / Southeast Asia',
  AUD: 'Australia / Oceania',
  CAD: 'Canada',
  JPY: 'Japan',
  CNY: 'China',
  BRL: 'Brazil / Latin America',
  ZAR: 'South Africa',
  CHF: 'Switzerland',
  SEK: 'Scandinavia',
  KRW: 'South Korea',
};

/**
 * Build the Context Intelligence block that activates LLM's trained knowledge.
 * This is NOT about rules — it's about UNLOCKING what the LLM already knows.
 */
export function buildContextIntelligence(
  challengeData: any,
  clientContext: any,
  orgContext?: any,
): string {
  const orgName = orgContext?.orgName || '(not specified)';
  const websiteUrl = orgContext?.websiteUrl;
  const linkedinUrl = orgContext?.linkedinUrl;
  const country = orgContext?.hqCountry || '(infer from currency)';
  const city = orgContext?.hqCity;
  const orgType = orgContext?.orgType || 'Enterprise';
  const primaryIndustry = orgContext?.industries?.find((i: any) => i.isPrimary)?.name
    || (Array.isArray(challengeData.domain_tags) && challengeData.domain_tags.length > 0 ? challengeData.domain_tags[0] : '(infer from problem statement)');

  const currency = challengeData.currency_code || clientContext?.currency || 'USD';
  const CURRENCY_GEO: Record<string, string> = { USD:'United States', EUR:'European Union', GBP:'United Kingdom', INR:'India', AED:'UAE/Gulf', SGD:'Singapore', AUD:'Australia', JPY:'Japan', CNY:'China', CAD:'Canada', BRL:'Brazil', ZAR:'South Africa', CHF:'Switzerland', KRW:'South Korea' };
  const geography = orgContext?.hqCountry || CURRENCY_GEO[currency] || 'Global';

  const opModel = challengeData.operating_model || 'marketplace';
  const maturity = clientContext?.maturityLevel || challengeData.maturity_level || 'not set';
  const complexity = clientContext?.complexityLevel || challengeData.complexity_level || 'not set';
  const solutionType = clientContext?.solutionType || challengeData.solution_type || 'not set';

  const tagline = orgContext?.tagline;
  const twitterUrl = orgContext?.twitterUrl;
  const functionalAreas = orgContext?.functionalAreas;

  return `
## CONTEXT INTELLIGENCE — KNOW THE SEEKER, KNOW THE DOMAIN

### ORGANIZATION (THE SEEKER — "WE" IN ALL CONTENT)
- **We are**: ${orgName}${orgContext?.tradeBrand ? ` (${orgContext.tradeBrand})` : ''} — ${orgType}${orgContext?.isEnterprise ? ' (Enterprise)' : ''}
${tagline ? `- **Our tagline**: "${tagline}"` : ''}
${orgContext?.orgDescription ? `- **About us**: ${orgContext.orgDescription.substring(0, 400)}` : ''}
${websiteUrl ? `- **Website**: ${websiteUrl}` : ''}
${linkedinUrl ? `- **LinkedIn**: ${linkedinUrl}` : ''}
${twitterUrl ? `- **Twitter/X**: ${twitterUrl}` : ''}
- **HQ**: ${city ? city + ', ' : ''}${geography}
${orgContext?.annualRevenue ? `- **Revenue**: ${orgContext.annualRevenue}` : ''}
${orgContext?.employeeCount ? `- **Team**: ${orgContext.employeeCount}` : ''}
${functionalAreas?.length ? `- **Functions**: ${functionalAreas.join(', ')}` : ''}
- **Industry**: ${primaryIndustry}

${websiteUrl || orgName !== '(not specified)' ? `**YOU KNOW THIS ORGANIZATION** from your training (website, LinkedIn, press, industry reports). Use that knowledge:
- What do we do? Core products/services? Market position? Key competitors?
- Technology stack, infrastructure, strategic priorities?
- Regulatory environment in ${geography}?
GUARDRAIL: Only use what you confidently know. Never fabricate org-specific claims.` : ''}

### GEOGRAPHY: ${geography}
You KNOW: data privacy laws, industry regulations for ${primaryIndustry}, tech infrastructure maturity, talent market, business culture norms. Reference SPECIFIC regulations for ${geography}, not generic advice. Currency: ${currency}.

### INDUSTRY: ${primaryIndustry}
You KNOW: standard KPIs, benchmarks, frameworks, competitive dynamics, technology adoption curves, typical project budgets/timelines. Benchmark THIS challenge against industry norms.

### OPERATING MODEL: ${opModel.toUpperCase()}
${opModel === 'aggregator' ? 'Internal Challenge Creator. May use insider jargon. Budget flexible. Review for external solver accessibility.' : 'AM/CA pre-defined parameters. Budget constraints MUST be respected. Challenge must be 100% self-contained for open competitive submissions.'}

### CHALLENGE PROFILE: ${solutionType} | ${maturity} | ${complexity}
${maturity === 'BLUEPRINT' || maturity === 'blueprint' ? 'Blueprint = strategic documents. Focus on framing and stakeholder alignment.' : maturity === 'POC' || maturity === 'poc' ? 'POC = working prototype. Focus on feasibility, data, demo-readiness.' : maturity === 'PILOT' || maturity === 'pilot' ? 'Pilot = production deployment. Focus on scalability, security, SLAs, operations.' : 'Assess depth from deliverables.'}

### HOW TO APPLY THIS KNOWLEDGE:

1. **In COMMENTS**: When you identify an issue, don't just say "this needs improvement." Say WHY it's a problem using your domain knowledge. Example: "In ${geography}'s ${primaryIndustry} sector, [specific regulatory requirement] means this deliverable needs [specific addition]."

2. **In BEST PRACTICES**: Don't cite generic frameworks. Apply them to THIS challenge. Example: "For a ${maturity}-level ${solutionType} challenge in ${primaryIndustry}, the standard approach is [specific methodology]."

3. **In SUGGESTIONS**: Recommend improvements that a principal consultant in this domain would make. Not "add more detail" but "add a data quality assessment framework covering completeness, accuracy, and timeliness metrics."

4. **In WARNINGS**: Flag domain-specific risks. "In my experience with ${maturity} ${primaryIndustry} challenges, the #1 failure mode is [specific risk]. This challenge should address it by [specific mitigation]."

**COMPETITIVE INTELLIGENCE**: Benchmark THIS challenge against similar challenges on InnoCentive/Wazoku, HeroX, Kaggle, TopCoder. Is the scope, timeline, reward, and deliverables competitive?
`;
}



/**
 * Sanitize AI suggestion for table-format sections.
 * Extracts a JSON array from prose/markdown if the LLM wraps it.
 */
export function sanitizeTableSuggestion(raw: string): string {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '').trim();

  // Direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
    if (parsed?.items && Array.isArray(parsed.items)) return JSON.stringify(parsed.items);
    if (parsed?.rows && Array.isArray(parsed.rows)) return JSON.stringify(parsed.rows);
    if (parsed?.criteria && Array.isArray(parsed.criteria)) return JSON.stringify(parsed.criteria);
  } catch { /* not valid JSON directly */ }

  // Regex extract first JSON array from prose
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      // Attempt repair: fix trailing commas and unbalanced brackets
      let repaired = match[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');
      const open = (repaired.match(/\[/g) || []).length;
      const close = (repaired.match(/\]/g) || []).length;
      for (let i = close; i < open; i++) repaired += ']';
      try { JSON.parse(repaired); return repaired; } catch { /* give up */ }
    }
  }

  // Return raw if extraction fails — frontend will handle fallback
  return raw;
}

/* ── Section display name helper (Deno-compatible) ── */

const SECTION_DISPLAY_NAMES: Record<string, string> = {
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

function getSectionName(key: string): string {
  return SECTION_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Check if config has structured Phase 6 data ── */

function hasStructuredData(config: SectionConfig): boolean {
  const qc = config.quality_criteria;
  const cr = config.cross_references;
  const mdc = config.master_data_constraints;
  return (
    (Array.isArray(qc) && qc.length > 0) ||
    (Array.isArray(cr) && cr.length > 0) ||
    (Array.isArray(mdc) && mdc.length > 0)
  );
}

/**
 * Get effective quality criteria for a section — DB config or fallback defaults.
 */
function getEffectiveQualityCriteria(config: SectionConfig): any[] {
  const dbCriteria = config.quality_criteria;
  if (Array.isArray(dbCriteria) && dbCriteria.length > 0) return dbCriteria;
  return DEFAULT_QUALITY_CRITERIA[config.section_key] ?? [];
}

/* ── Structured batch prompt (Phase 6) — Pass 1: Analysis Only ── */

/**
 * Build a structured 5-layer prompt for a batch of sections.
 * Used when configs have Phase 6 JSONB fields populated.
 * NOTE: This prompt is for Pass 1 (Analysis). It does NOT ask for suggestions.
 * Suggestions are generated in Pass 2 with a separate, focused prompt.
 */
export function buildStructuredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  clientContext?: any,
  challengeSections?: Record<string, any>,
): string {
  const firstConfig = configs[0];
  const parts: string[] = [];

  // Layer 1: Platform preamble
  parts.push(firstConfig.platform_preamble?.trim() || DEFAULT_PLATFORM_PREAMBLE);
  parts.push('');

  // Intelligence Directive (Change 6) — injected after preamble, before output format
  parts.push(INTELLIGENCE_DIRECTIVE);
  parts.push('');

  // Proportionality Anchor — calibrates AI output scale to budget/maturity/timeline
  parts.push(buildProportionalityAnchor(clientContext));
  parts.push('');

  // FIX 6 + GAP 3: Domain-specific framework injection (scans tags, problem_statement, scope)
  {
    const frameworks = detectDomainFrameworks(
      challengeSections?.domain_tags,
      challengeSections?.problem_statement,
      challengeSections?.scope,
    );
    if (frameworks.length > 0) {
      parts.push(`## DOMAIN-SPECIFIC FRAMEWORKS FOR THIS CHALLENGE`);
      parts.push(`Based on the challenge domain, reference these frameworks in your comments and suggestions where applicable:`);
      parts.push(frameworks.join(', '));
      parts.push('');
    }
  }

  parts.push(`## OUTPUT FORMAT (PASS 1 — ANALYSIS ONLY)
For each section, return a JSON object via the review_sections function with:

1. **status**: "pass" | "warning" | "needs_revision" | "generated"
   - "pass" = content is good. STILL include 1-2 "strength" comments confirming what works well.
   - "warning" = minor issues that should be improved.
   - "needs_revision" = critical errors that must be fixed.
   - "generated" = section was empty, new content will be generated in the next step.

2. **comments**: Array of objects, each with:
   - "text": Clear, specific feedback referencing challenge details
   - "type": One of:
     - "error" — Must be fixed before publication. References specific quality criterion violated.
     - "warning" — Should be improved. Explains what would make it stronger.
     - "suggestion" — Nice-to-have enhancement. Optional improvement.
     - "best_practice" — Industry standard, framework reference, or analyst insight. Cite the source where possible.
     - "strength" — What is already good. Positive reinforcement with specific praise. REQUIRED for "pass" sections.
   - "field" (optional): Specific field this comment applies to
   - "reasoning" (optional): Why this matters, referencing other sections

3. **guidelines**: 1-3 domain-specific guidelines for this section.
   - MUST reference THIS challenge's domain, maturity, and solution type.
   - MUST NOT be generic (no "ensure quality" or "follow best practices").

4. **cross_section_issues**: Array of inconsistencies found with other sections.
   - Only include genuine conflicts.
   - Each must specify the related_section, the issue, and a suggested_resolution.

5. **solver_perspective_issues**: For each section, consider: "If I am a globally distributed solver seeing this challenge for the first time, with NO internal context about the seeker organization..."
   - What information is missing that I would need to decide whether to participate?
   - What terms or references are unclear or assume insider knowledge?
   - What is the risk/reward ratio from the solver's perspective — is this worth my time?
   - Where would I get stuck during execution because a requirement is ambiguous?
   
   Express these as comments with type "warning" and prefix the text with "[SOLVER VIEW]". These are among the most valuable comments — they catch problems that insiders are blind to.

IMPORTANT: Do NOT include a "suggestion" field. Your ONLY job in this pass is to provide thorough, specific analysis. Improved content will be generated in a separate step based on your comments.
Focus 100% of your attention on producing the most accurate, specific, and actionable analysis possible.
`);
  parts.push('');

  // Per-section (Layers 2-4)
  configs.forEach((config, i) => {
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key] || '';

    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
    parts.push(`Format: ${fmt}. ${ebInstr || fmtInstr}`);

    // Wave context injection
    const waveCtx = SECTION_WAVE_CONTEXT[config.section_key];
    if (waveCtx) {
      parts.push(`POSITION: Wave ${waveCtx.wave} (${waveCtx.waveName}).`);
      parts.push(`STRATEGIC ROLE: ${waveCtx.strategicRole}`);
      if (waveCtx.upstreamSections.length > 0) {
        parts.push(`ESTABLISHED BY EARLIER SECTIONS (rely on these): ${waveCtx.upstreamSections.join(', ')}`);
      }
      if (waveCtx.downstreamSections.length > 0) {
        parts.push(`SECTIONS THAT DEPEND ON THIS (changes here cascade to): ${waveCtx.downstreamSections.join(', ')}`);
      }
    }

    // FIX 5: Quality criteria — use effective (DB or default fallback)
    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      parts.push('Quality criteria to assess:');
      for (const c of criteria as any[]) {
        let line = `- **${c.name}** (${c.severity}): ${c.description}`;
        if (c.crossReferences?.length > 0) {
          line += ` Cross-check: ${c.crossReferences.map((k: string) => getSectionName(k)).join(', ')}.`;
        }
        parts.push(line);
      }
    }

    // Master data constraints (Layer 2)
    const constraints = config.master_data_constraints ?? [];
    if (constraints.length > 0) {
      for (const c of constraints as any[]) {
        const opts = masterDataOptions?.[config.section_key];
        if (opts?.length) {
          parts.push(`Allowed values for ${c.fieldName}: [${opts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]${c.enforceStrictly ? ' (STRICT)' : ''}`);
        }
      }
    } else {
      // Fallback: inject master data from old mechanism
      const opts = masterDataOptions?.[config.section_key];
      if (opts?.length) {
        parts.push(`Allowed values: [${opts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]`);
        parts.push(`You MUST only suggest values from this allowed list. Do not invent new codes.`);
      }
    }

    // Computation rules (Layer 2)
    const rules = config.computation_rules ?? [];
    for (const rule of rules as string[]) {
      const todaysDate = clientContext?.todaysDate || new Date().toISOString().split('T')[0];
      parts.push(`Rule: ${rule.replace(/\{\{todaysDate\}\}/g, todaysDate)}`);
    }

    // Content template (Layer 2)
    const templates = config.content_templates;
    if (templates && clientContext?.maturityLevel) {
      const ml = clientContext.maturityLevel.toLowerCase();
      const template = templates[ml];
      if (template) parts.push(`Template (${clientContext.maturityLevel}): ${template}`);
    }

    // Research directives (Layer 3)
    const searches = config.web_search_queries ?? [];
    if (searches.length > 0) {
      for (const s of searches as any[]) {
        const domain = clientContext?.subDomain || clientContext?.category || 'enterprise';
        const rendered = s.queryTemplate
          ?.replace(/\{\{domain\}\}/g, domain)
          ?.replace(/\{\{maturityLevel\}\}/g, clientContext?.maturityLevel || 'blueprint');
        parts.push(`Research: ${s.purpose} — "${rendered}" (${s.when})`);
      }
    }

    const frameworks = config.industry_frameworks ?? [];
    if (frameworks.length > 0) {
      parts.push(`Frameworks: ${(frameworks as string[]).join(', ')}`);
    }

    // Analyst sources (Fix 4)
    const sources = config.analyst_sources ?? [];
    if (sources.length > 0) {
      parts.push(`Analyst sources to cite: ${(sources as string[]).join(', ')}`);
    }

    // IP Model selection guidelines
    if (config.section_key === 'ip_model') {
      parts.push(`IP MODEL SELECTION GUIDELINES — your comments MUST provide reasoning for the recommended model:`);
      parts.push(`- "IP-EA" (Exclusive Assignment): Recommend when deliverables include proprietary IP.`);
      parts.push(`- "IP-NEL" (Non-Exclusive License): Recommend when the solution methodology has broad applicability.`);
      parts.push(`- "IP-EL" (Exclusive License): Recommend when seeker needs exclusive usage but solver retains ownership.`);
      parts.push(`- "IP-JO" (Joint Ownership): Recommend for collaborative R&D.`);
      parts.push(`- "IP-NONE" (No IP Transfer): Recommend for advisory/consulting challenges.`);
    }

    // Supervisor overrides (Layer 4)
    if (config.section_description) parts.push(`Description: ${config.section_description}`);
    if (config.review_instructions) parts.push(`Instructions: ${config.review_instructions}`);
    if (config.dos) parts.push(`Do: ${config.dos}`);
    if (config.donts) parts.push(`Don't: ${config.donts}`);
    parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
    if (config.required_elements.length > 0) {
      parts.push(`Required: ${config.required_elements.join(', ')}`);
    }
    if (config.example_good) parts.push(`Good: ${config.example_good}`);
    if (config.example_poor) parts.push(`Poor: ${config.example_poor}`);

    // Structured examples (Layer 4)
    const examples = config.supervisor_examples ?? [];
    for (const ex of examples as any[]) {
      parts.push(`${ex.type === 'good' ? '✅' : '❌'}: ${ex.content} — ${ex.explanation}`);
    }

    parts.push('');
  });

  // Cross-referenced section content (Layer 5)
  if (challengeSections) {
    const allCrossRefs = new Set<string>();
    for (const config of configs) {
      for (const ref of (config.cross_references ?? []) as string[]) {
        allCrossRefs.add(ref);
      }
    }
    if (allCrossRefs.size > 0) {
      const injected: string[] = [];
      for (const refKey of allCrossRefs) {
        const content = challengeSections[refKey];
        if (content) {
          const serialized = typeof content === 'string' ? content : JSON.stringify(content);
          injected.push(`#### ${getSectionName(refKey)}\n${serialized}`);
        }
      }
      if (injected.length > 0) {
        parts.push('### Cross-Referenced Section Content');
        parts.push(injected.join('\n\n'));
        parts.push('');
      }
    }
  }

  // Strategic Coherence Check — whole-challenge assessment
  parts.push(`
## STRATEGIC COHERENCE CHECK (Apply after reviewing individual sections)
After reviewing each section individually, step back and assess the challenge AS A WHOLE:

1. **NARRATIVE COHERENCE**: Does the challenge tell a logical story? Problem → Root Causes → Scope → Deliverables → Outcomes → Evaluation → Reward. If any step doesn't flow from the previous, flag it as a cross_section_issue.

2. **AMBITION-CAPABILITY MATCH**: Is what's being asked (deliverables, outcomes) achievable by the target solver profile (expertise, eligibility) within the constraints (timeline, budget)? Flag mismatches.

3. **SOLVER ATTRACTIVENESS**: Would a top-tier solver in this domain choose THIS challenge over alternatives? Consider: reward/effort ratio, IP terms fairness, timeline realism, problem interestingness. If the answer is "probably not," flag as a cross_section_issue with specific improvement suggestions.

4. **PUBLICATION READINESS**: Could this challenge be published TODAY and attract quality submissions? Or are there blockers? Rate overall readiness as a final cross_section_issue: { "related_section": "overall", "issue": "Publication readiness assessment: [READY/NEEDS_WORK/NOT_READY] — [specific reasoning]", "suggested_resolution": "..." }
`);

  parts.push('Every comment MUST use the {text, type} object format. Each distinct issue MUST be a separate comment.');
  parts.push('For "pass" sections: include 1-2 "strength" type comments — never return empty comments. Curators need confirmation the AI reviewed the section.');
  parts.push('For master-data-backed sections, your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}

/* ── Legacy batch prompt (backward compatible) — Pass 1: Analysis Only ── */

export function buildConfiguredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
): string {
  const contextLabel = ROLE_CONTEXT_LABELS[roleContext] || 'challenge section';

  const parts: string[] = [];
  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');

  // Intelligence Directive (Change 6)
  parts.push(INTELLIGENCE_DIRECTIVE);
  parts.push('');

  parts.push(`For each section below, provide ANALYSIS ONLY:
- status: "pass" (good — include 1-2 "strength" comments), "warning" (improvable), or "needs_revision" (errors found)
- comments: array of objects with "text" (string) and "type" (one of: "error", "warning", "suggestion", "best_practice", "strength"). For pass sections, include strength comments.
- guidelines: 1-3 domain-specific guidelines for this section

Do NOT include a "suggestion" field. Focus entirely on thorough, specific analysis. Improved content will be generated separately based on your comments.`);
  parts.push('');

  configs.forEach((config, i) => {
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key] || '';

    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
    parts.push(`Format: ${fmt}. ${ebInstr || fmtInstr}`);

    // Wave context injection (legacy path)
    const waveCtx = SECTION_WAVE_CONTEXT[config.section_key];
    if (waveCtx) {
      parts.push(`POSITION: Wave ${waveCtx.wave} (${waveCtx.waveName}). STRATEGIC ROLE: ${waveCtx.strategicRole}`);
    }

    // FIX 5: Inject default quality criteria for legacy path too
    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      parts.push('Quality criteria:');
      for (const c of criteria as any[]) {
        let line = `- **${c.name}** (${c.severity}): ${c.description}`;
        if (c.crossReferences?.length > 0) {
          line += ` Cross-check: ${c.crossReferences.map((k: string) => getSectionName(k)).join(', ')}.`;
        }
        parts.push(line);
      }
    }

    // Inject master data allowed values
    const opts = masterDataOptions?.[config.section_key];
    if (opts?.length) {
      parts.push(`Allowed values: [${opts.map(o => `"${o.code}" (${o.label})`).join(', ')}]`);
      parts.push(`You MUST only suggest values from this allowed list. Do not invent new codes.`);
    }

    // IP Model selection guidelines
    if (config.section_key === 'ip_model') {
      parts.push(`IP MODEL SELECTION GUIDELINES — your comments MUST provide reasoning for the recommended model:`);
      parts.push(`- "IP-EA" (Exclusive Assignment): Recommend when deliverables include proprietary IP (algorithms, designs, patents) and the seeker will commercialize exclusively.`);
      parts.push(`- "IP-NEL" (Non-Exclusive License): Recommend when the solution methodology has broad applicability and the seeker only needs usage rights (consulting frameworks, analytical models).`);
      parts.push(`- "IP-EL" (Exclusive License): Recommend when the seeker needs exclusive usage but the solver retains underlying ownership (specialized software, patentable inventions).`);
      parts.push(`- "IP-JO" (Joint Ownership): Recommend for collaborative R&D where both parties contribute significant IP (co-developed technology, joint research).`);
      parts.push(`- "IP-NONE" (No IP Transfer): Recommend for advisory/consulting challenges producing recommendations or assessments — no tangible IP is created.`);
      parts.push(`Analyze the challenge deliverables, maturity level, and reward structure to justify your recommendation. Comments should explain WHY a specific IP model fits this challenge.`);
    }

    if (config.section_description) parts.push(`Description: ${config.section_description}`);
    if (config.review_instructions) parts.push(`Instructions: ${config.review_instructions}`);
    if (config.dos) parts.push(`Do: ${config.dos}`);
    if (config.donts) parts.push(`Don't: ${config.donts}`);
    parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
    if (config.required_elements.length > 0) {
      parts.push(`Required: ${config.required_elements.join(', ')}`);
    }
    if (config.example_good) parts.push(`Good: ${config.example_good}`);
    if (config.example_poor) parts.push(`Poor: ${config.example_poor}`);
    parts.push('');
  });

  parts.push('Every comment MUST use the {text, type} object format. Each distinct issue MUST be a separate comment.');
  parts.push('For "pass" sections: include 1-2 "strength" type comments confirming what works well.');
  parts.push('For master-data-backed sections (eligibility, visibility, ip_model, maturity_level, complexity), your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}

/**
 * Smart prompt builder: uses structured assembly when Phase 6 data is available,
 * falls back to legacy prompt otherwise.
 */
export function buildSmartBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  clientContext?: any,
  challengeSections?: Record<string, any>,
): string {
  // Check if ANY config has structured data
  const anyStructured = configs.some(c => hasStructuredData(c));

  if (anyStructured) {
    return buildStructuredBatchPrompt(configs, roleContext, masterDataOptions, clientContext, challengeSections);
  }

  return buildConfiguredBatchPrompt(configs, roleContext, masterDataOptions);
}

/**
 * Get the format instruction string for a section key.
 * Used by Pass 2 (Rewrite) to tell the LLM what format the suggestion should be in.
 */
export function getSuggestionFormatInstruction(sectionKey: string): string {
  const fmt = SECTION_FORMAT_MAP[sectionKey] || 'rich_text';
  const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[sectionKey];
  const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
  return ebInstr || fmtInstr;
}

/**
 * Get the format type key for a section (e.g. 'rich_text', 'line_items', 'table').
 */
export function getSectionFormatType(sectionKey: string): string {
  return SECTION_FORMAT_MAP[sectionKey] || 'rich_text';
}

/* ══════════════════════════════════════════════════════════════
 * PASS 2 SYSTEM PROMPT BUILDER (Change 1)
 * Builds a section-aware system prompt with intelligence directive,
 * content templates, quality criteria, frameworks, cross-references.
 * ══════════════════════════════════════════════════════════════ */

export function buildPass2SystemPrompt(
  sectionConfigs: SectionConfig[],
  challengeContext: any,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
): string {
  let prompt = `You are a principal consultant at a Big4 firm rewriting challenge content to publication standard. You have 15+ years of experience in this challenge's domain.

YOUR REWRITE PHILOSOPHY:
You are not fixing text. You are CRAFTING a challenge specification that will attract the best solvers in the world to produce excellent solutions. Every sentence must earn its place.

THINK LIKE THREE PEOPLE SIMULTANEOUSLY:
1. **THE SEEKER**: "Will this challenge get me the solution I need? Are my requirements clearly expressed? Will evaluators be able to identify the best submission?"
2. **THE SOLVER**: "Do I understand what's expected? Do I have enough context to start? Is the reward worth my time? Are the deliverables specific enough that I won't face scope disputes?"
3. **THE EVALUATOR**: "Can I score submissions objectively? Do criteria map to deliverables? Is the scoring method feasible? Will I know a good submission when I see one?"

REWRITE RULES:
1. ADDRESS every flagged issue. Each issue = a visible, specific improvement.
2. ELEVATE beyond fixing: Add domain-specific depth that a principal consultant would naturally include. Benchmarks, frameworks, standard methodologies — applied to THIS challenge, not generic.
3. PRESERVE seeker intent. Human-authored content that wasn't flagged must remain untouched.
4. BE CONCRETE: Replace every vague statement with a specific one backed by your domain knowledge.
5. MATCH FORMAT exactly. HTML → HTML. JSON → JSON. Don't convert.
6. PRODUCTION-READY: Directly publishable. No "[TBD]", no "as appropriate", no "etc."

VOICE RULE: All rewritten content uses first-person plural ("we", "our") from the seeker's perspective. Exception: evaluation_criteria and submission_guidelines use neutral procedural voice. NEVER write "the organization" or "the seeker" in challenge content.

QUANTIFICATION MANDATE:
Every claim MUST include a number, metric, or specific reference. If the seeker provided data, use it. If not, use your domain knowledge for typical industry ranges.

- WRONG: "This will improve efficiency."
- RIGHT: "We expect this to reduce processing time from 48 hours to under 4 hours (90%+ improvement)."

- WRONG: "The solution should handle high volumes."
- RIGHT: "The solution must process 10,000 transactions per second at P99 latency under 200ms."

- WRONG: "Experienced professionals required."
- RIGHT: "Minimum 5 years of experience in enterprise data engineering, with proven delivery of ETL pipelines processing 1TB+ daily volumes."

If you cannot find or infer a specific number, use a benchmarked range: "Industry benchmarks suggest 8-12 weeks for POC-level implementations of this complexity."

SELF-VALIDATION (apply before returning EACH section):
Before returning your rewritten content, mentally verify:
1. ✅ Did I address EVERY error, warning, and suggestion? (Re-read the issues list)
2. ✅ Did I preserve all identified strengths?
3. ✅ Did I resolve all cross-section issues involving this section?
4. ✅ Does the content use "we/our" voice? (except evaluation_criteria/submission_guidelines)
5. ✅ Would a solver from outside this industry understand every sentence on first read?
6. ✅ Does the format EXACTLY match the required output (HTML/JSON/plain text)?
7. ✅ Are there any vague statements I can make more specific with domain knowledge?
8. ✅ For AI-ONLY reference materials — did I embed the data directly (not reference the document)?

If ANY check fails, revise before returning.

${buildProportionalityAnchor(challengeContext)}

QUALITY BAR EXAMPLES (the standard to aim for):
- Bad problem statement: "We need better data analytics to improve decision making."
- Good problem statement: "Our supply chain planning team makes demand forecasts using 18-month-old statistical models in Excel, resulting in 23% forecast error (vs. industry benchmark of 12-15%). This drives $4.2M in annual excess inventory costs and 340 stockout events per quarter across our 12 distribution centers."

- Bad deliverable: "Working prototype"
- Good deliverable: "Demand forecasting API (REST, OpenAPI 3.0 documented) accepting SKU-level historical sales data (CSV/JSON), returning 13-week rolling forecasts with confidence intervals. Must process 10K SKUs in under 60 seconds. Includes Jupyter notebook demonstrating model training pipeline and accuracy benchmarks against the provided test dataset."

INTELLIGENCE DIRECTIVE (CRITICAL):
You are NOT a text editor applying find-and-replace. You are a principal consultant who KNOWS this domain.
- APPLY domain expertise: standard frameworks, typical benchmarks, common pitfalls, regulatory considerations — but ONLY for THIS challenge's domain.
- CITE analyst references where configured below.
- NEVER invent specific numbers, dates, system names, or specs not in the challenge context.
- NEVER add content about domains unrelated to this challenge.

CHALLENGE CONTEXT:
- Maturity: ${challengeContext?.maturityLevel || 'not set'}
- Solution type: ${challengeContext?.solutionType || 'not set'}
- Seeker: ${challengeContext?.seekerSegment || 'not set'}
- Complexity: ${challengeContext?.complexityLevel || 'not set'}
- Operating Model: ${challengeContext?.operatingModel || 'marketplace'}
- Currency: ${challengeContext?.currency || 'USD'}
- Today: ${challengeContext?.todaysDate || new Date().toISOString().split('T')[0]}
`;

  // FIX 6: Domain framework injection for Pass 2
  const domainTags = challengeContext?.sections?.domain_tags || challengeContext?.domain_tags;
  const domainFrameworks = detectDomainFrameworks(
    domainTags,
    challengeContext?.problem_statement || challengeContext?.sections?.problem_statement,
    challengeContext?.scope || challengeContext?.sections?.scope,
  );
  if (domainFrameworks.length > 0) {
    prompt += `\nDOMAIN-SPECIFIC FRAMEWORKS for this challenge: ${domainFrameworks.join(', ')}. Reference these in your rewrites where applicable.\n`;
  }

  // Per-section enrichment
  for (const config of sectionConfigs) {
    if (!config) continue;
    prompt += `\n========== SECTION: ${config.section_key} ==========\n`;

    // Content template
    const templates = config.content_templates;
    if (templates && challengeContext?.maturityLevel) {
      const ml = challengeContext.maturityLevel.toLowerCase();
      const template = templates[ml];
      if (template) {
        prompt += `\nSTRUCTURE TEMPLATE (${challengeContext.maturityLevel}):\n${template}\nYour rewrite MUST follow this structure.\n`;
      }
    }

    // FIX 5: Quality criteria — use effective (DB or default fallback)
    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      prompt += `\nQUALITY STANDARDS:\n`;
      for (const c of criteria as any[]) {
        prompt += `- ${c.name} (${c.severity}): ${c.description}\n`;
      }
    }

    // Frameworks + sources
    const frameworks = config.industry_frameworks ?? [];
    if (frameworks.length > 0) {
      prompt += `\nFRAMEWORKS: ${(frameworks as string[]).join(', ')}\n`;
    }
    const sources = config.analyst_sources ?? [];
    if (sources.length > 0) {
      prompt += `\nANALYST SOURCES to cite: ${(sources as string[]).join(', ')}\n`;
    }

    // Good example (calibration target) — Gap 5: fallback to SECTION_QUALITY_EXEMPLARS
    if (config.example_good) {
      prompt += `\nEXCELLENT EXAMPLE (aim for this quality):\n${config.example_good}\n`;
    } else if (SECTION_QUALITY_EXEMPLARS[config.section_key]) {
      prompt += `\nEXCELLENT EXAMPLE (aim for this quality):\n${SECTION_QUALITY_EXEMPLARS[config.section_key]}\n`;
    }

    // Supervisor DOs
    if (config.dos) {
      prompt += `\nINSTRUCTIONS: ${config.dos}\n`;
    }

    // Per-section format instruction (ensures Pass 2 knows exact output shape)
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key];
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const formatRule = ebInstr || fmtInstr;
    if (formatRule) {
      prompt += `\nOUTPUT FORMAT: ${formatRule}\n`;
    }

    // Inject master data allowed values for this section (CRITICAL for eligibility, visibility, etc.)
    const sectionOpts = masterDataOptions?.[config.section_key];
    if (sectionOpts?.length) {
      prompt += `\nALLOWED VALUES for ${config.section_key}: [${sectionOpts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]\nYou MUST only output codes from this list. Do NOT invent new codes.\n`;
    }
  }

  // Table-format output reinforcement
  prompt += `\n========== TABLE FORMAT RULE ==========
For sections with table format (evaluation_criteria, success_metrics_kpis, data_resources_provided, affected_stakeholders, legal_docs), output a JSON ARRAY of objects using the exact column keys.
Example for success_metrics_kpis: [{"kpi":"Model Accuracy","baseline":"N/A","target":"F1 > 0.85","measurement_method":"Cross-validation","timeframe":"8 weeks"}]
Do NOT output markdown tables or prose for table-format sections. Only valid JSON arrays.\n`;

  // Cross-referenced section content — now uses SECTION_DEPENDENCIES from index.ts injected via challengeContext.sections
  const allCrossRefs = new Set<string>();
  for (const config of sectionConfigs) {
    if (!config) continue;
    for (const ref of (config.cross_references ?? []) as string[]) {
      allCrossRefs.add(ref);
    }
  }
  if (allCrossRefs.size > 0 && challengeContext?.sections) {
    prompt += `\n========== RELATED SECTIONS (for consistency) ==========\n`;
    for (const refKey of allCrossRefs) {
      const refContent = challengeContext.sections[refKey];
      if (refContent && typeof refContent === 'string' && refContent.trim().length > 0) {
        prompt += `\n### ${getSectionName(refKey)}:\n${refContent.substring(0, 2000)}\n`;
      } else if (refContent && typeof refContent === 'object') {
        const serialized = JSON.stringify(refContent);
        if (serialized.length > 0) {
          prompt += `\n### ${getSectionName(refKey)}:\n${serialized.substring(0, 2000)}\n`;
        }
      }
    }
  }

  return prompt;
}
