/**
 * useCancelChallenge — Mutation for permanently cancelling a challenge.
 *
 * Steps:
 *   1. SET phase_status = 'TERMINAL' (master_status → 'CANCELLED' via DB trigger)
 *   2. Complete any active/paused SLA timers as COMPLETED
 *   3. Log audit: CHALLENGE_CANCELLED
 *   4. Notify all role holders
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ────────────────────────────────────────────────── */

interface CancelParams {
  challengeId: string;
  challengeTitle: string;
  currentPhase: number;
  userId: string;
  reason: string;
}

/* ── Notify all role holders helper ──────────────────────── */

async function notifyRoleHolders(
  challengeId: string,
  title: string,
  message: string,
) {
  const { data: roleHolders } = await supabase
    .from('user_challenge_roles')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('is_active', true);

  if (!roleHolders?.length) return;

  const uniqueUserIds = [...new Set(roleHolders.map((r) => r.user_id))];

  const notifications = uniqueUserIds.map((userId) => ({
    user_id: userId,
    challenge_id: challengeId,
    notification_type: 'CHALLENGE_CANCELLED',
    title,
    message,
  }));

  await supabase.from('cogni_notifications').insert(notifications);
}

/* ── Role permission check ───────────────────────────────── */

/**
 * Determines if the current user can cancel based on phase + role rules:
 *   Phase 1 → AM or RQ (initiator)
 *   Phase 2 → CR (creator)
 *   Phase 3+ → ID only (Innovation Director)
 */
export function canCancelChallenge(
  currentPhase: number,
  userRoleCodes: string[],
): boolean {
  if (currentPhase === 1) {
    return userRoleCodes.some((r) => r === 'AM' || r === 'RQ');
  }
  if (currentPhase === 2) {
    return userRoleCodes.includes('CR');
  }
  // Phase 3+
  return userRoleCodes.includes('ID');
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCancelChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CancelParams) => {
      // 1. Set phase_status to TERMINAL (trigger handles master_status → CANCELLED)
      const { error: updateErr } = await supabase
        .from('challenges')
        .update({ phase_status: 'TERMINAL' })
        .eq('id', params.challengeId);
      if (updateErr) throw new Error(updateErr.message);

      // 2. Complete any active/paused SLA timers
      const { error: slaErr } = await supabase
        .from('sla_timers')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('challenge_id', params.challengeId)
        .in('status', ['ACTIVE', 'PAUSED']);
      if (slaErr) throw new Error(slaErr.message);

      // 3. Log audit
      await supabase.rpc('log_audit', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_solution_id: '',
        p_action: 'CHALLENGE_CANCELLED',
        p_method: 'UI',
        p_phase_from: params.currentPhase,
        p_phase_to: params.currentPhase,
        p_details: { reason: params.reason } as unknown as Json,
      });

      // 4. Notify all role holders
      await notifyRoleHolders(
        params.challengeId,
        'Challenge Cancelled',
        `Challenge "${params.challengeTitle}" has been cancelled. Reason: ${params.reason}`,
      );
    },
    onSuccess: () => {
      toast.success('Challenge cancelled.');
      queryClient.invalidateQueries({ queryKey: ['curation-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_challenge' });
    },
  });
}
