import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { fetchStageDeadlines, saveStageDeadlines, type ChallengeDeadlines } from '@/services/cogniblend/lifecycle/stageDeadlines';

export function useStageDeadlines(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'stage-deadlines'],
    queryFn: () => fetchStageDeadlines(challengeId as string),
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function useSaveStageDeadlines(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (d: ChallengeDeadlines) => saveStageDeadlines(challengeId as string, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', challengeId] });
      toast.success('Stages and deadlines saved successfully');
    },
    onError: (e) => handleMutationError(e, { operation: 'save_stage_deadlines', component: 'StageDeadlinesCard' }),
  });
}
