/**
 * fetchExamples.ts — Server-side retrieval of dynamic few-shot examples
 * and hard corrections from section_example_library for prompt injection.
 *
 * Prompt 13 enhancements:
 * - fetchHardCorrections: retrieves active, high-confidence learned rules as hard constraints
 * - formatCorrectionsForPrompt: formats corrections as a "NEVER repeat" block
 * - Token budgeting: caps total corpus injection at TOKEN_BUDGET_CHARS
 */

/** Approx 6K tokens — 30% of a ~20K token corpus budget */
const TOKEN_BUDGET_CHARS = 24000;

interface DynamicExample {
  content: string;
  quality_tier: string;
  annotation: string | null;
  maturity_level: string | null;
  learning_rule: string | null;
}

interface HardCorrection {
  id: string;
  section_key: string;
  learning_rule: string;
  correction_class: string | null;
  activation_confidence: number;
}

interface FetchExamplesOptions {
  sectionKeys: string[];
  maturityLevel?: string | null;
  domainTags?: string[];
  limit?: number;
}

/**
 * Fetch relevant examples for multiple sections in a single query.
 * Returns a map of sectionKey → examples[].
 */
export async function fetchExamplesForBatch(
  adminClient: ReturnType<typeof Object>,
  options: FetchExamplesOptions,
): Promise<Record<string, DynamicExample[]>> {
  const { sectionKeys, maturityLevel, domainTags, limit = 2 } = options;
  const result: Record<string, DynamicExample[]> = {};

  if (sectionKeys.length === 0) return result;

  try {
    const { data, error } = await (adminClient as any)
      .from('section_example_library')
      .select('id, section_key, content, quality_tier, annotation, maturity_level, domain_tags, learning_rule, usage_count, activation_confidence')
      .in('section_key', sectionKeys)
      .eq('is_active', true)
      .in('quality_tier', ['excellent', 'good'])
      .order('quality_tier', { ascending: true })
      .order('usage_count', { ascending: true })
      .limit(sectionKeys.length * 10);

    if (error || !data || data.length === 0) return result;

    // Group by section_key
    const grouped: Record<string, any[]> = {};
    for (const row of data) {
      if (!grouped[row.section_key]) grouped[row.section_key] = [];
      grouped[row.section_key].push(row);
    }

    // Score and select top examples per section
    for (const [sectionKey, examples] of Object.entries(grouped)) {
      const scored = examples.map((ex: any) => {
        let score = 0;
        if (ex.quality_tier === 'excellent') score += 10;
        if (ex.learning_rule) score += 3;
        if (maturityLevel && ex.maturity_level === maturityLevel) score += 5;
        if (domainTags && Array.isArray(ex.domain_tags)) {
          const overlap = domainTags.filter((t: string) =>
            (ex.domain_tags as string[]).includes(t),
          ).length;
          score += overlap * 2;
        }
        return { ...ex, _score: score };
      });

      scored.sort((a: any, b: any) => b._score - a._score);
      const selected = scored.slice(0, limit);

      result[sectionKey] = selected.map((ex: any) => ({
        content: ex.content,
        quality_tier: ex.quality_tier,
        annotation: ex.annotation,
        maturity_level: ex.maturity_level,
        learning_rule: ex.learning_rule,
      }));

      // Fire-and-forget: increment usage_count
      for (const sel of selected) {
        if (sel.id) {
          (adminClient as any)
            .from('section_example_library')
            .update({ usage_count: (sel.usage_count ?? 0) + 1 })
            .eq('id', sel.id)
            .then(() => {});
        }
      }
    }

    return result;
  } catch (err) {
    console.warn('[fetchExamples] Non-blocking fetch failed:', err);
    return result;
  }
}

/**
 * Fetch active hard corrections (learned rules) for injection as constraints.
 * Only returns rules that have passed activation thresholds.
 */
