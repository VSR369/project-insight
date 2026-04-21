/**
 * useCuratorLegalReview — Pass 3 (Legal AI Review) state + mutations.
 *
 * Centralizes data access for the unified Solution Provider Agreement
 * (UNIFIED_SPA) document used by the Curator in STRUCTURED/CONTROLLED mode.
 *
 * Layer rule: components must NOT import supabase directly — they use this
 * hook. All mutations attach updated_by via withUpdatedBy().
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';
import { notifyCurationComplete } from '@/lib/cogniblend/workflowNotifications';
import { ensureFreshSession } from '@/lib/cogniblend/ensureFreshSession';

const STALE_KEY = (challengeId: string | undefined) =>
  ['pass3-stale', challengeId] as const;

const APPROVAL_KEY = (challengeId: string | undefined) =>
  ['pass3-creator-approval', challengeId] as const;

export type Pass3Status = 'idle' | 'running' | 'completed' | 'error';
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
  creator_comments: string | null;
}

export interface CreatorApprovalSnapshot {
  status: string | null;
  requestedAt: string | null;
  daysOverdue: number;
  isOverdue: boolean;
  operatingModel: string | null;
}

const PASS3_KEY = (challengeId: string | undefined) =>
  ['pass3-legal-review', challengeId] as const;

const CREATOR_TIMEOUT_DAYS = 7;

function appendVersion(
  existing: unknown,
  entry: Record<string, unknown>,
): unknown[] {
  const current = Array.isArray(existing) ? [...existing] : [];
  current.push(entry);
  return current;
}

export function useCuratorLegalReview(challengeId: string | undefined) {
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
          'id, ai_review_status, content_html, ai_modified_content_html, ai_changes_summary, ai_confidence, ai_regulatory_flags, pass3_run_count, version_history, lc_reviewed_by, lc_reviewed_at, creator_comments',
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
        creator_comments:
          (data as { creator_comments?: string | null }).creator_comments ?? null,
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

  const approvalQuery = useQuery({
    queryKey: APPROVAL_KEY(challengeId),
    enabled: !!challengeId,
    staleTime: 30_000,
    queryFn: async (): Promise<CreatorApprovalSnapshot | null> => {
      const { data, error } = await supabase
        .from('challenges')
        .select(
          'creator_approval_status, creator_approval_requested_at, operating_model',
        )
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) return null;
      const row = data as {
        creator_approval_status?: string | null;
        creator_approval_requested_at?: string | null;
        operating_model?: string | null;
      } | null;
      if (!row) return null;
      const status = row.creator_approval_status ?? null;
      const requestedAt = row.creator_approval_requested_at ?? null;
      let daysOverdue = 0;
      let isOverdue = false;
      if (status === 'pending' && requestedAt) {
        const elapsedMs = Date.now() - new Date(requestedAt).getTime();
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const overshoot = elapsedDays - CREATOR_TIMEOUT_DAYS;
        if (overshoot > 0) {
          isOverdue = true;
          daysOverdue = Math.floor(overshoot);
          if (daysOverdue < 1) daysOverdue = 1;
        }
      }
      return {
        status,
        requestedAt,
        daysOverdue,
        isOverdue,
        operatingModel: row.operating_model ?? null,
      };
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: PASS3_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: ['pass3-complete-check', challengeId] });
    queryClient.invalidateQueries({ queryKey: STALE_KEY(challengeId) });
    queryClient.invalidateQueries({ queryKey: APPROVAL_KEY(challengeId) });
  };

  const runPass3 = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      await ensureFreshSession();
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
      // Best-effort clear of pass3_stale + append version history snapshot.
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
            role: 'CU',
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
      handleMutationError(e, { operation: 'run_pass3', component: 'useCuratorLegalReview' }),
  });

  const saveEdits = useMutation({
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
      handleMutationError(e, { operation: 'save_pass3_edits', component: 'useCuratorLegalReview' }),
  });

  const acceptPass3 = useMutation({
    mutationFn: async () => {
      const docId = query.data?.id;
      if (!docId) throw new Error('No legal document to accept');
      const versionEntry = {
        version: query.data?.pass3_run_count ?? 0,
        timestamp: new Date().toISOString(),
        actor: user?.id ?? null,
        role: 'CU',
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
          role: 'CU',
          triggerEvent: 'CURATOR_ACCEPT_PASS3',
        });

        // Sprint 6C — Notify Creator that curation+legal is complete and
        // their approval window has opened. Fire-and-forget.
        void (async () => {
          const { data: row } = await supabase
            .from('challenges')
            .select('created_by, title')
            .eq('id', challengeId)
            .maybeSingle();
          const creatorId = (row as { created_by?: string | null } | null)?.created_by;
          const title = (row as { title?: string | null } | null)?.title ?? undefined;
          if (creatorId) {
            await notifyCurationComplete({
              challengeId,
              creatorUserId: creatorId,
              challengeTitle: title ?? undefined,
            });
          }
        })();
      }
      invalidateAll();
      toast.success('Legal documents approved');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'accept_pass3', component: 'useCuratorLegalReview' }),
  });

  const overrideCreatorApproval = useMutation({
    mutationFn: async (reason: string) => {
      if (!challengeId) throw new Error('Missing challenge id');
      const updates = await withUpdatedBy({
        creator_approval_status: 'timeout_override',
        creator_approval_notes: reason,
      });
      const { error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (challengeId && user?.id) {
        void logStatusTransition({
          challengeId,
          fromStatus: 'CR_APPROVAL_PENDING',
          toStatus: 'CR_APPROVAL_TIMEOUT_OVERRIDE',
          changedBy: user.id,
          role: 'CU',
          triggerEvent: 'CURATOR_OVERRIDE_CREATOR_TIMEOUT',
        });
      }
      invalidateAll();
      toast.success('Creator approval overridden — challenge can proceed to publication');
    },
    onError: (e) =>
      handleMutationError(e, {
        operation: 'override_creator_approval',
        component: 'useCuratorLegalReview',
      }),
  });

  const doc = query.data ?? null;
  const status = doc?.ai_review_status ?? null;
  const isPass3Accepted = status === 'accepted';

  let pass3Status: Pass3Status = 'idle';
  if (runPass3.isPending) pass3Status = 'running';
  else if (runPass3.isError && !doc) pass3Status = 'error';
  else if (status === 'ai_suggested' || status === 'accepted') pass3Status = 'completed';

  // Prefer modified content (latest edits), fall back to AI-generated content.
  const unifiedDocHtml =
    doc?.ai_modified_content_html ?? doc?.content_html ?? '';

  const isAGG = approvalQuery.data?.operatingModel === 'AGG';
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
    operatingModel: approvalQuery.data?.operatingModel ?? null,
    creatorComments: doc?.creator_comments ?? null,
    reviewerUserId: doc?.lc_reviewed_by ?? null,
    reviewedAt: doc?.lc_reviewed_at ?? null,
    creatorApproval: approvalQuery.data ?? null,
    overrideCreatorApproval: (reason: string) =>
      overrideCreatorApproval.mutate(reason),
    isOverridingCreator: overrideCreatorApproval.isPending,
  };
}
