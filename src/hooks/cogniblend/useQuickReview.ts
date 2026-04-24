/**
 * useQuickReview — Data + mutations for the QUICK-mode Creator review surface.
 *
 * Wraps:
 * - Submissions fetch (challenge_submissions, RLS already grants Creator who holds CR)
 * - Accept solution → marks submission ACCEPTED + winner, then advances phase via complete_phase RPC.
 * - Decline solution → marks submission DECLINED with required note.
 *
 * No DB calls in pages (R2). All mutations route through complete_phase for phase advancement.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { CACHE_FREQUENT } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface QuickSubmission {
  id: string;
  providerId: string | null;
  submitterName: string;
  submitterEmail: string;
  submittedAt: string;
  status: string;
  submissionText: string | null;
  submissionFiles: Array<{ name?: string; url?: string }> | null;
  awardTier: string | null;
}

export interface QuickReviewChallenge {
  challengeId: string;
  title: string;
  governanceMode: string;
  operatingModel: string;
  currentPhase: number | null;
}

export interface QuickReviewData {
  challenge: QuickReviewChallenge;
  submissions: QuickSubmission[];
}

/* ─── Query: list submissions for a QUICK challenge ──────── */

export function useQuickReviewData(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['quick-review', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<QuickReviewData> => {
      if (!challengeId) throw new Error('Challenge ID required');

      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select('id, title, governance_profile, governance_mode_override, operating_model, current_phase')
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (cErr) throw new Error(cErr.message);
      if (!challenge) throw new Error('Challenge not found');

      const { data: subs, error: sErr } = await supabase
        .from('challenge_submissions')
        .select('id, provider_id, submitter_name, submitter_email, created_at, status, submission_text, submission_files, award_tier')
        .eq('challenge_id', challengeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (sErr) throw new Error(sErr.message);

      const submissions: QuickSubmission[] = (subs ?? []).map((s) => ({
        id: s.id,
        providerId: s.provider_id,
        submitterName: s.submitter_name,
        submitterEmail: s.submitter_email,
        submittedAt: s.created_at,
        status: s.status ?? 'PENDING',
        submissionText: s.submission_text,
        submissionFiles: (s.submission_files as QuickSubmission['submissionFiles']) ?? null,
        awardTier: s.award_tier,
      }));

      return {
        challenge: {
          challengeId: challenge.id,
          title: challenge.title,
          governanceMode: (challenge.governance_mode_override ?? challenge.governance_profile ?? 'STRUCTURED').toUpperCase(),
          operatingModel: (challenge.operating_model ?? 'MP').toUpperCase(),
          currentPhase: challenge.current_phase ?? null,
        },
        submissions,
      };
    },
    ...CACHE_FREQUENT,
    onError: (e: Error) => handleQueryError(e, { operation: 'fetch_quick_review' }),
  });
}

/* ─── Mutation: accept a submission as winner ────────────── */

interface AcceptParams {
  submissionId: string;
  challengeId: string;
  userId: string;
  note: string;
}

export function useAcceptQuickSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, challengeId, userId, note }: AcceptParams) => {
      const updates = await withUpdatedBy({
        status: 'ACCEPTED',
        award_tier: 'WINNER',
      });

      const { error: updErr } = await supabase
        .from('challenge_submissions')
        .update(updates)
        .eq('id', submissionId);

      if (updErr) throw new Error(updErr.message);

      // Append decision note to audit trail (required note per plan).
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QUICK_SUBMISSION_ACCEPTED',
        method: 'manual',
        details: { submission_id: submissionId, note },
        created_by: userId,
      });

      // Advance phase (Phase 8 → Phase 9 → auto Phase 10).
      const { data, error: rpcErr } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success('Winner accepted. Finalizing challenge…');
      queryClient.invalidateQueries({ queryKey: ['quick-review', vars.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    },
    onError: (e: Error) => handleMutationError(e, { operation: 'accept_quick_submission' }),
  });
}

/* ─── Mutation: decline a submission with required note ─── */

interface DeclineParams {
  submissionId: string;
  challengeId: string;
  userId: string;
  note: string;
}

export function useDeclineQuickSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, challengeId, userId, note }: DeclineParams) => {
      const updates = await withUpdatedBy({ status: 'DECLINED' });

      const { error: updErr } = await supabase
        .from('challenge_submissions')
        .update(updates)
        .eq('id', submissionId);

      if (updErr) throw new Error(updErr.message);

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QUICK_SUBMISSION_DECLINED',
        method: 'manual',
        details: { submission_id: submissionId, note },
        created_by: userId,
      });
    },
    onSuccess: (_data, vars) => {
      toast.success('Submission declined.');
      queryClient.invalidateQueries({ queryKey: ['quick-review', vars.challengeId] });
    },
    onError: (e: Error) => handleMutationError(e, { operation: 'decline_quick_submission' }),
  });
}
