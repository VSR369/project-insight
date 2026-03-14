import { QueryClient } from "@tanstack/react-query";
import { CACHE_FREQUENT } from "@/config/queryCache";

/**
 * Shared React Query client with performance-optimized defaults.
 * Uses CACHE_FREQUENT tier as the global default.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...CACHE_FREQUENT,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
