/**
 * useChallengeHold — Mutations for putting a challenge on hold and resuming.
 *
 * On Hold:
 *   1. SET phase_status = 'ON_HOLD'
 *   2. PAUSE active SLA timers for current phase
 *   3. Log audit: PHASE_ON_HOLD
 *   4. Notify all role holders
 *
 * Resume:
 *   1. SET phase_status = 'ACTIVE'
 *   2. Recalculate SLA timers (started_at = now, deadline_at = now + remaining)
 *   3. Log audit: PHASE_RESUMED
 *   4. Notify all role holders
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ────────────────────────────────────────────────── */

interface HoldParams {
  challengeId: string;
  challengeTitle: string;
  currentPhase: number;
  userId: string;
  reason: string;
}

interface ResumeParams {
  challengeId: string;
  challengeTitle: string;
  currentPhase: number;
  userId: string;
}

/* ── Notify all role holders helper ──────────────────────── */

async function notifyRoleHolders(
  challengeId: string,
  title: string,
  message: string,
  notificationType: string,
) {
  // Fetch all active role holders for this challenge
  const { data: roleHolders } = await supabase
    .from('user_challenge_roles')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('is_active', true);

  if (!roleHolders?.length) return;

  // Deduplicate user IDs
  const uniqueUserIds = [...new Set(roleHolders.map((r) => r.user_id))];

  // Insert notifications for each user
  const notifications = uniqueUserIds.map((userId) => ({
    user_id: userId,
    challenge_id: challengeId,
    notification_type: notificationType,
    title,
    message,
  }));

  await supabase.from('cogni_notifications').insert(notifications);
}

/* ── usePutOnHold ─────────────────────────────────────────── */

export function usePutOnHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: HoldParams) => {
      // 1. Update phase_status
      const { error: updateErr } = await supabase
        .from('challenges')
        .update({ phase_status: 'ON_HOLD' })
        .eq('id', params.challengeId);
      if (updateErr) throw new Error(updateErr.message);

      // 2. Pause active SLA timers for current phase
      const { error: slaErr } = await supabase
        .from('sla_timers')
        .update({ status: 'PAUSED' })
        .eq('challenge_id', params.challengeId)
        .eq('phase', params.currentPhase)
        .eq('status', 'ACTIVE');
      if (slaErr) throw new Error(slaErr.message);

      // 3. Log audit
      await supabase.rpc('log_audit', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_solution_id: '',
        p_action: 'PHASE_ON_HOLD',
        p_method: 'UI',
        p_phase_from: params.currentPhase,
        p_phase_to: params.currentPhase,
        p_details: { reason: params.reason } as unknown as Json,
      });

      // 4. Notify all role holders
      await notifyRoleHolders(
        params.challengeId,
        'Challenge Put On Hold',
        `Challenge "${params.challengeTitle}" has been put on hold. Reason: ${params.reason}`,
        'PHASE_ON_HOLD',
      );
    },
    onSuccess: () => {
      toast.success('Challenge put on hold.');
      queryClient.invalidateQueries({ queryKey: ['curation-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'put_on_hold' });
    },
  });
}

/* ── useResumeChallenge ──────────────────────────────────── */

export function useResumeChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResumeParams) => {
      // 1. Update phase_status
      const { error: updateErr } = await supabase
        .from('challenges')
        .update({ phase_status: 'ACTIVE' })
        .eq('id', params.challengeId);
      if (updateErr) throw new Error(updateErr.message);

      // 2. Recalculate SLA timers: fetch paused timers, compute remaining, update
      const { data: pausedTimers, error: fetchErr } = await supabase
        .from('sla_timers')
        .select('timer_id, started_at, deadline_at')
        .eq('challenge_id', params.challengeId)
        .eq('phase', params.currentPhase)
        .eq('status', 'PAUSED');
      if (fetchErr) throw new Error(fetchErr.message);

      if (pausedTimers?.length) {
        const now = new Date();
        for (const timer of pausedTimers) {
          // Remaining = original deadline - original start (the full duration, since we paused it)
          const originalStart = new Date(timer.started_at);
          const originalDeadline = new Date(timer.deadline_at);
          const remainingMs = originalDeadline.getTime() - originalStart.getTime();
          const newDeadline = new Date(now.getTime() + remainingMs);

          await supabase
            .from('sla_timers')
            .update({
              started_at: now.toISOString(),
              deadline_at: newDeadline.toISOString(),
              status: 'ACTIVE',
            })
            .eq('timer_id', timer.timer_id);
        }
      }

      // 3. Log audit
      await supabase.rpc('log_audit', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_solution_id: '',
        p_action: 'PHASE_RESUMED',
        p_method: 'UI',
        p_phase_from: params.currentPhase,
        p_phase_to: params.currentPhase,
      });

      // 4. Notify all role holders
      await notifyRoleHolders(
        params.challengeId,
        'Challenge Resumed',
        `Challenge "${params.challengeTitle}" has been resumed and is now active again.`,
        'PHASE_RESUMED',
      );
    },
    onSuccess: () => {
      toast.success('Challenge resumed.');
      queryClient.invalidateQueries({ queryKey: ['curation-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'resume_challenge' });
    },
  });
}
