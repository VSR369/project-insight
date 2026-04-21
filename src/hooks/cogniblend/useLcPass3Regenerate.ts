/**
 * useLcPass3Regenerate — Pass 3 regenerate mutations (run + organize).
 * Extracted from useLcPass3Mutations to keep that hook ≤ 250 lines (R1).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { handleMutationError } from '@/lib/errorHandler';
import { htmlEqualsNormalized } from '@/lib/cogniblend/legal/diffHighlight';

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;
const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;

function appendVersion(existing: unknown, entry: Record<string, unknown>): unknown[] {
  const current = Array.isArray(existing) ? [...existing] : [];
  current.push(entry);
  return current;
}

interface RegenerateSnapshot {
  id: string | null;
  pass3_run_count: number;
  version_history: unknown;
  ai_review_status?: string | null;
  unifiedDocHtml?: string;
}

export interface UseLcPass3RegenerateArgs {
  challengeId: string | undefined;
  getCurrentDoc: () => RegenerateSnapshot;
  onRegenerateComplete?: (prevHtml: string, outcome: 'changed' | 'unchanged') => void;
}

async function fetchLatestUnified(challengeId: string) {
  return await supabase
    .from('challenge_legal_docs')
    .select('id, version_history, pass3_run_count, content_html, ai_modified_content_html')
    .eq('challenge_id', challengeId)
    .eq('document_type', 'UNIFIED_SPA')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function useLcPass3Regenerate({
  challengeId,
  getCurrentDoc,
  onRegenerateComplete,
}: UseLcPass3RegenerateArgs) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: PASS3_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: ['pass3-complete-check', challengeId] });
    queryClient.invalidateQueries({ queryKey: STALE_KEY(challengeId) });
  };

  const guardAccepted = (snap: RegenerateSnapshot) => {
    if (snap.ai_review_status === 'accepted') {
      throw new Error(
        'Legal documents have already been accepted and cannot be regenerated.',
      );
    }
  };

  const reportOutcome = (prevHtml: string, newHtml: string, successMsg: string) => {
    const unchanged = !!prevHtml && htmlEqualsNormalized(prevHtml, newHtml);
    if (unchanged) {
      toast.info('No changes — the regenerated document is identical to the current draft.');
    } else {
      toast.success(successMsg);
    }
    onRegenerateComplete?.(prevHtml, unchanged ? 'unchanged' : 'changed');
  };

  const runPass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      const snap = getCurrentDoc();
      guardAccepted(snap);
      const prevHtml = snap.unifiedDocHtml ?? '';
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: { challenge_id: challengeId, pass3_mode: true },
      });
      if (error) throw new Error(error.message ?? 'Edge function call failed');
      if (data && (data as { success?: boolean }).success === false) {
        const msg = (data as { error?: { message?: string } })?.error?.message;
        throw new Error(msg ?? 'Pass 3 generation failed');
      }
      return { prevHtml };
    },
    onSuccess: async ({ prevHtml }) => {
      let newHtml = '';
      if (challengeId) {
        await supabase
          .from('challenges')
          .update({ pass3_stale: false } as never)
          .eq('id', challengeId);
        const { data: existing } = await fetchLatestUnified(challengeId);
        if (existing?.id && user?.id) {
          newHtml =
            (existing.ai_modified_content_html as string | null) ??
            (existing.content_html as string | null) ??
            '';
          const entry = {
            version: ((existing.pass3_run_count as number | null) ?? 0),
            timestamp: new Date().toISOString(),
            actor: user.id,
            role: 'LC',
            action: 'pass3_run',
            content_snapshot_length: (existing.content_html as string | null)?.length ?? 0,
          };
          await supabase
            .from('challenge_legal_docs')
            .update({
              version_history: appendVersion(existing.version_history, entry) as never,
            })
            .eq('id', existing.id as string);
        }
      }
      invalidate();
      reportOutcome(prevHtml, newHtml, 'Legal AI review completed');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'run_pass3', component: 'useLcPass3Regenerate' }),
  });

  const organizePass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      const snap = getCurrentDoc();
      guardAccepted(snap);
      const prevHtml = snap.unifiedDocHtml ?? '';
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: {
          challenge_id: challengeId,
          pass3_mode: true,
          organize_only: true,
        },
      });
      if (error) throw new Error(error.message ?? 'Edge function call failed');
      if (data && (data as { success?: boolean }).success === false) {
        const msg = (data as { error?: { message?: string } })?.error?.message;
        throw new Error(msg ?? 'Organize & merge failed');
      }
      return { prevHtml };
    },
    onSuccess: async ({ prevHtml }) => {
      let newHtml = '';
      if (challengeId) {
        await supabase
          .from('challenges')
          .update({ pass3_stale: false } as never)
          .eq('id', challengeId);
        const { data: latest } = await fetchLatestUnified(challengeId);
        newHtml =
          (latest?.ai_modified_content_html as string | null) ??
          (latest?.content_html as string | null) ??
          '';
      }
      invalidate();
      reportOutcome(prevHtml, newHtml, 'Source documents organized & merged');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'organize_pass3', component: 'useLcPass3Regenerate' }),
  });

  return { runPass3, organizePass3 };
}
