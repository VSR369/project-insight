/**
 * useCancelChallenge — Mutation for permanently cancelling a challenge.
 *
 * Calls the cancel_challenge RPC, which enforces the agreed cancel-rights
 * rule server-side (Creator/Curator before publication; R6_AGG or R2 once
 * published; Senior Admin on written request after any submission) and
 * performs the cancellation steps atomically: phase_status → TERMINAL,
 * SLA timers completed, CHALLENGE_CANCELLED audit entry, role-holder
 * notifications.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/* ── Types ────────────────────────────────────────────────── */

interface CancelParams {
  challengeId: string;
  reason: string;
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCancelChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CancelParams) => {
      const { error } = await supabase.rpc('cancel_challenge', {
        p_challenge_id: params.challengeId,
        p_reason: params.reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Challenge cancelled.');
      queryClient.invalidateQueries({ queryKey: ['curation-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cancel-rights'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_challenge' });
    },
  });
}
