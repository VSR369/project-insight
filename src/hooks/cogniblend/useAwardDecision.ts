import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAwardChallenges, fetchLatestAwardDecision } from '@/services/cogniblend/lifecycle/awardDecisionService';

export function useAwardChallenges() {
  return useQuery({ queryKey: ['challenges', { award: true }], queryFn: fetchAwardChallenges, staleTime: 30_000 });
}

export function useLatestAwardDecision(challengeId: string | null) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'award-decisions'],
    queryFn: () => fetchLatestAwardDecision(challengeId as string),
    enabled: !!challengeId,
    staleTime: 0,
  });
}
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import {
  recommendAward, confirmAward, returnAward, countersignAward,
  type AwardOutcome, type AwardLineInput,
} from '@/services/cogniblend/lifecycle/awardDecisionService';

function useInvalidateChallenge(): (challengeId: string) => void {
  const qc = useQueryClient();
  return (challengeId: string) => {
    qc.invalidateQueries({ queryKey: ['challenges'] });
    qc.invalidateQueries({ queryKey: ['challenges', challengeId] });
    qc.invalidateQueries({ queryKey: ['challenges', challengeId, 'award-decisions'] });
  };
}

export function useRecommendAward() {
  const invalidate = useInvalidateChallenge();
  return useMutation({
    mutationFn: (p: { challengeId: string; outcome: AwardOutcome; lines?: AwardLineInput[]; note?: string }) => recommendAward(p),
    onSuccess: (_d, p) => { invalidate(p.challengeId); toast.success('Award recommendation sent for confirmation'); },
    onError: (e) => handleMutationError(e, { operation: 'recommend_award', component: 'useRecommendAward' }),
  });
}

export function useConfirmAward() {
  const invalidate = useInvalidateChallenge();
  return useMutation({
    mutationFn: (p: { challengeId: string; decisionId: string }) => confirmAward(p.decisionId),
    onSuccess: (_d, p) => { invalidate(p.challengeId); toast.success('Award confirmed'); },
    onError: (e) => handleMutationError(e, { operation: 'confirm_award', component: 'useConfirmAward' }),
  });
}

export function useReturnAward() {
  const invalidate = useInvalidateChallenge();
  return useMutation({
    mutationFn: (p: { challengeId: string; decisionId: string; reason: string }) => returnAward(p.decisionId, p.reason),
    onSuccess: (_d, p) => { invalidate(p.challengeId); toast.success('Award returned to the recommender'); },
    onError: (e) => handleMutationError(e, { operation: 'return_award', component: 'useReturnAward' }),
  });
}

export function useCountersignAward() {
  const invalidate = useInvalidateChallenge();
  return useMutation({
    mutationFn: (p: { challengeId: string; decisionId: string }) => countersignAward(p.decisionId),
    onSuccess: (_d, p) => { invalidate(p.challengeId); toast.success('Award countersigned'); },
    onError: (e) => handleMutationError(e, { operation: 'countersign_award', component: 'useCountersignAward' }),
  });
}
