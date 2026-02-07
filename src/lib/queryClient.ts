import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client with performance-optimized defaults.
 *
 * Global defaults prevent unnecessary refetches:
 * - staleTime: 30s - data considered fresh, no refetch on mount
 * - gcTime: 5min - keep inactive data in cache
 * - refetchOnWindowFocus: false - prevent refetch storms on tab return
 * - retry: 1 - single retry on failure
 *
 * NOTE: This lives in its own module to avoid circular imports between
 * App.tsx (providers) and auth/session plumbing (useAuth.tsx).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,           // 30 seconds - data considered fresh
      gcTime: 5 * 60 * 1000,          // 5 minutes - garbage collection
      refetchOnWindowFocus: false,    // Prevent tab-return refetch storms
      retry: 1,                        // Single retry on failure
    },
  },
});
