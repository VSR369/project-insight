
# Performance Analysis & Optimization Plan

## Executive Summary

After analyzing the codebase, I identified **7 major performance bottlenecks** causing the system slowness. The issues fall into three categories: excessive API calls, missing cache optimization, and waterfall data fetching patterns.

---

## Root Cause Analysis (5-Why)

### Why #1: Why is the system slow?
Too many Supabase API calls happening simultaneously and redundantly.

### Why #2: Why are there too many API calls?
- Multiple components calling the same hooks independently
- Aggressive polling intervals (5-30 seconds) on multiple queries
- No global QueryClient configuration for caching defaults

### Why #3: Why do multiple components call the same hooks?
- `useCurrentProvider()` is called in many places (EnrollmentContext, Dashboard, Pulse pages, etc.)
- `useIsFirstTimeProvider()` internally calls `useCurrentProvider()` + `useProviderEnrollments()` — creating additional calls
- Each Pulse page creates its own provider/enrollment queries

### Why #4: Why is there no cache optimization?
- QueryClient has NO default `staleTime` or `gcTime` configured
- Only some hooks have `staleTime: 30000` — many have none
- Reference/master data lacks proper cache settings

### Why #5: Why wasn't this caught earlier?
Development with fast network masked the cumulative effect of redundant queries + polling intervals.

---

## Performance Bottlenecks Identified

| # | Issue | Impact | Severity |
|---|-------|--------|----------|
| 1 | **Missing QueryClient defaults** | Every query refetches on mount by default | 🔴 Critical |
| 2 | **Aggressive polling intervals** | 30s feed polling + 5s detail polling = constant network traffic | 🔴 Critical |
| 3 | **Duplicate provider queries** | `useCurrentProvider()` called 5-10x on single page load | 🟠 High |
| 4 | **Waterfall pattern in EnrollmentContext** | Provider → Enrollments → Active Enrollment (sequential) | 🟠 High |
| 5 | **useIsFirstTimeProvider creates double queries** | Calls both `useCurrentProvider` and `useProviderEnrollments` | 🟠 High |
| 6 | **No refetchOnWindowFocus=false for stable data** | Tab focus triggers refetch storms | 🟡 Medium |
| 7 | **Missing gcTime on reference data** | Master data refetched too frequently | 🟡 Medium |

---

## Technical Details

### Issue 1: Missing QueryClient Defaults

**Current (src/lib/queryClient.ts):**
```typescript
export const queryClient = new QueryClient();  // No defaults!
```

Every query with no explicit `staleTime` is considered stale immediately, causing refetches on every component mount.

**Fix:** Add global defaults:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds default
      gcTime: 5 * 60 * 1000,     // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

### Issue 2: Aggressive Polling Intervals

**Current polling in src/constants/pulse.constants.ts:**
```typescript
export const PULSE_POLLING_INTERVALS = {
  FEED_MS: 30 * 1000,           // Feed refetches every 30s
  ACTIVE_CONTENT_MS: 5 * 1000,  // Detail pages refetch every 5s!
  NOTIFICATIONS_MS: 30 * 1000,
};
```

**Impact:** On `/pulse/feed`, multiple queries poll simultaneously:
- `useUnifiedPulseFeed` (30s)
- `useProviderStats` (60s)
- `useOnlineNetworkCount` (60s)
- Engagement counts (5s on detail pages)

**Fix:** Increase intervals and add conditional polling:
```typescript
export const PULSE_POLLING_INTERVALS = {
  FEED_MS: 60 * 1000,           // 60 seconds (doubled)
  ACTIVE_CONTENT_MS: 15 * 1000, // 15 seconds (tripled)
  NOTIFICATIONS_MS: 60 * 1000,  // 60 seconds (doubled)
};
```

Also add `refetchOnWindowFocus: false` to polling queries (they already poll, no need for focus refetch).

---

### Issue 3: Duplicate Provider Queries

**Problem:** Multiple hooks all call `useCurrentProvider()`:
- `EnrollmentContext` (line 57)
- `Dashboard` (line 68)
- All Pulse pages via `useIsFirstTimeProvider`
- Individual components

**Current network pattern (on Dashboard load):**
```
GET /solution_providers?user_id=...  ← EnrollmentContext
GET /solution_providers?user_id=...  ← Dashboard useCurrentProvider
GET /solution_providers?user_id=...  ← useIsFirstTimeProvider
```

**Fix:** React Query deduplication should handle this, but only if all calls use the same query key AND `staleTime > 0`. Since `staleTime` is missing in many places, these become separate requests.

