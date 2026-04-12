/**
 * Shared query keys and invalidation helper for Context Library hooks.
 */

import type { useQueryClient } from '@tanstack/react-query';

export const CONTEXT_KEYS = {
  sources: (cid: string) => ['context-sources', cid] as const,
  digest: (cid: string) => ['context-digest', cid] as const,
  sourceCount: (cid: string) => ['context-source-count', cid] as const,
  pendingCount: (cid: string) => ['context-pending-count', cid] as const,
};

export function invalidateAllContextKeys(
  qc: ReturnType<typeof useQueryClient>,
  challengeId: string,
): void {
  qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sources(challengeId) });
  qc.invalidateQueries({ queryKey: CONTEXT_KEYS.digest(challengeId) });
  qc.invalidateQueries({ queryKey: CONTEXT_KEYS.sourceCount(challengeId) });
  qc.invalidateQueries({ queryKey: CONTEXT_KEYS.pendingCount(challengeId) });
  qc.invalidateQueries({ queryKey: ['challenge-attachments', challengeId] });
}
