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

/** Extended Brief subsection-specific format instructions */
const EXTENDED_BRIEF_FORMAT_INSTRUCTIONS: Record<string, string> = {
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
};

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

/* ── Intelligence Directive (Change 6) ── */

const INTELLIGENCE_DIRECTIVE = `
## USE YOUR DOMAIN EXPERTISE

You are NOT a passive checklist auditor. You are a senior consultant who KNOWS this domain.

1. DOMAIN BEST PRACTICES: You KNOW standard KPIs, typical benchmarks, common pitfalls. When reviewing a supply chain challenge, reference MTBF/MTTR. When reviewing cybersecurity, reference NIST CSF 2.0. USE this knowledge in best_practice comments.

2. INDUSTRY BENCHMARKS: You KNOW that similar challenges on InnoCentive/HeroX typically offer $X-$Y rewards, take 8-14 weeks for POCs, and produce 15-40 submissions. CITE these in context.

3. COMMON PITFALLS: WARN about domain-specific risks. Enterprise integration POCs fail 40% of the time due to auth gaps. ML challenges fail when training data doesn't match production distribution. Be specific.

4. FRAMEWORK APPLICATION: Don't just NAME frameworks. APPLY them. If TOGAF is relevant, check whether deliverables follow ADM phases. If Design Thinking applies, check whether the problem statement is user-centered.

GUARDRAILS:
- NEVER invent specific numbers, costs, system names, or specs not in the challenge context.
- NEVER fabricate analyst quotes or regulatory citations.
- Domain knowledge adds CONTEXT and DEPTH — not fabricated specifics about THIS organization.
- THE TEST: "Would a Deloitte senior consultant know this from experience?" Yes → include. Requires insider knowledge → don't.
`;



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

    // Quality criteria (Layer 2)
    const criteria = config.quality_criteria ?? [];
    if (criteria.length > 0) {
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
  let prompt = `You are a senior management consultant rewriting challenge section content. Your output must meet KPMG/PwC/EY/Deloitte quality — specific, measurable, actionable, grounded in domain expertise.

REWRITE RULES:
- Address EVERY error, warning, and suggestion comment. Each issue = a visible change.
- Do NOT add content not supported by challenge context or your domain expertise.
- Do NOT remove content not flagged in comments.
- Match the SAME FORMAT as the original (HTML, JSON array, plain text).
- Output PRODUCTION-READY content — directly usable, not a draft.
- Output CLEAN text — use actual newlines, no literal \\n, no escaped quotes.

INTELLIGENCE DIRECTIVE (CRITICAL):
You are NOT a text editor applying find-and-replace. You are a senior consultant who KNOWS this domain.
- APPLY domain expertise: If this is supply chain predictive maintenance, you KNOW vibration analysis needs baseline data, MTBF/MTTR are standard KPIs, edge deployment has latency constraints. USE that knowledge to make content richer.
- ADD industry-specific details a Deloitte consultant would include: standard frameworks, typical benchmarks, common pitfalls, regulatory considerations — but ONLY for THIS challenge's domain.
- CITE analyst references where configured below.
- NEVER invent specific numbers, dates, system names, or specs not in the challenge context.
- NEVER add content about domains unrelated to this challenge.
- THE TEST: "Would a senior Deloitte consultant in this domain know this from experience?" If yes, include. If it requires insider knowledge of this specific org, don't.

CHALLENGE CONTEXT:
- Maturity: ${challengeContext?.maturityLevel || 'not set'}
- Solution type: ${challengeContext?.solutionType || 'not set'}
- Seeker: ${challengeContext?.seekerSegment || 'not set'}
- Complexity: ${challengeContext?.complexityLevel || 'not set'}
- Today: ${challengeContext?.todaysDate || new Date().toISOString().split('T')[0]}
`;

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

    // Quality criteria
    const criteria = config.quality_criteria;
    if (criteria && Array.isArray(criteria) && criteria.length > 0) {
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

    // Good example (calibration target)
    if (config.example_good) {
      prompt += `\nEXCELLENT EXAMPLE (aim for this quality):\n${config.example_good}\n`;
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

  // Cross-referenced section content
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