**Solution:**
1. Set global `staleTime` default (Issue 1 fix)
2. Consider removing `useCurrentProvider` from pages that already access it via context

---

### Issue 4: Waterfall Pattern in EnrollmentContext

**Current flow (sequential):**
```
1. useCurrentProvider()        → wait for response
2. useProviderEnrollments(id)  → wait for response (needs provider.id)
3. useActiveEnrollment(id)     → wait for response (needs provider.id)
```

**Impact:** 3 sequential network calls before context is ready (~300-500ms each = 1-1.5s total).

**Fix Options:**
1. Create a combined RPC function that returns provider + enrollments in one call
2. Use React Query's `enabled` smarter to parallelize where possible
3. Preload enrollments on auth success

---

### Issue 5: useIsFirstTimeProvider Double Queries

**Current (src/hooks/useIsFirstTimeProvider.ts):**
```typescript
export function useIsFirstTimeProvider() {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: enrollments, isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  // ...
}
```

This creates 2 queries. When called alongside `EnrollmentContext` (which already has both), it's redundant.

**Fix:** Use EnrollmentContext data instead:
```typescript
export function useIsFirstTimeProvider() {
  const { provider, enrollments, isLoading } = useEnrollmentContext();
  // ... derive isFirstTime from context
}
```

---

### Issue 6: refetchOnWindowFocus for Stable Data

**Current in useCurrentProvider:**
```typescript
refetchOnWindowFocus: true, // Refetch when user returns to tab
```

When user switches tabs and returns, ALL queries with this setting refetch. This causes a "refetch storm" on tab return.

**Fix:** Disable for data that doesn't need instant freshness:
```typescript
refetchOnWindowFocus: false, // Provider data is stable enough
```

---

### Issue 7: Missing gcTime on Reference Data

**Current:** Many master data hooks have no `gcTime`, so data is garbage collected after React Query's default (5 minutes is ok, but some hooks don't even have `staleTime`).

**Fix:** Add consistent cache settings to all master data hooks:
```typescript
// For static/semi-static data
{
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 30 * 60 * 1000,     // 30 minutes
}
```

---

## Implementation Plan

### Phase 1: Quick Wins (Immediate Impact)

| File | Change | Impact |
|------|--------|--------|
| `src/lib/queryClient.ts` | Add default `staleTime: 30000`, `gcTime: 300000`, `refetchOnWindowFocus: false` | Reduces 50%+ of redundant queries |
| `src/constants/pulse.constants.ts` | Double polling intervals (60s/15s/60s) | Reduces polling load by 50% |

### Phase 2: Hook Optimization (Medium-term)

| File | Change | Impact |
|------|--------|--------|
| `src/hooks/useIsFirstTimeProvider.ts` | Rewrite to use EnrollmentContext instead of calling hooks directly | Eliminates 2 duplicate queries per page |
| Remove duplicate `useCurrentProvider()` calls | Pages using EnrollmentContext shouldn't also call useCurrentProvider | Reduces query duplication |
| `src/hooks/queries/useProvider.ts` | Set `refetchOnWindowFocus: false` | Prevents tab-return refetch storm |

### Phase 3: Advanced Optimization (Long-term)

| Change | Impact |
|--------|--------|
| Create RPC function `get_provider_with_enrollments()` | Single DB call instead of 3 sequential |
| Implement React Query `placeholderData` | Instant UI with background updates |
| Add query prefetching on login | Reduces initial dashboard load time |

---

## Expected Results

| Metric | Before | After (Phase 1+2) |
|--------|--------|-------------------|
| API calls on Dashboard load | ~15-20 | ~5-7 |
| Time to interactive | ~2-3s | ~1s |
| Polling calls per minute | ~4-6 per query | ~1-2 per query |
| Tab return refetches | All queries | Critical queries only |

---

## Files to Modify

### Phase 1 (Critical)
1. `src/lib/queryClient.ts` - Add default options
2. `src/constants/pulse.constants.ts` - Increase polling intervals

### Phase 2 (High Impact)
3. `src/hooks/useIsFirstTimeProvider.ts` - Use context instead of hooks
4. `src/hooks/queries/useProvider.ts` - Disable refetchOnWindowFocus
5. `src/hooks/queries/useProviderEnrollments.ts` - Optimize cache settings

### Phase 3 (Future)
6. Create combined RPC for provider+enrollments
7. Add prefetching logic

---

## Monitoring Recommendations

After implementing fixes:
1. Use React Query DevTools to monitor cache hit rates
2. Check Network tab for reduced API call frequency
3. Measure Time to Interactive (TTI) before/after
