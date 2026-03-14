/**
 * Upgrade Eligibility Query Hook
 * 
 * Checks if a certified provider is eligible to upgrade their expertise level.
 */

import { useQuery } from '@tanstack/react-query';
import { checkUpgradeEligibility } from '@/services/expertiseUpgradeService';
import { CACHE_STANDARD } from '@/config/queryCache';

export function useUpgradeEligibility(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['upgrade-eligibility', enrollmentId],
    queryFn: () => checkUpgradeEligibility(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: 60 * 1000, // 1 minute
  });
}
