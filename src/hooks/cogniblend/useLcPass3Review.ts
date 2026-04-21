/**
 * useLcPass3Review — Pass 3 (Legal AI Review) state + mutations for the LC.
 *
 * Mirrors useCuratorLegalReview to keep the cache shared (same query key
 * `pass3-legal-review`). Components must NOT import supabase directly —
 * they use this hook.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';
import { notifyLcApproved } from '@/lib/cogniblend/workflowNotifications';
import { getActiveRoleUsers } from '@/lib/cogniblend/challengeRoleLookup';

export type Pass3Status = 'idle' | 'running' | 'completed' | 'organized' | 'accepted' | 'error';
export type Pass3Confidence = 'high' | 'medium' | 'low' | null;

export interface Pass3Document {
  id: string;
  ai_review_status: string | null;
  content_html: string | null;
  ai_modified_content_html: string | null;
  ai_changes_summary: string | null;
  ai_confidence: Pass3Confidence;
  ai_regulatory_flags: string[];
  pass3_run_count: number;
  version_history: unknown;
  lc_reviewed_by: string | null;
  lc_reviewed_at: string | null;
}

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;

const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;

const OP_MODEL_KEY = (challengeId: string | undefined) =>
  ['challenge-operating-model', challengeId] as const;

function appendVersion(
  existing: unknown,
  entry: Record<string, unknown>,
): unknown[] {
  const current = Array.isArray(existing) ? [...existing] : [];
  current.push(entry);
  return current;
}

export function useLcPass3Review(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: PASS3_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<Pass3Document | null> => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select(
          'id, ai_review_status, content_html, ai_modified_content_html, ai_changes_summary, ai_confidence, ai_regulatory_flags, pass3_run_count, version_history, lc_reviewed_by, lc_reviewed_at',
        )
        .eq('challenge_id', challengeId!)
        .eq('document_type', 'UNIFIED_SPA')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const flagsRaw = (data as { ai_regulatory_flags?: unknown }).ai_regulatory_flags;
      const flags: string[] = Array.isArray(flagsRaw)
        ? flagsRaw.map((f) => String(f))
        : [];

      return {
        id: data.id as string,
        ai_review_status: (data.ai_review_status as string | null) ?? null,
        content_html: (data.content_html as string | null) ?? null,
        ai_modified_content_html:
          (data.ai_modified_content_html as string | null) ?? null,
        ai_changes_summary: (data.ai_changes_summary as string | null) ?? null,
        ai_confidence: (data.ai_confidence as Pass3Confidence) ?? null,
        ai_regulatory_flags: flags,
        pass3_run_count: (data.pass3_run_count as number | null) ?? 0,
        version_history: data.version_history,
        lc_reviewed_by: (data.lc_reviewed_by as string | null) ?? null,
        lc_reviewed_at: (data.lc_reviewed_at as string | null) ?? null,
      };
    },
  });

  const staleQuery = useQuery({
    queryKey: STALE_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('pass3_stale')
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) return false;
      return (data as { pass3_stale?: boolean | null } | null)?.pass3_stale === true;
    },
  });

  const opModelQuery = useQuery({
    queryKey: OP_MODEL_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('operating_model')
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) return null;
      return (data as { operating_model?: string | null } | null)?.operating_model ?? null;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: PASS3_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: ['pass3-complete-check', challengeId] });
    queryClient.invalidateQueries({ queryKey: STALE_KEY(challengeId) });
  };

  const runPass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
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
      handleMutationError(e, { operation: 'run_pass3', component: 'useLcPass3Review' }),
  });

  const organizePass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
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
      handleMutationError(e, { operation: 'organize_pass3', component: 'useLcPass3Review' }),
  });


    mutationFn: async (html: string) => {
      const docId = query.data?.id;
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
      handleMutationError(e, { operation: 'save_pass3_edits', component: 'useLcPass3Review' }),
  });

  const acceptPass3 = useMutation({
    mutationFn: async () => {
      const docId = query.data?.id;
      if (!docId) throw new Error('No legal document to accept');
      const versionEntry = {
        version: query.data?.pass3_run_count ?? 0,
        timestamp: new Date().toISOString(),
        actor: user?.id ?? null,
        role: 'LC',
        action: 'accepted',
      };
      const nextHistory = appendVersion(query.data?.version_history, versionEntry);
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

        // Sprint 6C — Notify Curator + FC that LC has approved.
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
      handleMutationError(e, { operation: 'accept_pass3', component: 'useLcPass3Review' }),
  });

  const doc = query.data ?? null;
  const status = doc?.ai_review_status ?? null;
  const isPass3Accepted = status === 'accepted';

  let pass3Status: Pass3Status = 'idle';
  if (runPass3.isPending) pass3Status = 'running';
  else if (runPass3.isError && !doc) pass3Status = 'error';
  else if (status === 'ai_suggested' || status === 'accepted') pass3Status = 'completed';

  const unifiedDocHtml =
    doc?.ai_modified_content_html ?? doc?.content_html ?? '';

  const isAGG = opModelQuery.data === 'AGG';
  const protectedHeadings = isAGG ? ['ANTI-DISINTERMEDIATION'] : [];

  return {
    pass3Status,
    unifiedDocHtml,
    changesSummary: doc?.ai_changes_summary ?? '',
    confidence: doc?.ai_confidence ?? null,
    regulatoryFlags: doc?.ai_regulatory_flags ?? [],
    runCount: doc?.pass3_run_count ?? 0,
    isLoading: query.isLoading,
    isRunning: runPass3.isPending,
    isSaving: saveEdits.isPending,
    isAccepting: acceptPass3.isPending,
    error: runPass3.error instanceof Error ? runPass3.error.message : null,
    isPass3Accepted,
    isPass3Complete: isPass3Accepted,
    isStale: staleQuery.data === true,
    runPass3: () => runPass3.mutate(),
    saveEdits: (html: string) => saveEdits.mutate(html),
    acceptPass3: () => acceptPass3.mutate(),
    // Sprint 6B additions
    protectedHeadings,
    isAGG,
    reviewerUserId: doc?.lc_reviewed_by ?? null,
    reviewedAt: doc?.lc_reviewed_at ?? null,
  };
}
