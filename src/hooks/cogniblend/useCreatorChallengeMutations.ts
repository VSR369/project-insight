/**
 * useCreatorChallengeMutations — Approve/RequestChanges mutations
 * extracted from CreatorChallengeDetailView (Batch B).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useCreatorChallengeMutations(challengeId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'COMPLETED' } as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CR_APPROVED_CURATION',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {} as any,
      });
    },
    onSuccess: () => {
      toast.success('Challenge approved — proceeding to publication.');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge'] });
    },
    onError: (err: Error) => toast.error(`Approval failed: ${err.message}`),
  });

  const requestChangesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'RETURNED' } as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CR_REQUESTED_CHANGES',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {} as any,
      });
    },
    onSuccess: () => {
      toast.success('Returned to Curator for further refinement.');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge'] });
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  return { approveMutation, requestChangesMutation };
}
