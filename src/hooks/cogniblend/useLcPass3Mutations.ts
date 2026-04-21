/**
 * useLcPass3Mutations — Pass 3 mutations (run / organize / save / accept).
 * Extracted from useLcPass3Review to keep that hook ≤ 250 lines (R1).
 *
 * The parent `useLcPass3Review` composes these mutations and exposes the
 * thin handles consumers already use — no public API change.
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
import {
  htmlEqualsNormalized,
  stripDiffSpans,
} from '@/lib/cogniblend/legal/diffHighlight';

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;
const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;

function appendVersion(
  existing: unknown,
  entry: Record<string, unknown>,
): unknown[] {
  const current = Array.isArray(existing) ? [...existing] : [];
  current.push(entry);
  return current;
}

interface CurrentDocSnapshot {
  id: string | null;
  pass3_run_count: number;
  version_history: unknown;
  ai_review_status?: string | null;
}

export interface UseLcPass3MutationsArgs {
  challengeId: string | undefined;
  getCurrentDoc: () => CurrentDocSnapshot;
}

export function useLcPass3Mutations({ challengeId, getCurrentDoc }: UseLcPass3MutationsArgs) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: PASS3_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: ['pass3-complete-check', challengeId] });
    queryClient.invalidateQueries({ queryKey: STALE_KEY(challengeId) });
  };

  const runPass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      if (getCurrentDoc().ai_review_status === 'accepted') {
        throw new Error(
          'Legal documents have already been accepted and cannot be regenerated.',
        );
      }
      const { data, error } = await supabase.functions.invoke(
        'suggest-legal-documents',
        { body: { challenge_id: challengeId, pass3_mode: true } },
      );
      if (error) throw new Error(error.message ?? 'Edge function call failed');
      if (data && (data as { success?: boolean }).success === false) {
        const msg = (data as { error?: { message?: string } })?.error?.message;
        throw new Error(msg ?? 'Pass 3 generation failed');
      }
      return data;
    },
    onSuccess: async () => {
      if (challengeId) {
        await supabase
          .from('challenges')
          .update({ pass3_stale: false } as never)
          .eq('id', challengeId);

        const { data: existing } = await supabase
          .from('challenge_legal_docs')
          .select('id, version_history, pass3_run_count, content_html')
          .eq('challenge_id', challengeId)
          .eq('document_type', 'UNIFIED_SPA')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.id && user?.id) {
          const entry = {
            version: ((existing.pass3_run_count as number | null) ?? 0),
            timestamp: new Date().toISOString(),
            actor: user.id,
            role: 'LC',
            action: 'pass3_run',
            content_snapshot_length:
              (existing.content_html as string | null)?.length ?? 0,
          };
          const next = appendVersion(existing.version_history, entry);
          await supabase
            .from('challenge_legal_docs')
            .update({ version_history: next as never })
            .eq('id', existing.id as string);
        }
      }
      invalidateAll();
      toast.success('Legal AI review completed');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'run_pass3', component: 'useLcPass3Mutations' }),
  });

  const organizePass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      if (getCurrentDoc().ai_review_status === 'accepted') {
        throw new Error(
          'Legal documents have already been accepted and cannot be regenerated.',
        );
      }
      const { data, error } = await supabase.functions.invoke(
        'suggest-legal-documents',
        {
          body: {
            challenge_id: challengeId,
            pass3_mode: true,
            organize_only: true,
          },
        },
      );
      if (error) throw new Error(error.message ?? 'Edge function call failed');
      if (data && (data as { success?: boolean }).success === false) {
        const msg = (data as { error?: { message?: string } })?.error?.message;
        throw new Error(msg ?? 'Organize & merge failed');
      }
      return data;
    },
    onSuccess: async () => {
      if (challengeId) {
        await supabase
          .from('challenges')
          .update({ pass3_stale: false } as never)
          .eq('id', challengeId);
      }
      invalidateAll();
      toast.success('Source documents organized & merged');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'organize_pass3', component: 'useLcPass3Mutations' }),
  });

  const saveEdits = useMutation({
    mutationFn: async (html: string) => {
      const { id: docId } = getCurrentDoc();
      if (!docId) throw new Error('No legal document to save');
      const updates = await withUpdatedBy({ ai_modified_content_html: html });
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
      const { id: docId, pass3_run_count, version_history } = getCurrentDoc();
      if (!docId) throw new Error('No legal document to accept');
      const versionEntry = {
        version: pass3_run_count ?? 0,
        timestamp: new Date().toISOString(),
        actor: user?.id ?? null,
        role: 'LC',
        action: 'accepted',
      };
      const nextHistory = appendVersion(version_history, versionEntry);
      const updates = await withUpdatedBy({
        ai_review_status: 'accepted',
        lc_status: 'approved',
        lc_reviewed_by: user?.id ?? null,
        lc_reviewed_at: new Date().toISOString(),
        version_history: nextHistory as never,
      });
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

        // Notify Curator + FC that LC has approved.
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
