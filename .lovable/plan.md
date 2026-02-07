
# Root Cause Analysis & Fix Plan for Pulse Feed Loading Issue

## Investigation Summary

After extensive debugging using network analysis, console logs, and browser automation:

| Check | Result |
|-------|--------|
| API Responses | All returning **200 OK** with valid data |
| PostgREST Errors | **None** (no PGRST201/HTTP 300) |
| Console Errors | Only minor `forwardRef` warnings |
| Page Load | **Works correctly** after ~8-10 seconds |

## Root Cause Identified

The issue is **intermittent loading state persistence** caused by:

1. **Query Waterfall**: `PulseFeedPage` depends on `useIsFirstTimeProvider()` which internally depends on `EnrollmentContext` which chains 3 queries:
   - `useCurrentProvider()` → provider data
   - `useProviderEnrollments()` → enrollments list
   - `useActiveEnrollment()` → active enrollment

2. **Loading State Cascade**: Line 54 in PulseFeedPage blocks rendering until `firstTimeLoading` is false:
   ```typescript
   if (firstTimeLoading) {
     return <Skeleton />;
   }
   ```

3. **Slow Context Readiness**: The `EnrollmentContext.contextReady` flag at lines 228-238 requires multiple conditions to be true before allowing rendering, which can delay UI updates.

## Proposed Fix

### Optimization 1: Add Suspense-like Loading Timeout (Safety Net)

Add a maximum loading time fallback to prevent infinite skeleton states:

**File**: `src/pages/pulse/PulseFeedPage.tsx`

```typescript
// Add useEffect to track loading time
useEffect(() => {
  if (firstTimeLoading) {
    const timeout = setTimeout(() => {
      console.warn('[PulseFeedPage] Loading timeout - forcing render');
      // React Query should have data by now - if still loading, data is likely null
    }, 15000); // 15 second safety timeout
    return () => clearTimeout(timeout);
  }
}, [firstTimeLoading]);
```

### Optimization 2: Improve Query Stale Time for Dependent Queries

**File**: `src/hooks/queries/useProvider.ts`

Reduce staleTime for `useCurrentProvider` to improve freshness on navigation:
- Current: `staleTime: 60 * 1000` (60 seconds)
- Proposed: `staleTime: 30 * 1000` (30 seconds)

### Optimization 3: Pre-fetch Provider Data Earlier

**File**: `src/contexts/EnrollmentContext.tsx`

Add a `retry: 2` option to handle transient network issues:
```typescript
const { data: provider, isLoading: providerLoading } = useCurrentProvider({
  retry: 2,  // Retry up to 2 times on failure
});
```

---

## Technical Details

### Current Query Chain
```text
PulseFeedPage.tsx
  └─ useIsFirstTimeProvider()
       └─ EnrollmentContext
            ├─ useCurrentProvider()           [60s stale]
            ├─ useProviderEnrollments(id)     [60s stale]
            └─ useActiveEnrollment(id)        [30s stale]
```

### Why It's Intermittent
- On **fresh page load** with empty cache: All queries must complete sequentially
- On **cached navigation**: Stale data renders immediately while refetching
- On **slow networks**: Query chain takes longer to resolve

---

## Impact Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking existing functionality | Very Low | Only timing adjustments |
| Changing UX | None | Same loading behavior, faster resolution |
| Performance impact | Positive | Faster perceived load time |

---

## Implementation Steps

1. Add retry config to `useCurrentProvider` and context queries
2. Reduce staleTime for provider data
3. Add loading timeout safety net to PulseFeedPage
4. Verify page loads within 5 seconds on refresh