export async function fetchHardCorrections(
  adminClient: any,
  sectionKeys: string[],
): Promise<HardCorrection[]> {
  if (sectionKeys.length === 0) return [];

  try {
    const { data, error } = await adminClient
      .from('section_example_library')
      .select('id, section_key, learning_rule, correction_class, activation_confidence')
      .in('section_key', sectionKeys)
      .eq('is_active', true)
      .not('learning_rule', 'is', null)
      .gte('activation_confidence', 0.7)
      .order('activation_confidence', { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      id: row.id,
      section_key: row.section_key,
      learning_rule: row.learning_rule,
      correction_class: row.correction_class,
      activation_confidence: row.activation_confidence,
    }));
  } catch (err) {
    console.warn('[fetchHardCorrections] Non-blocking fetch failed:', err);
    return [];
  }
}

/**
 * Format hard corrections into a prompt block for injection.
 * These are "NEVER repeat" rules — hard constraints from curator learning.
 */
export function formatCorrectionsForPrompt(
  corrections: HardCorrection[],
  charBudget: number = TOKEN_BUDGET_CHARS / 2,
): string {
  if (corrections.length === 0) return '';

  // Sort by confidence descending so we keep highest-confidence when truncating
  const sorted = [...corrections].sort((a, b) => b.activation_confidence - a.activation_confidence);

  const parts: string[] = [
    '',
    '## CURATOR-LEARNED CORRECTIONS (hard rules — these have been corrected before, DO NOT repeat):',
    'The following rules were extracted from real curator corrections. Each has been validated by multiple curators.',
    'Violating any of these rules means your output needs correction. Apply them strictly.',
    '',
  ];

  let charCount = parts.join('\n').length;
  let ruleNum = 0;

  for (const correction of sorted) {
    const classLabel = correction.correction_class
      ? ` [${correction.correction_class.toUpperCase()}]`
      : '';
    const line = `${++ruleNum}. ${correction.learning_rule}${classLabel} (section: ${correction.section_key}, confidence: ${correction.activation_confidence.toFixed(2)})`;

    if (charCount + line.length + 1 > charBudget) {
      console.log(`[formatCorrectionsForPrompt] Token budget reached after ${ruleNum - 1} rules, ${corrections.length - ruleNum + 1} dropped`);
      break;
    }

    parts.push(line);
    charCount += line.length + 1;
  }

  parts.push('');
  return parts.join('\n');
}

/**
 * Format examples into a prompt block for injection into a system prompt.
 * Returns empty string if no examples are available.
 * Applies token budgeting to prevent context overflow.
 */
export function formatExamplesForPrompt(
  examplesBySection: Record<string, DynamicExample[]>,
  charBudget: number = TOKEN_BUDGET_CHARS / 2,
): string {
  const sectionKeys = Object.keys(examplesBySection);
  if (sectionKeys.length === 0) return '';

  const parts: string[] = [
    '',
    '## Dynamic Examples (from the Curator Learning Corpus)',
    'These are real examples from published challenges, selected for relevance to the current review.',
    'Use them as quality benchmarks — match or exceed their standard.',
    '',
  ];

  let charCount = parts.join('\n').length;

  for (const sectionKey of sectionKeys) {
    const examples = examplesBySection[sectionKey];
    if (!examples || examples.length === 0) continue;

    const header = `### Examples for "${sectionKey}":`;
    charCount += header.length + 1;
    if (charCount > charBudget) {
      console.log(`[formatExamplesForPrompt] Token budget reached, skipping remaining sections`);
      break;
    }
    parts.push(header);

    for (const ex of examples) {
      const tierLabel = ex.quality_tier === 'excellent' ? '✅ EXCELLENT' : '✅ GOOD';
      const contentStr = typeof ex.content === 'string' ? ex.content : JSON.stringify(ex.content);
      let block = `${tierLabel}:\n${contentStr}`;
      if (ex.annotation) block += `\nAnnotation: ${ex.annotation}`;
      if (ex.learning_rule) block += `\nLearning Rule: ${ex.learning_rule}`;
      block += '\n';

      if (charCount + block.length > charBudget) {
        console.log(`[formatExamplesForPrompt] Token budget reached mid-section, truncating`);
        break;
      }

      parts.push(block);
      charCount += block.length;
    }
  }

  return parts.join('\n');
}
