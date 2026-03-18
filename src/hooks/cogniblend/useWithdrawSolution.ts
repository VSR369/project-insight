/**
 * useWithdrawSolution — Hooks for the solver withdrawal workflow.
 *
 * Determines withdrawal context (pre-shortlist, post-shortlist, post-payment)
 * and handles the withdrawal mutation with audit logging and notifications.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export type WithdrawalTier = 'FREE' | 'NOTICE' | 'PENALTY';

export interface WithdrawalContext {
  tier: WithdrawalTier;
  isShortlisted: boolean;
  hasPartialPayment: boolean;
  paymentAmount: number | null;
  isMaterialAmendmentWindow: boolean;
  amendmentDeadline: string | null;
  canWithdraw: boolean;
}

/* ─── useWithdrawalContext ───────────────────────────────── */

export function useWithdrawalContext(
  challengeId: string | undefined,
  solutionId: string | undefined,
) {
  return useQuery({
    queryKey: ['withdrawal-context', challengeId, solutionId],
    queryFn: async (): Promise<WithdrawalContext> => {
      if (!challengeId || !solutionId) {
        return {
          tier: 'FREE',
          isShortlisted: false,
          hasPartialPayment: false,
          paymentAmount: null,
          isMaterialAmendmentWindow: false,
          amendmentDeadline: null,
          canWithdraw: false,
        };
      }

      // 1. Solution status
      const { data: solution, error: sErr } = await supabase
        .from('solutions')
        .select('id, selection_status, payment_status, phase_status')
        .eq('id', solutionId)
        .single();

      if (sErr) throw new Error(sErr.message);
      if (!solution) throw new Error('Solution not found');

      // Already withdrawn or terminal
      if (solution.phase_status === 'TERMINAL' || solution.phase_status === 'WITHDRAWN') {
        return {
          tier: 'FREE',
          isShortlisted: false,
          hasPartialPayment: false,
          paymentAmount: null,
          isMaterialAmendmentWindow: false,
          amendmentDeadline: null,
          canWithdraw: false,
        };
      }

      const isShortlisted = solution.selection_status === 'SHORTLISTED' ||
        solution.selection_status === 'APPROVED_SHORTLIST';

      const hasPartialPayment = solution.payment_status === 'PARTIAL' ||
        solution.payment_status === 'PARTIAL_PAID';

      // 2. Get payment amount from escrow if applicable
      let paymentAmount: number | null = null;
      if (hasPartialPayment) {
        const { data: escrow } = await supabase
          .from('escrow_records')
          .select('released_amount')
          .eq('challenge_id', challengeId)
          .maybeSingle();
        paymentAmount = escrow?.released_amount ?? null;
      }

      // 3. Check material amendment withdrawal window
      let isMaterialAmendmentWindow = false;
      let amendmentDeadline: string | null = null;
      const now = new Date().toISOString();

      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('withdrawal_deadline, scope_of_change')
        .eq('challenge_id', challengeId)
        .not('withdrawal_deadline', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (amendments && amendments.length > 0) {
        const latestDeadline = amendments[0].withdrawal_deadline;
        if (latestDeadline && latestDeadline > now) {
          isMaterialAmendmentWindow = true;
          amendmentDeadline = latestDeadline;
        }
      }

      // Determine tier
      let tier: WithdrawalTier = 'FREE';
      if (hasPartialPayment) {
        tier = 'PENALTY';
      } else if (isShortlisted) {
        tier = 'NOTICE';
      }

      return {
        tier,
        isShortlisted,
        hasPartialPayment,
        paymentAmount,
        isMaterialAmendmentWindow,
        amendmentDeadline,
        canWithdraw: true,
      };
    },
    enabled: !!challengeId && !!solutionId,
    ...CACHE_STANDARD,
  });
}

/* ─── useWithdrawSolution ────────────────────────────────── */

export function useWithdrawSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      solutionId,
      challengeId,
      userId,
      reason,
      tier,
      isMaterialAmendmentWindow,
    }: {
      solutionId: string;
      challengeId: string;
      userId: string;
      reason: string;
      tier: WithdrawalTier;
      isMaterialAmendmentWindow: boolean;
    }) => {
      const now = new Date().toISOString();

      // 1. Update solution to TERMINAL
      const withAudit = await withUpdatedBy({
        phase_status: 'TERMINAL',
        selection_status: 'WITHDRAWN',
        updated_at: now,
      });

      const { error: uErr } = await supabase
        .from('solutions')
        .update(withAudit as any)
        .eq('id', solutionId);

      if (uErr) throw new Error(uErr.message);

      // 2. Audit trail entry
      const { error: aErr } = await supabase
        .from('audit_trail')
        .insert({
          user_id: userId,
          action: 'SOLUTION_WITHDRAWN',
          method: 'UI',
          challenge_id: challengeId,
          solution_id: solutionId,
          details: {
            reason,
            withdrawal_tier: tier,
            material_amendment_window: isMaterialAmendmentWindow,
            timestamp: now,
          },
        });

      if (aErr) throw new Error(aErr.message);

      // 3. Notifications for post-shortlist or post-payment withdrawals
      if (tier === 'NOTICE' || tier === 'PENALTY') {
        // Get challenge title and role holders to notify
        const { data: challenge } = await supabase
          .from('challenges')
          .select('title')
          .eq('id', challengeId)
          .single();

        const challengeTitle = challenge?.title ?? 'Challenge';

        // Notify ID and ER role holders
        const { data: roleHolders } = await supabase
          .from('user_challenge_roles')
          .select('user_id')
          .eq('challenge_id', challengeId)
          .in('role_code', ['ID', 'ER'])
          .eq('is_active', true);

        const notificationType = tier === 'PENALTY'
          ? 'WITHDRAWAL_PENALTY_REVIEW'
          : 'SOLVER_WITHDRAWN';

        const notifications = (roleHolders ?? []).map(rh => ({
          user_id: rh.user_id,
          challenge_id: challengeId,
          notification_type: notificationType,
          title: tier === 'PENALTY'
            ? 'Solver withdrawal — Finance review required'
            : 'Solver has withdrawn',
          message: tier === 'PENALTY'
            ? `A shortlisted solver has withdrawn from "${challengeTitle}" after receiving partial payment. Finance Coordinator review required.`
            : `A shortlisted solver has withdrawn from "${challengeTitle}".`,
        }));

        if (notifications.length > 0) {
          await supabase.from('cogni_notifications').insert(notifications);
        }

        // For PENALTY tier, also notify FC role
        if (tier === 'PENALTY') {
          const { data: fcHolders } = await supabase
            .from('user_challenge_roles')
            .select('user_id')
            .eq('challenge_id', challengeId)
            .eq('role_code', 'FC')
            .eq('is_active', true);

          const fcNotifications = (fcHolders ?? []).map(fc => ({
            user_id: fc.user_id,
            challenge_id: challengeId,
            notification_type: 'WITHDRAWAL_PENALTY_REVIEW',
            title: 'Withdrawal payment review required',
            message: isMaterialAmendmentWindow
              ? `A solver withdrew from "${challengeTitle}" within the material amendment window. No payment return required.`
              : `A solver withdrew from "${challengeTitle}" after partial payment. Review whether payment return is required.`,
          }));

          if (fcNotifications.length > 0) {
            await supabase.from('cogni_notifications').insert(fcNotifications);
          }
        }
      }

      return { tier };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-solution', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-context', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['screening-review', variables.challengeId] });
      toast.success('Solution withdrawn successfully.');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'withdraw_solution' });
    },
  });
}
