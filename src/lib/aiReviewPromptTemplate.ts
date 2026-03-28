/**
 * aiReviewPromptTemplate.ts — Shared prompt template for AI Review system.
 * Used by the Preview Prompt modal in AIReviewConfigPage.
 *
 * SYNC: This template logic must match
 * supabase/functions/review-challenge-sections/promptTemplate.ts
 * If you update the prompt structure here, update the edge function copy too.
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

/**
 * Builds the configured system prompt for a single section review.
 * This is the exact prompt structure the edge function uses.
 */
export function buildConfiguredSectionPrompt(config: SectionConfig): string {
  const contextLabel = ROLE_CONTEXT_LABELS[config.role_context] || 'challenge section';

  const parts: string[] = [];

  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');

  // Section-specific instructions
  parts.push(`## Section: ${config.section_label} [${config.importance_level}]`);

  if (config.section_description) {
    parts.push(`**Description:** ${config.section_description}`);
  }

  if (config.review_instructions) {
    parts.push(`**Review Instructions:** ${config.review_instructions}`);
  }

  if (config.dos) {
    parts.push(`**Do:** ${config.dos}`);
  }

  if (config.donts) {
    parts.push(`**Don't:** ${config.donts}`);
  }

  parts.push(`**Tone:** ${config.tone}`);
  parts.push(`**Word count guidance:** ${config.min_words}–${config.max_words} words expected`);

  if (config.required_elements.length > 0) {
    parts.push(`**Required elements:** ${config.required_elements.join(', ')}`);
  }

  if (config.example_good) {
    parts.push(`**Good example:** ${config.example_good}`);
  }

  if (config.example_poor) {
    parts.push(`**Poor example:** ${config.example_poor}`);
  }

  parts.push('');
  parts.push('For this section provide:');
  parts.push('- status: "pass" (ready — NO issues, comments MUST be an empty array), "warning" (functional but improvable — MUST have 1-3 comments), or "needs_revision" (has issues that must be fixed — MUST have 1-3 comments)');
  parts.push('- comments: actionable improvement instructions. CRITICAL: For "pass" status, comments MUST be an empty array [].');
  parts.push('');
  parts.push('Every comment MUST be phrased as an actionable improvement instruction.');

  return parts.join('\n');
}

/** Format-specific output instructions */
const FORMAT_INSTRUCTIONS: Record<string, string> = {
  rich_text: 'Output: formatted markdown with headings and bullet lists. No tables. No JSON.',
  line_items: 'Output: a JSON array of strings. Each string is one discrete item. Max 20 items. No prose.',
  table: 'Output: a JSON array of row objects. Use exact column keys from the section definition.',
  schedule_table: 'Output: a JSON array of phase objects with keys: phase_name (string), duration_days (number), start_date (ISO date YYYY-MM-DD or null), end_date (ISO date YYYY-MM-DD or null). Propose realistic dates based on challenge scope and complexity.',
  checkbox_multi: 'Output: a JSON array of selected option codes from the allowed values list ONLY. Do NOT invent new codes.',
  checkbox_single: 'Output: a JSON object: { "selected_id": "...", "rationale": "one sentence" }. The selected_id MUST be from the allowed values list.',
  date: 'Output: a single ISO date string YYYY-MM-DD. Calculate based on phase_schedule end dates, deliverables count, and scope complexity. The deadline should be the end date of the last phase in the schedule, or if no schedule exists, estimate based on scope and complexity (simple=60d, moderate=90d, complex=120d, highly_complex=180d from today). Never output null if phase_schedule data is available.',
  structured_fields: 'Output: { "status": "complete"|"incomplete", "missing_fields": [...], "comments": "..." }.',
  select: 'Output: a single string value from the allowed options.',
  radio: 'Output: a single string value from the allowed options.',
  tag_input: 'Output: a JSON array of tag strings.',
  custom: 'Output: structured JSON appropriate to the section context.',
};

const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text', scope: 'rich_text', deliverables: 'line_items',
  expected_outcomes: 'line_items', submission_guidelines: 'line_items',
  evaluation_criteria: 'table', reward_structure: 'table',
  phase_schedule: 'schedule_table', complexity: 'checkbox_single', ip_model: 'checkbox_single',
  maturity_level: 'checkbox_single', eligibility: 'checkbox_multi', visibility: 'checkbox_multi',
  hook: 'rich_text', submission_deadline: 'date',
  challenge_visibility: 'select', domain_tags: 'tag_input',
  legal_docs: 'table', escrow_funding: 'structured_fields',
  solver_expertise: 'custom',
  // Extended Brief subsections
  context_and_background: 'rich_text', root_causes: 'line_items',
  affected_stakeholders: 'table', current_deficiencies: 'line_items',
  preferred_approach: 'rich_text', approaches_not_of_interest: 'line_items',
};

/** Extended Brief subsection-specific format instructions */
const EXTENDED_BRIEF_FORMAT_INSTRUCTIONS: Record<string, string> = {
  root_causes: 'Output: JSON array of short phrase strings only. No sentences. No explanations. Each item is a cause label, not a description. Max 8 items.',
  affected_stakeholders: 'Output: JSON array of row objects with keys stakeholder_name, role, impact_description (max 100 chars), adoption_challenge (max 100 chars). Always populate adoption_challenge — this is the most valuable field.',
  current_deficiencies: 'Output: JSON array of current-state observation phrases. Max 10 items. Each item must be a factual observation about current state, not a wish or solution hint.',
  preferred_approach: 'If content exists, do NOT rewrite it. Produce review comments only. Set structured_output to the existing content unchanged.',
  approaches_not_of_interest: 'Always set requires_human_input: true. Never produce items for this section. Output: { "requires_human_input": true, "comment": "This section requires explicit human input about excluded approaches." }',
};

/**
 * Builds the full system prompt for a batch review of multiple sections.
 */
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
  parts.push('CRITICAL: Each distinct issue or suggestion MUST be a separate comment in the array.');
  parts.push('Your suggested content for each section MUST match the prescribed format.');
  parts.push('For master-data-backed sections (eligibility, visibility, ip_model, maturity_level, complexity, challenge_visibility), your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}
