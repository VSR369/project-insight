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
  parts.push('- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has issues that must be fixed)');
  parts.push('- comments: 1-3 specific, actionable improvement instructions. For "pass" status, provide 0-1 optional enhancement suggestions.');
  parts.push('');
  parts.push('Every comment MUST be phrased as an actionable improvement instruction.');

  return parts.join('\n');
}

/**
 * Builds the full system prompt for a batch review of multiple sections.
 */
export function buildConfiguredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
): string {
  const contextLabel = ROLE_CONTEXT_LABELS[roleContext] || 'challenge section';

  /** Format-specific output instructions */
  const FORMAT_INSTRUCTIONS: Record<string, string> = {
    rich_text: 'Output: formatted markdown with headings and bullet lists. No tables. No JSON.',
    line_items: 'Output: a JSON array of strings. Each string is one discrete item. Max 20 items. No prose.',
    table: 'Output: a JSON array of row objects. Use exact column keys from the section definition.',
    schedule_table: 'Output: a JSON array of phase objects with keys: phase_name, start_date, end_date, milestone (bool), dependencies.',
    checkbox_multi: 'Output: a JSON array of selected option IDs from the provided list only.',
    checkbox_single: 'Output: a JSON object: { "selected_id": "...", "rationale": "one sentence" }.',
    date: 'Output: a single ISO date string YYYY-MM-DD or null.',
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
    challenge_visibility: 'select', effort_level: 'radio', domain_tags: 'tag_input',
    legal_docs: 'table', escrow_funding: 'structured_fields',
    solver_expertise: 'custom',
    // Extended Brief subsections
    context_and_background: 'rich_text', root_causes: 'line_items',
    affected_stakeholders: 'table', current_deficiencies: 'line_items',
    extended_brief_expected_outcomes: 'line_items', preferred_approach: 'rich_text',
    approaches_not_of_interest: 'line_items',
  };

  const parts: string[] = [];
  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');
  parts.push('For each section below, provide:');
  parts.push('- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has issues that must be fixed)');
  parts.push('- comments: 1-3 specific, actionable improvement instructions.');
  parts.push('');

  configs.forEach((config, i) => {
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';

    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
    parts.push(`Format: ${fmt}. ${fmtInstr}`);
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
  return parts.join('\n');
}
