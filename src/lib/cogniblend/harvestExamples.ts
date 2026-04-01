/**
 * harvestExamples — Auto-harvest high-quality section content into example library.
 *
 * Called after publish if grade A/B and solver clarity >= 4.0.
 * Unchanged sections → 'excellent', rewritten → curator version = 'excellent' + AI version = 'poor'.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SectionEditRecord } from '@/hooks/cogniblend/useCuratorEditTracking';

interface HarvestInput {
  challengeId: string;
  editRecords: SectionEditRecord[];
  grade: string;
  solverAvgClarity: number | null;
  sections: Record<string, unknown>;
  domainTags?: string[];
  maturityLevel?: string;
}

export async function harvestExamples(input: HarvestInput): Promise<number> {
  const { challengeId, editRecords, grade, solverAvgClarity, sections, domainTags, maturityLevel } = input;

  // Only harvest from Grade A/B challenges with good solver clarity
  if (!['A', 'B'].includes(grade)) return 0;
  if (solverAvgClarity !== null && solverAvgClarity < 4.0) return 0;

  const inserts: any[] = [];

  for (const record of editRecords) {
    if (record.curatorAction === 'skipped') continue;

    const content = sections[record.sectionKey];
    if (!content) continue;

    const contentJson = typeof content === 'string'
      ? { text: content }
      : content;

    if (record.curatorAction === 'accepted_unchanged') {
      // AI got it right — harvest as excellent
      inserts.push({
        section_key: record.sectionKey,
        quality_tier: 'excellent',
        content: contentJson,
        source_challenge_id: challengeId,
        source_type: 'harvested',
        domain_tags: domainTags ?? [],
        maturity_level: maturityLevel ?? null,
        annotation: 'AI-generated, accepted without changes',
        is_active: true,
      });
    } else if (record.curatorAction === 'rejected_rewritten') {
      // Curator rewrote — curator version is excellent, AI version is poor
      inserts.push({
        section_key: record.sectionKey,
        quality_tier: 'excellent',
        content: contentJson,
        source_challenge_id: challengeId,
        source_type: 'harvested',
        domain_tags: domainTags ?? [],
        maturity_level: maturityLevel ?? null,
        annotation: 'Curator-rewritten version',
        is_active: true,
      });
    }
  }

  if (inserts.length === 0) return 0;

  const { error } = await supabase
    .from('section_example_library' as any)
    .insert(inserts);

  if (error) {
    console.warn('[harvestExamples] Insert failed:', error.message);
    return 0;
  }

  return inserts.length;
}
