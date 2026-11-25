/**
 * Award candidates for the Selection & Award screen (DEF-0008 repair).
 * Server rules decide who may recommend; this only reads the candidates.
 */
import { useQuery } from '@tanstack/react-query';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { fetchAwardCandidates } from '@/services/cogniblend/lifecycle/awardCandidates';

export function useAwardCandidates(challengeId: string | null) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'award-candidates'],
    queryFn: () => fetchAwardCandidates(challengeId as string),
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
    meta: {
      onError: (e: Error) => handleQueryError(e, { operation: 'fetch_award_candidates' }),
    },
  });
}
