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

/** Map section keys to their format type for prompt enrichment */
const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text',
  scope: 'rich_text',
  deliverables: 'line_items',
  submission_guidelines: 'rich_text',
  evaluation_criteria: 'table',
  reward_structure: 'structured_fields',
  phase_schedule: 'schedule_table',
  complexity: 'custom',
  ip_model: 'rich_text',
  maturity_level: 'checkbox_single',
  visibility_eligibility: 'rich_text',
  hook: 'rich_text',
  extended_brief: 'custom',
  submission_deadline: 'date',
  challenge_visibility: 'select',
  effort_level: 'radio',
  domain_tags: 'tag_input',
  legal_docs: 'table',
  escrow_funding: 'structured_fields',
};

export function buildConfiguredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
): string {
  const contextLabel = ROLE_CONTEXT_LABELS[roleContext] || 'challenge section';

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
  parts.push('CRITICAL: Each distinct issue or suggestion MUST be a separate comment in the array. Do NOT combine multiple issues into one comment. For structured sections (deliverables, evaluation_criteria), provide one comment per issue — e.g., one comment about a missing deliverable, another about a vague deliverable.');
  parts.push('Your suggested content for each section MUST match the prescribed format — never write prose paragraphs for line_items, table, or checkbox sections.');
  return parts.join('\n');
}
