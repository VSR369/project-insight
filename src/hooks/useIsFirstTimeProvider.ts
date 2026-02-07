/**
 * Hook to detect first-time solution providers (no enrollments yet).
 * Used to show specialized onboarding experience on Industry Pulse.
 * 
 * PERFORMANCE: Uses EnrollmentContext to avoid duplicate queries.
 * Previously called useCurrentProvider + useProviderEnrollments independently,
 * creating redundant API calls when EnrollmentContext already fetches both.
 */

import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';

export function useIsFirstTimeProvider() {
  // Try to use context first (most efficient - already loaded)
  const enrollmentContext = useOptionalEnrollmentContext();
  
  // Fallback hooks for when context is not available
  // These are only called if context is undefined
  const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider();
  const { data: fallbackEnrollments, isLoading: fallbackEnrollmentsLoading } = useProviderEnrollments(
    enrollmentContext ? undefined : fallbackProvider?.id
  );

  // Use context data if available, otherwise use fallback hooks
  if (enrollmentContext) {
    const { enrollments, isLoading } = enrollmentContext;
    
    // Get provider from the first enrollment or fetch separately
    // EnrollmentContext uses useCurrentProvider internally, so we need that data
    const provider = fallbackProvider;
    const providerLoading = fallbackProviderLoading;
    
    const combinedLoading = isLoading || providerLoading;
    
    // First-time = no provider record OR provider exists but has zero enrollments
    const isFirstTime = !combinedLoading && (!provider || !enrollments || enrollments.length === 0);

    return {
      isFirstTime,
      isLoading: combinedLoading,
      provider,
      enrollments,
      hasProvider: !!provider,
      enrollmentCount: enrollments?.length || 0,
    };
  }

  // Fallback path when outside EnrollmentProvider
  const isLoading = fallbackProviderLoading || fallbackEnrollmentsLoading;
  
  // First-time = no provider record OR provider exists but has zero enrollments
  const isFirstTime = !isLoading && (!fallbackProvider || !fallbackEnrollments || fallbackEnrollments.length === 0);

  return {
    isFirstTime,
    isLoading,
    provider: fallbackProvider,
    enrollments: fallbackEnrollments,
    hasProvider: !!fallbackProvider,
    enrollmentCount: fallbackEnrollments?.length || 0,
  };
}
