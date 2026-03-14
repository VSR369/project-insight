/**
 * Centralized React Query Cache Tiers (PERF-M01)
 *
 * Standardizes staleTime and gcTime across all hooks.
 * Import the appropriate tier constant instead of inline numbers.
 *
 * Tier reference (from Enterprise Architecture §6.3):
 *   REAL_TIME  — Always fresh (live dashboards, notifications)
 *   FREQUENT   — User-specific data, moderately dynamic
 *   STANDARD   — Default for most entity queries
 *   STABLE     — Reference/master data, rarely changes
 *   STATIC     — System config, almost never changes
 */

/** Always refetch — live data, notifications, real-time counters */
export const CACHE_REAL_TIME = {
  staleTime: 5 * 1000,          // 5 seconds
  gcTime: 60 * 1000,            // 1 minute
} as const;

/** User-specific data — moderately dynamic */
export const CACHE_FREQUENT = {
  staleTime: 30 * 1000,         // 30 seconds
  gcTime: 5 * 60 * 1000,        // 5 minutes
} as const;

/** Default tier — typical entity lists and details */
export const CACHE_STANDARD = {
  staleTime: 2 * 60 * 1000,     // 2 minutes
  gcTime: 10 * 60 * 1000,       // 10 minutes
} as const;

/** Reference/master data — countries, industries, levels */
export const CACHE_STABLE = {
  staleTime: 5 * 60 * 1000,     // 5 minutes
  gcTime: 30 * 60 * 1000,       // 30 minutes
} as const;

/** System config — almost never changes */
export const CACHE_STATIC = {
  staleTime: 30 * 60 * 1000,    // 30 minutes
  gcTime: 60 * 60 * 1000,       // 1 hour
} as const;
