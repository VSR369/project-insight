/**
 * fetchRelevantExamples — Fetches up to 2 dynamic few-shot examples
 * from section_example_library matched by section_key, domain, and maturity.
 *
 * Used by assemblePrompt to inject dynamic examples into AI prompts.
 */

import { supabase } from '@/integrations/supabase/client';

export interface DynamicExample {
  content: string;
  quality_tier: string;
  annotation: string | null;
  maturity_level: string | null;
}

/**
 * Fetch up to `limit` active examples for a section key,
 * preferring matches on maturity_level and domain_tags.
 */
export async function fetchRelevantExamples(
  sectionKey: string,
  maturityLevel?: string | null,
  domainTags?: string[],
  limit = 2,
): Promise<DynamicExample[]> {
  try {
    // Fetch active excellent/good examples for this section
    let query = supabase
      .from('section_example_library' as any)
      .select('content, quality_tier, annotation, maturity_level, domain_tags')
      .eq('section_key', sectionKey)
      .eq('is_active', true)
      .in('quality_tier', ['excellent', 'good'])
      .order('quality_tier', { ascending: true }) // excellent first
      .order('usage_count', { ascending: true })  // least used first
      .limit(20); // fetch more to filter client-side

    if (maturityLevel) {
      // Prefer matching maturity but don't exclude others
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    const examples = data as any[];

    // Score and sort by relevance
    const scored = examples.map((ex) => {
      let score = 0;
      if (ex.quality_tier === 'excellent') score += 10;
      if (maturityLevel && ex.maturity_level === maturityLevel) score += 5;
      if (domainTags && Array.isArray(ex.domain_tags)) {
        const overlap = domainTags.filter((t: string) =>
          (ex.domain_tags as string[]).includes(t)
        ).length;
        score += overlap * 2;
      }
      return { ...ex, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    // Increment usage_count for selected examples (fire-and-forget)
    const selected = scored.slice(0, limit);
    for (const sel of selected) {
      if (sel.id) {
        supabase
          .from('section_example_library' as any)
          .update({ usage_count: (sel.usage_count ?? 0) + 1 } as any)
          .eq('id', sel.id)
          .then(() => {});
      }
    }

    return selected.map((ex) => ({
      content: ex.content,
      quality_tier: ex.quality_tier,
      annotation: ex.annotation,
      maturity_level: ex.maturity_level,
    }));
  } catch {
    // Non-blocking: if fetch fails, return empty
    return [];
  }
}
