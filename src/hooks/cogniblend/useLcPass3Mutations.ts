/**
 * useLcPass3Mutations — Composes Pass 3 mutations (run / organize / save / accept).
 *
 * Regenerate mutations live in useLcPass3Regenerate (extracted to satisfy R1).
 * Save + Accept stay here. The parent `useLcPass3Review` consumes the four
 * handles — no public API change.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';
import { notifyLcApproved } from '@/lib/cogniblend/workflowNotifications';
import { getActiveRoleUsers } from '@/lib/cogniblend/challengeRoleLookup';
import { stripDiffSpans } from '@/lib/cogniblend/legal/diffHighlight';
import { useLcPass3Regenerate } from './useLcPass3Regenerate';

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;
const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;

function appendVersion(existing: unknown, entry: Record<string, unknown>): unknown[] {
  const current = Array.isArray(existing) ? [...existing] : [];
  current.push(entry);
  return current;
}

interface CurrentDocSnapshot {
  id: string | null;
  pass3_run_count: number;
  version_history: unknown;
  ai_review_status?: string | null;
  unifiedDocHtml?: string;
}

export interface UseLcPass3MutationsArgs {
  challengeId: string | undefined;
  getCurrentDoc: () => CurrentDocSnapshot;
  onRegenerateComplete?: (prevHtml: string, outcome: 'changed' | 'unchanged') => void;
}

export function useLcPass3Mutations({
  challengeId,
  getCurrentDoc,
  onRegenerateComplete,
}: UseLcPass3MutationsArgs) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: PASS3_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: ['pass3-complete-check', challengeId] });
    queryClient.invalidateQueries({ queryKey: STALE_KEY(challengeId) });
  };

  const { runPass3, organizePass3 } = useLcPass3Regenerate({
    challengeId,
    getCurrentDoc,
    onRegenerateComplete,
  });

  const saveEdits = useMutation({
    mutationFn: async (html: string) => {
      const { id: docId } = getCurrentDoc();
      if (!docId) throw new Error('No legal document to save');
      const cleanHtml = stripDiffSpans(html);
      const updates = await withUpdatedBy({ ai_modified_content_html: cleanHtml });
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update(updates)
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Legal document saved');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'save_pass3_edits', component: 'useLcPass3Mutations' }),
  });

  const acceptPass3 = useMutation({
    mutationFn: async () => {
      const { id: docId, pass3_run_count, version_history, unifiedDocHtml } = getCurrentDoc();
      if (!docId) throw new Error('No legal document to accept');
      const versionEntry = {
        version: pass3_run_count ?? 0,
        timestamp: new Date().toISOString(),
        actor: user?.id ?? null,
        role: 'LC',
        action: 'accepted',
      };
      const nextHistory = appendVersion(version_history, versionEntry);
      const cleanedHtml = unifiedDocHtml ? stripDiffSpans(unifiedDocHtml) : null;
      const baseUpdates: Record<string, unknown> = {
        ai_review_status: 'accepted',
        lc_status: 'approved',
        lc_reviewed_by: user?.id ?? null,
        lc_reviewed_at: new Date().toISOString(),
        version_history: nextHistory as never,
      };
      if (cleanedHtml !== null) baseUpdates.ai_modified_content_html = cleanedHtml;
      const updates = await withUpdatedBy(baseUpdates);
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update(updates)
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (challengeId && user?.id) {
        void logStatusTransition({
          challengeId,
          fromStatus: 'PASS3_PENDING',
          toStatus: 'PASS3_ACCEPTED',
          changedBy: user.id,
          role: 'LC',
          triggerEvent: 'LC_ACCEPT_PASS3',
        });
        void (async () => {
          const recipients = await getActiveRoleUsers(challengeId, ['CU', 'FC']);
          if (recipients.length > 0) {
            await notifyLcApproved({ challengeId, recipientUserIds: recipients });
          }
        })();
      }
      invalidateAll();
      toast.success('Legal documents approved');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'accept_pass3', component: 'useLcPass3Mutations' }),
  });

  return { runPass3, organizePass3, saveEdits, acceptPass3 };
}
