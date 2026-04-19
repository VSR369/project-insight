/**
 * useCreatorReview — Data + mutations for the Creator Review workflow.
 *
 * Composes existing usePreviewData for the challenge body, then adds:
 *  - approval-status columns + pass3_stale (separate query, cache key
 *    `creator-review`)
 *  - UNIFIED_SPA accepted legal doc (for read-only viewer)
 *  - role check (Creator only)
 *  - mutations: acceptAll / submitEdits / requestRecuration
 *
 * Layer rule: components import this hook — they MUST NOT touch supabase.
 */
import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';

export const CREATOR_EDITABLE_SECTIONS = new Set<string>([
  'problem_statement',
  'scope',
  'expected_outcomes',
  'context_and_background',
  'root_causes',
  'affected_stakeholders',
  'current_deficiencies',
  'preferred_approach',
  'approaches_not_of_interest',
  'deliverables',
  'data_resources_provided',
  'success_metrics_kpis',
  'hook',
  'domain_tags',
  'creator_legal_instructions',
]);

/** AGG mode further restricts these (Creator cannot edit). */
export const AGG_RESTRICTED_SECTIONS = new Set<string>([
  'reward_structure',
  'evaluation_criteria',
  'submission_guidelines',
]);

interface ApprovalRow {
  creator_approval_status: string | null;
  creator_approval_requested_at: string | null;
  creator_approved_at: string | null;
  creator_approval_notes: string | null;
  pass3_stale: boolean | null;
  operating_model: string | null;
  extended_brief: unknown;
}

interface UnifiedSpaRow {
  id: string;
  content_html: string | null;
  ai_modified_content_html: string | null;
}

const TIMEOUT_DAYS = 7;

