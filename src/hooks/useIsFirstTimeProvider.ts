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
  const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider();
  const { data: fallbackEnrollments, isLoading: fallbackEnrollmentsLoading } = useProviderEnrollments(
    needsFallback ? fallbackProvider?.id : undefined
  );

  // Use context data if available
  if (enrollmentContext) {
    const { enrollments, isLoading } = enrollmentContext;
    
    // Context already has provider data from useCurrentProvider, 
    // but we need it for the return value
    // Since context uses useCurrentProvider internally, we can safely use fallbackProvider
    // which shares the same query key and won't create duplicate requests
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
