/**
 * useSolverAmendmentStatus — Checks if there's an active material amendment
 * with a withdrawal window for the current solver on a given challenge.
 *
 * Also provides withdrawal mutation and legal re-acceptance mutation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

export interface SolverAmendmentStatus {
  /** Whether there's an active material amendment with an open withdrawal window */
  hasActiveWithdrawal: boolean;
  /** The withdrawal deadline timestamp */
  withdrawalDeadline: string | null;
  /** Days remaining in the withdrawal window */
  daysRemaining: number | null;
  /** The amendment details */
  amendmentId: string | null;
  amendmentNumber: number | null;
  scopeAreas: string[];
  reason: string | null;
  /** Whether legal terms changed and solver hasn't re-accepted */
  requiresLegalReAcceptance: boolean;
  /** The solver's solution ID (if they have one) */
  solutionId: string | null;
  /** Challenge title for notifications */
  challengeTitle: string | null;
}

/* ─── Fetch Hook ─────────────────────────────────────────── */

export function useSolverAmendmentStatus(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['solver-amendment-status', challengeId, userId],
    enabled: !!challengeId && !!userId,
    queryFn: async (): Promise<SolverAmendmentStatus> => {
      if (!challengeId || !userId) {
        return {
          hasActiveWithdrawal: false,
          withdrawalDeadline: null,
          daysRemaining: null,
          amendmentId: null,
          amendmentNumber: null,
          scopeAreas: [],
          reason: null,
          requiresLegalReAcceptance: false,
          solutionId: null,
          challengeTitle: null,
        };
      }

      // 1. Fetch challenge title
      const { data: challenge } = await supabase
        .from('challenges')
        .select('title')
        .eq('id', challengeId)
        .single();

      // 2. Find approved material amendments with active withdrawal window
      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('id, amendment_number, scope_of_change, reason, withdrawal_deadline, status')
        .eq('challenge_id', challengeId)
        .eq('status', 'APPROVED')
        .order('amendment_number', { ascending: false })
        .limit(1);

      // 3. Check if solver has a solution for this challenge
      const { data: solutions } = await supabase
        .from('solutions')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('provider_id', userId)
        .limit(1);

      // Also check challenge_submissions
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .limit(1);

      const solutionId = solutions?.[0]?.id ?? submissions?.[0]?.id ?? null;

      const amendment = amendments?.[0];
      if (!amendment) {
        return {
          hasActiveWithdrawal: false,
          withdrawalDeadline: null,
          daysRemaining: null,
          amendmentId: null,
          amendmentNumber: null,
          scopeAreas: [],
          reason: null,
          requiresLegalReAcceptance: false,
          solutionId,
          challengeTitle: challenge?.title ?? null,
        };
      }

      // Parse scope
      let scopeAreas: string[] = [];
      let isMaterial = false;
      try {
        const parsed = JSON.parse(amendment.scope_of_change ?? '{}');
        scopeAreas = parsed.areas ?? [];
        isMaterial = parsed.is_material === true;
      } catch {
        // plain text
      }

      // Check withdrawal window
      const withdrawalDeadline = (amendment as any).withdrawal_deadline as string | null;
      const now = Date.now();
      const deadlineMs = withdrawalDeadline ? new Date(withdrawalDeadline).getTime() : 0;
      const hasActiveWithdrawal = isMaterial && !!withdrawalDeadline && deadlineMs > now;
      const daysRemaining = hasActiveWithdrawal
        ? Math.ceil((deadlineMs - now) / (1000 * 60 * 60 * 24))
        : null;

      // Check if legal terms changed and solver hasn't re-accepted
      const legalTermsChanged = scopeAreas.includes('Legal Terms');
      let requiresLegalReAcceptance = false;

      if (legalTermsChanged && solutionId) {
        // Check if solver has accepted legal terms AFTER this amendment
        const { data: acceptance } = await supabase
          .from('legal_acceptance_ledger')
          .select('id')
          .eq('challenge_id', challengeId)
          .eq('user_id', userId)
          .gte('accepted_at', amendment.created_at)
          .limit(1);

        requiresLegalReAcceptance = !acceptance || acceptance.length === 0;
      }

      return {
        hasActiveWithdrawal,
        withdrawalDeadline,
        daysRemaining,
        amendmentId: amendment.id,
        amendmentNumber: amendment.amendment_number,
        scopeAreas,
        reason: amendment.reason,
        requiresLegalReAcceptance,
        solutionId,
        challengeTitle: challenge?.title ?? null,
      };
    },
    ...CACHE_FREQUENT,
  });
}

/* ─── Withdraw Mutation ──────────────────────────────────── */

interface WithdrawPayload {
  challengeId: string;
  challengeTitle: string;
  solutionId: string;
  userId: string;
  amendmentId: string;
}

export function useWithdrawSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WithdrawPayload): Promise<void> => {
      const { challengeId, challengeTitle, solutionId, userId, amendmentId } = payload;

      // 1. Try solutions table first, then challenge_submissions
      const { error: solErr } = await supabase
        .from('solutions')
        .update({
          selection_status: 'WITHDRAWN',
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', solutionId);

      if (solErr) {
        // Fallback: update challenge_submissions
        const { error: subErr } = await supabase
          .from('challenge_submissions')
          .update({
            status: 'WITHDRAWN',
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq('id', solutionId);

        if (subErr) throw new Error(subErr.message);
      }

      // 2. Audit trail
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        solution_id: solutionId,
        action: 'SOLVER_WITHDRAWN',
        method: 'manual',
        details: {
          amendment_id: amendmentId,
          reason: 'Material amendment withdrawal window',
        } as any,
        created_by: userId,
      });

      // 3. Notify challenge team (ID role holders)
      // Insert a generic notification for challenge management
      await supabase.from('cogni_notifications').insert({
        user_id: userId, // placeholder — ideally notify ID role holder
        notification_type: 'SOLVER_WITHDRAWN',
        title: 'Solver Withdrawn',
        message: `A solver has withdrawn from "${challengeTitle}" during the material amendment withdrawal window.`,
        challenge_id: challengeId,
        is_read: false,
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-amendment-status', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge', variables.challengeId] });
      toast.success('You have withdrawn from this challenge without penalty.');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'withdraw_solution' });
    },
  });
}

/* ─── Legal Re-Acceptance Mutation ────────────────────────── */

interface ReAcceptPayload {
  challengeId: string;
  userId: string;
  amendmentNumber: number;
}

export function useReAcceptLegal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReAcceptPayload): Promise<void> => {
      const { challengeId, userId, amendmentNumber } = payload;

      // Insert re-acceptance record
      const { error } = await supabase.from('legal_acceptance_ledger').insert({
        challenge_id: challengeId,
        user_id: userId,
        document_type: 'amendment_legal_terms',
        document_name: `Amendment #${amendmentNumber} — Updated Legal Terms`,
        accepted_at: new Date().toISOString(),
        phase_triggered: null,
        tier: 'TIER_1',
        created_by: userId,
      });

      if (error) throw new Error(error.message);

      // Audit
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'LEGAL_REACCEPTED',
        method: 'manual',
        details: {
          amendment_number: amendmentNumber,
          document_type: 'amendment_legal_terms',
        } as any,
        created_by: userId,
      });

      logInfo(`Legal terms re-accepted for amendment #${amendmentNumber}`, {
        operation: 'reaccept_legal',
        component: 'useSolverAmendmentStatus',
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-amendment-status', variables.challengeId] });
      toast.success('Legal terms accepted successfully');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'reaccept_legal' });
    },
  });
}
