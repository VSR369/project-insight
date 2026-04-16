/**
 * fetchExamples.ts — Server-side retrieval of dynamic few-shot examples
 * from section_example_library for prompt injection.
 *
 * Two retrieval strategies:
 * 1. Keyword: match section_key + score by quality_tier, maturity, domain overlap
 * 2. Semantic: (future) vector similarity via pgvector when embeddings are populated
 *
 * Returns formatted prompt blocks ready for injection into system prompts.
 */

interface DynamicExample {
  content: string;
  quality_tier: string;
  annotation: string | null;
  maturity_level: string | null;
  learning_rule: string | null;
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
  adminClient: any,
  options: FetchExamplesOptions,
): Promise<Record<string, DynamicExample[]>> {
  const { sectionKeys, maturityLevel, domainTags, limit = 2 } = options;
  const result: Record<string, DynamicExample[]> = {};

  if (sectionKeys.length === 0) return result;

  try {
    const { data, error } = await adminClient
      .from('section_example_library')
      .select('id, section_key, content, quality_tier, annotation, maturity_level, domain_tags, learning_rule, usage_count')
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
        if (ex.learning_rule) score += 3; // Prefer examples with learning rules
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
          adminClient
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
 * Format examples into a prompt block for injection into a system prompt.
 * Returns empty string if no examples are available.
 */
export function formatExamplesForPrompt(
  examplesBySection: Record<string, DynamicExample[]>,
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

  for (const sectionKey of sectionKeys) {
    const examples = examplesBySection[sectionKey];
    if (!examples || examples.length === 0) continue;

    parts.push(`### Examples for "${sectionKey}":`);
    for (const ex of examples) {
      const tierLabel = ex.quality_tier === 'excellent' ? '✅ EXCELLENT' : '✅ GOOD';
      parts.push(`${tierLabel}:`);
      parts.push(ex.content);
      if (ex.annotation) parts.push(`Annotation: ${ex.annotation}`);
      if (ex.learning_rule) parts.push(`Learning Rule: ${ex.learning_rule}`);
      parts.push('');
    }
  }

  return parts.join('\n');
}
