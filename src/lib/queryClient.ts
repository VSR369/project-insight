import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client.
 *
 * NOTE: This lives in its own module to avoid circular imports between
 * App.tsx (providers) and auth/session plumbing (useAuth.tsx).
 */
export const queryClient = new QueryClient();
