/**
 * statusHistoryLogger — Fire-and-forget audit logger.
 *
 * Inserts an immutable row into `challenge_status_history` for every
 * status transition. Failures are swallowed (warned-only) so the
 * caller's workflow is never interrupted by audit-trail issues.
 *
 * This is the single project-wide boundary for status-history writes.
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';

export type StatusHistoryRole = 'CR' | 'CU' | 'LC' | 'FC' | 'SYSTEM' | 'ADMIN';

export interface StatusTransition {
  challengeId: string;
  fromStatus?: string | null;
  toStatus: string;
  fromPhase?: number | null;
  toPhase?: number | null;
  changedBy: string;
  role: StatusHistoryRole;
  triggerEvent: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert one status transition. Never throws — best-effort logging only.
 */
export async function logStatusTransition(t: StatusTransition): Promise<void> {
  try {
    const { error } = await supabase.from('challenge_status_history').insert({
      challenge_id: t.challengeId,
      from_status: t.fromStatus ?? null,
      to_status: t.toStatus,
      from_phase: t.fromPhase ?? null,
      to_phase: t.toPhase ?? null,
      changed_by: t.changedBy,
      role: t.role,
      trigger_event: t.triggerEvent,
      notes: t.notes ?? null,
      metadata: (t.metadata ?? {}) as never,
    });
    if (error) {
      logWarning('Failed to log status transition', {
        operation: 'log_status_transition',
        component: 'statusHistoryLogger',
        additionalData: { triggerEvent: t.triggerEvent, error: error.message },
      });
    }
  } catch (err) {
    logWarning('Status history insert threw', {
      operation: 'log_status_transition',
      component: 'statusHistoryLogger',
      additionalData: {
        triggerEvent: t.triggerEvent,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
