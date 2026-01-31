/**
 * Hook to detect first-time solution providers (no enrollments yet).
 * Used to show specialized onboarding experience on Industry Pulse.
 */

import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';

export function useIsFirstTimeProvider() {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: enrollments, isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);

  const isLoading = providerLoading || enrollmentsLoading;
  
  // First-time = no provider record OR provider exists but has zero enrollments
  const isFirstTime = !isLoading && (!provider || !enrollments || enrollments.length === 0);

  return {
    isFirstTime,
    isLoading,
    provider,
    enrollments,
    hasProvider: !!provider,
    enrollmentCount: enrollments?.length || 0,
  };
}