export function useCreatorReview(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preview = usePreviewData(challengeId);
  const rolesQuery = useUserChallengeRoles(user?.id, challengeId);

  // Local state — Creator's pending edits this session.
  const [editedSections, setEditedSections] = useState<Record<string, unknown>>({});
  const [showLegalToggle, setShowLegalToggle] = useState(false);

  const approvalQuery = useQuery({
    queryKey: ['creator-review', challengeId],
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<ApprovalRow | null> => {
      const { data, error } = await supabase
        .from('challenges')
        .select(
          'creator_approval_status, creator_approval_requested_at, creator_approved_at, creator_approval_notes, pass3_stale, operating_model, extended_brief',
        )
        .eq('id', challengeId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ApprovalRow | null) ?? null;
    },
  });

  const legalQuery = useQuery({
    queryKey: ['creator-review-legal', challengeId],
    enabled: !!challengeId,
    staleTime: 10_000,
    queryFn: async (): Promise<UnifiedSpaRow | null> => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, content_html, ai_modified_content_html')
        .eq('challenge_id', challengeId!)
        .eq('document_type', 'UNIFIED_SPA')
        .eq('ai_review_status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as UnifiedSpaRow | null) ?? null;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['creator-review', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['creator-review-legal', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });
  };

  const trackEdit = (sectionKey: string, value: unknown) => {
    setEditedSections((prev) => ({ ...prev, [sectionKey]: value }));
  };

  const acceptAll = useMutation({
    mutationFn: async () => {
      if (!challengeId) throw new Error('Missing challenge id');
      const updates = await withUpdatedBy({
        creator_approval_status: 'approved',
        creator_approved_at: new Date().toISOString(),
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
          fromStatus: 'PENDING_CREATOR_APPROVAL',
          toStatus: 'CREATOR_APPROVED',
          changedBy: user.id,
          role: 'CR',
          triggerEvent: 'CREATOR_ACCEPT_ALL',
        });
      }
      invalidateAll();
      toast.success('Challenge approved');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'creator_accept_all', component: 'useCreatorReview' }),
  });

  const submitEdits = useMutation({
    mutationFn: async () => {
      if (!challengeId || !user?.id) throw new Error('Missing challenge or user');
      const entries = Object.entries(editedSections);
      if (entries.length === 0) throw new Error('No edits to submit');

      // Best-effort history insert per edited section.
      const historyRows = entries.map(([section_key, after_value]) => ({
        challenge_id: challengeId,
        section_key,
        edited_by: user.id,
        role: 'CR' as const,
        before_value: null,
        after_value: after_value as never,
        edit_source: 'creator_edit' as const,
      }));
      const { error: histErr } = await supabase
        .from('challenge_edit_history')
        .insert(historyRows);
      if (histErr) throw new Error(histErr.message);

      const updates = await withUpdatedBy({
        creator_approval_status: 'changes_submitted',
        pass3_stale: true,
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
          fromStatus: 'PENDING_CREATOR_APPROVAL',
          toStatus: 'CREATOR_CHANGES_SUBMITTED',
          changedBy: user.id,
          role: 'CR',
          triggerEvent: 'CREATOR_SUBMIT_EDITS',
          metadata: { edited_section_count: Object.keys(editedSections).length },
        });
      }
      setEditedSections({});
      invalidateAll();
      toast.success('Edits submitted to Curator');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'creator_submit_edits', component: 'useCreatorReview' }),
  });

  const requestRecuration = useMutation({
    mutationFn: async (reason: string) => {
      if (!challengeId) throw new Error('Missing challenge id');
      const updates = await withUpdatedBy({
        creator_approval_status: 'changes_requested',
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
          fromStatus: 'PENDING_CREATOR_APPROVAL',
          toStatus: 'CREATOR_CHANGES_REQUESTED',
          changedBy: user.id,
          role: 'CR',
          triggerEvent: 'CREATOR_REQUEST_RECURATION',
        });
      }
      invalidateAll();
      toast.success('Re-curation requested');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'creator_request_recuration', component: 'useCreatorReview' }),
  });

  const approval = approvalQuery.data;
  const legalDoc = legalQuery.data;
  const isAGG = approval?.operating_model === 'AGG';
  const isMP = approval?.operating_model === 'MP';

  const status = approval?.creator_approval_status ?? null;
  const isApproved = status === 'approved';
  const isPending = status === 'pending';
  const hasCRRole = (rolesQuery.data ?? []).includes('CR');
  const canEdit = hasCRRole && isPending;

  const legalDocHtml = useMemo(
    () => legalDoc?.ai_modified_content_html ?? legalDoc?.content_html ?? null,
    [legalDoc],
  );
  const showLegalDocs = isMP || (isAGG && showLegalToggle);

  const timeoutDate = useMemo(() => {
    if (!approval?.creator_approval_requested_at) return null;
    const start = new Date(approval.creator_approval_requested_at);
    return new Date(start.getTime() + TIMEOUT_DAYS * 24 * 60 * 60 * 1000);
  }, [approval?.creator_approval_requested_at]);

  const isTimedOut = timeoutDate ? new Date() > timeoutDate : false;

  return {
    // Preview composition
    challenge: preview.challenge,
    orgData: preview.orgData,
    legalDetails: preview.legalDetails,
    escrowRecord: preview.escrowRecord,
    digest: preview.digest,
    attachments: preview.attachments,

    // Approval state
    status,
    approvedAt: approval?.creator_approved_at ?? null,
    notes: approval?.creator_approval_notes ?? null,
    pass3Stale: approval?.pass3_stale === true,
    requestedAt: approval?.creator_approval_requested_at ?? null,
    timeoutDate,
    isTimedOut,
    isApproved,
    isPending,
    isAGG,
    isMP,

    // Access
    hasCRRole,
    canEdit,

    // Legal viewer
    legalDocHtml,
    showLegalDocs,
    showLegalToggle,
    setShowLegalToggle,

    // Edit tracking
    editedSections,
    trackEdit,
    hasEdits: Object.keys(editedSections).length > 0,

    // Loading
    isLoading: preview.isLoading || approvalQuery.isLoading || rolesQuery.isLoading,
    isError: preview.isError || approvalQuery.isError,
    error: (preview.error as Error | null) ?? (approvalQuery.error as Error | null) ?? null,

    // Mutations
    acceptAll: () => acceptAll.mutate(),
    submitEdits: () => submitEdits.mutate(),
    requestRecuration: (reason: string) => requestRecuration.mutate(reason),
    isAccepting: acceptAll.isPending,
    isSubmittingEdits: submitEdits.isPending,
    isRequestingRecuration: requestRecuration.isPending,
  };
}
