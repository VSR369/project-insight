/**
 * Hook to detect first-time solution providers (no enrollments yet).
 * Used to show specialized onboarding experience on Industry Pulse.
 * 
 * PERFORMANCE: Uses EnrollmentContext exclusively when available.
 * Fallback hooks are ONLY called when outside EnrollmentProvider,
 * using the `enabled` option to prevent duplicate queries.
 */

import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';

export function useIsFirstTimeProvider() {
  // Try to use context first (most efficient - already loaded)
  const enrollmentContext = useOptionalEnrollmentContext();
  
  // Determine if we need fallback hooks (only when outside EnrollmentProvider)
  const needsFallback = !enrollmentContext;
  
  // Fallback hooks - ONLY called when context is undefined
  // The `enabled: needsFallback` prevents these queries from running when context exists
  const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider({
    enabled: needsFallback, // Only fetch when outside EnrollmentProvider
  });
  const { data: fallbackEnrollments, isLoading: fallbackEnrollmentsLoading } = useProviderEnrollments(
    needsFallback ? fallbackProvider?.id : undefined
  );

  // Use context data if available (prevents duplicate queries)
  if (enrollmentContext) {
    const { enrollments, isLoading, provider, providerLoading } = enrollmentContext;
    
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
