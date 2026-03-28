/**
 * promptTemplate.ts — Shared prompt template for AI Review edge function.
 *
 * SYNC: This template logic must match
 * src/lib/aiReviewPromptTemplate.ts
 * If you update the prompt structure here, update the frontend copy too.
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
  date: 'Output: a single ISO date string YYYY-MM-DD. Calculate based on phase_schedule end dates, deliverables count, scope complexity, and effort level. The deadline should be the end date of the last phase in the schedule, or if no schedule exists, estimate based on scope and complexity (low=60d, medium=90d, high=120d, expert=180d from today). Never output null if phase_schedule data is available.',
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
  reward_structure: 'table',
  phase_schedule: 'schedule_table',
  complexity: 'complexity_assessment',
  ip_model: 'checkbox_single',
  maturity_level: 'checkbox_single',
  eligibility: 'checkbox_multi',
  visibility: 'checkbox_multi',
  hook: 'rich_text',
  submission_deadline: 'date',
  challenge_visibility: 'select',
  
  domain_tags: 'tag_input',
  legal_docs: 'table',
  escrow_funding: 'structured_fields',
  solver_expertise: 'custom',
  // Extended Brief subsections
  context_and_background: 'rich_text',
  root_causes: 'line_items',
  affected_stakeholders: 'table',
  current_deficiencies: 'line_items',
  preferred_approach: 'rich_text',
  approaches_not_of_interest: 'line_items',
};

/** Extended Brief subsection-specific format instructions */
const EXTENDED_BRIEF_FORMAT_INSTRUCTIONS: Record<string, string> = {
  root_causes: 'Output: JSON array of short phrase strings only. No sentences. No explanations. Each item is a cause label, not a description. Max 8 items.',
  affected_stakeholders: 'Output: JSON array of row objects with keys stakeholder_name, role, impact_description (max 100 chars), adoption_challenge (max 100 chars). Always populate adoption_challenge — this is the most valuable field.',
  current_deficiencies: 'Output: JSON array of current-state observation phrases. Max 10 items. Each item must be a factual observation about current state, not a wish or solution hint.',
  preferred_approach: 'If content exists, do NOT rewrite it. Produce review comments only. Set structured_output to the existing content unchanged. Always include: "This content represents the seeker\'s stated preferences and has been preserved exactly as written."',
  approaches_not_of_interest: 'Always set requires_human_input: true. Never produce items for this section. Output: { "requires_human_input": true, "comment": "This section requires explicit human input about excluded approaches." }',
};

export function buildConfiguredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
): string {
  const contextLabel = ROLE_CONTEXT_LABELS[roleContext] || 'challenge section';

  const parts: string[] = [];
  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');
  parts.push('For each section below, provide:');
  parts.push('- status: "pass" (ready — NO issues, comments MUST be an empty array), "warning" (functional but improvable — MUST have 1-3 comments), or "needs_revision" (has issues that must be fixed — MUST have 1-3 comments)');
  parts.push('- comments: actionable improvement instructions. CRITICAL: For "pass" status, comments MUST be an empty array []. Any section with comments MUST use "warning" or "needs_revision" status.');
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

  parts.push('Every comment MUST be phrased as an actionable improvement instruction.');
  parts.push('CRITICAL: Each distinct issue or suggestion MUST be a separate comment in the array. Do NOT combine multiple issues into one comment. For structured sections (deliverables, evaluation_criteria), provide one comment per issue — e.g., one comment about a missing deliverable, another about a vague deliverable.');
  parts.push('Your suggested content for each section MUST match the prescribed format — never write prose paragraphs for line_items, table, or checkbox sections.');
  parts.push('For master-data-backed sections (eligibility, visibility, ip_model, maturity_level, complexity, challenge_visibility), your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}
