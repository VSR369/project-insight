/**
 * persistCuratorCorrections — Flush curator edit records to the DB.
 *
 * Inserts SectionEditRecord[] into `curator_corrections` table.
 * Called after bulk accept or on curation submit.
 * Non-blocking: failures are logged but never throw to the caller.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import { logWarning, logInfo } from '@/lib/errorHandler';
import type { SectionEditRecord } from '@/hooks/cogniblend/useCuratorEditTracking';

interface PersistInput {
  challengeId: string;
  records: SectionEditRecord[];
  /** AI content per section (keyed by sectionKey) — stored for future embedding */
  aiContentMap?: Map<string, string | null>;
  /** Curator content per section (keyed by sectionKey) */
  curatorContentMap?: Map<string, string | null>;
}

export async function persistCuratorCorrections({
  challengeId,
  records,
  aiContentMap,
  curatorContentMap,
}: PersistInput): Promise<number> {
  if (records.length === 0) return 0;

  try {
    const userId = await getCurrentUserId();

    const rows = records.map((r) => ({
      challenge_id: challengeId,
      section_key: r.sectionKey,
      ai_suggestion_hash: r.aiSuggestionHash,
      curator_action: r.curatorAction,
      edit_distance_percent: r.editDistancePercent,
      time_spent_seconds: r.timeSpentSeconds,
      confidence_score: r.confidenceScore,
      ai_content: aiContentMap?.get(r.sectionKey) ?? null,
      curator_content: curatorContentMap?.get(r.sectionKey) ?? null,
      created_by: userId,
    }));

    const { error } = await supabase
      .from('curator_corrections')
      .insert(rows);

    if (error) {
      logWarning('[persistCuratorCorrections] Insert failed', {
        operation: 'persist_corrections',
        component: 'persistCuratorCorrections',
        additionalData: { detail: error.message },
      });
      return 0;
    }

    logInfo('[persistCuratorCorrections] Persisted corrections', {
      operation: 'persist_corrections',
      component: 'persistCuratorCorrections',
      additionalData: { count: rows.length, challengeId },
    });

    return rows.length;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logWarning('[persistCuratorCorrections] Unexpected error', {
      operation: 'persist_corrections',
      component: 'persistCuratorCorrections',
      additionalData: { detail: message },
    });
    return 0;
  }
}
