import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { extendChallengeDeadline, type ExtendDeadlineInput } from '@/services/cogniblend/lifecycle/stageDeadlines';

export function useExtendChallengeDeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExtendDeadlineInput) => extendChallengeDeadline(input),
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenges', input.challengeId] });
      toast.success('Deadline extended successfully');
    },
    onError: (e) => handleMutationError(e, { operation: 'extend_challenge_deadline', component: 'ExtendDeadline' }),
  });
}
