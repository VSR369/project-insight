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

  const parts: string[] = [];
  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');
  parts.push('For each section below, provide:');
  parts.push('- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has issues that must be fixed)');
  parts.push('- comments: 1-3 specific, actionable improvement instructions.');
  parts.push('');

  configs.forEach((config, i) => {
    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
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
  return parts.join('\n');
}
