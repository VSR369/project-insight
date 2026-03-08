/**
 * Re-Interview Eligibility Query Hook
 * 
 * Checks if a provider is eligible for re-interview after interview failure.
 */

import { useQuery } from '@tanstack/react-query';
import { checkReinterviewEligibility } from '@/services/interviewRetakeService';
import { useVisibilityPollingInterval } from '@/lib/useVisibilityPolling';

/**
 * Hook to check re-interview eligibility for an enrollment
 * 
 * @param enrollmentId - The enrollment to check
 * @returns Query result with eligibility details
 */
export function useReinterviewEligibility(enrollmentId: string | undefined) {
  const refetchInterval = useVisibilityPollingInterval(60 * 1000);

  return useQuery({
    queryKey: ['reinterview-eligibility', enrollmentId],
    queryFn: () => checkReinterviewEligibility(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: 60 * 1000,
    refetchInterval,
  });
}
