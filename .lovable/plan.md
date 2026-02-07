

# Performance Optimization - Remaining Implementation Plan

## Overview

This plan completes the remaining 15% of performance optimizations while **preserving all current functionality**. The changes are surgical and focused on eliminating redundant queries and optimizing data fetching.

---

## Remaining Issues to Address

| Issue | Current State | Fix Required |
|-------|---------------|--------------|
| 1. useIsFirstTimeProvider still calls useCurrentProvider() | Line 23 calls hook unconditionally | Make it conditional with `enabled` flag |
| 2. EnrollmentContext doesn't expose provider | Forces child hooks to re-fetch | Expose provider in context value |
| 3. useHierarchyResolverOptimized uses SELECT * | 5 tables with full payload | Replace with specific columns |
| 4. assessmentService uses SELECT * | 2 queries over-fetching | Replace with specific columns |
| 5. No React.lazy() for routes | 50+ pages loaded upfront | Add code splitting for heavy routes |

---

## Phase 1: Fix useIsFirstTimeProvider (Critical)

### Problem
The hook calls `useCurrentProvider()` at line 23 **unconditionally**, even when `enrollmentContext` exists. This causes duplicate queries because:
1. EnrollmentContext already calls `useCurrentProvider()`
2. The hook calls it again independently

### Solution
Modify `useCurrentProvider()` to accept an `enabled` option, then pass `enabled: !enrollmentContext` to prevent duplicate fetching.

### File: `src/hooks/queries/useProvider.ts`

**Change 1:** Add options parameter to `useCurrentProvider()`

```typescript
// Lines 22-30 - Add options parameter
export function useCurrentProvider(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['current-provider'],
    queryFn: fetchCurrentProvider,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false, // Default to true if not specified
  });
}
```

### File: `src/hooks/useIsFirstTimeProvider.ts`

**Change 2:** Pass `enabled: false` when context is available

```typescript
// Lines 21-26 - Make useCurrentProvider conditional
const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider({
  enabled: needsFallback, // Only fetch when outside EnrollmentProvider
});
```

---

## Phase 2: Expose Provider from EnrollmentContext

### Problem
`useIsFirstTimeProvider` needs provider data but context doesn't expose it, forcing duplicate queries.

### Solution
Expose `provider` and `providerLoading` from `EnrollmentContext` so child components can use context data directly.

### File: `src/contexts/EnrollmentContext.tsx`

**Change 1:** Add to interface (lines 12-48)

```typescript
interface EnrollmentContextType {
  // ... existing fields ...
  
  /** The current provider data (exposed for child hooks) */
  provider: ProviderData | null;
  
  /** Whether provider data is loading */
  providerLoading: boolean;
}
```

**Change 2:** Add provider type import (line 9)

```typescript
import { useCurrentProvider, type ProviderData } from '@/hooks/queries/useProvider';
```

Note: Need to export ProviderData type from useProvider.ts

**Change 3:** Expose in context value (lines 234-247)

```typescript
const value: EnrollmentContextType = {
  enrollments,
  activeEnrollment,
  activeEnrollmentId: activeEnrollment?.id ?? null,
  activeIndustryId: activeEnrollment?.industry_segment_id ?? null,
  setActiveEnrollment,
  switchToIndustry,
  isLoading,
  hasMultipleIndustries,
  activeLifecycleRank,
  activeLifecycleStatus,
  refreshEnrollments,
  contextReady,
  provider: provider ?? null,      // ADD THIS
  providerLoading,                  // ADD THIS
};
```

### File: `src/hooks/useIsFirstTimeProvider.ts`

**Change 4:** Use context.provider instead of fallback

```typescript
// Updated logic when context is available
if (enrollmentContext) {
  const { enrollments, isLoading, provider, providerLoading } = enrollmentContext;
  
  const combinedLoading = isLoading || providerLoading;
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
```

---

## Phase 3: Optimize useHierarchyResolverOptimized Selects

### Problem
The hook uses `SELECT *` for 5 tables, fetching unnecessary columns.

### Solution
Replace with specific column selects for each table.

### File: `src/hooks/queries/useHierarchyResolverOptimized.ts`

**Change lines 178-203:**

```typescript
const [
  { data: industrySegments, error: isError },
  { data: expertiseLevels, error: elError },
  { data: proficiencyAreas, error: paError },
  { data: subDomains, error: sdError },
  { data: specialities, error: spError },
] = await Promise.all([
  supabase
    .from("industry_segments")
    .select("id, name, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true }),
  supabase
    .from("expertise_levels")
    .select("id, name, level_number, display_order, is_active")
    .eq("is_active", true)
    .order("level_number", { ascending: true }),
  supabase
    .from("proficiency_areas")
    .select("id, name, industry_segment_id, expertise_level_id, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true }),
  supabase
    .from("sub_domains")
    .select("id, name, proficiency_area_id, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true }),
  supabase
    .from("specialities")
    .select("id, name, sub_domain_id, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true }),
]);
```

---

## Phase 4: Optimize assessmentService Selects

### Problem
Two functions use `SELECT *` when only specific columns are needed.

### File: `src/services/assessmentService.ts`

**Change 1:** Lines 254-261 - `getActiveAssessmentAttempt()`

```typescript
const { data, error } = await supabase
  .from('assessment_attempts')
  .select('id, provider_id, enrollment_id, total_questions, answered_questions, started_at, submitted_at, score_percentage, is_passed, time_limit_minutes, questions_data')
  .eq('provider_id', providerId)
  .is('submitted_at', null)
  .order('started_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Change 2:** Lines 371-375 - `getAssessmentHistory()`

```typescript
const { data, error } = await supabase
  .from('assessment_attempts')
  .select('id, provider_id, enrollment_id, total_questions, answered_questions, started_at, submitted_at, score_percentage, is_passed')
  .eq('provider_id', providerId)
  .order('started_at', { ascending: false });
```

---

## Phase 5: Add React.lazy() Code Splitting (Medium Priority)

### Problem
All 50+ page components are bundled together, increasing initial load time.

### Solution
Convert heavy/less-used pages to lazy imports. Keep frequently used pages (Login, Dashboard, PulseFeed) as regular imports for instant load.

### File: `src/App.tsx`

**Change 1:** Add imports at top of file

```typescript
import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Route loading fallback
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  </div>
);
```

**Change 2:** Convert admin pages to lazy imports (lines 61-91)

```typescript
// Admin Pages (lazy loaded - less frequently used)
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const CountriesPage = lazy(() => import('@/pages/admin/countries').then(m => ({ default: m.CountriesPage })));
const IndustrySegmentsPage = lazy(() => import('@/pages/admin/industry-segments').then(m => ({ default: m.IndustrySegmentsPage })));
// ... similar for other admin pages

// Reviewer Pages (lazy loaded)
const ReviewerDashboard = lazy(() => import('@/pages/reviewer/ReviewerDashboard'));
const InvitationResponsePage = lazy(() => import('@/pages/reviewer/InvitationResponsePage'));
// ... similar for other reviewer pages
```

**Change 3:** Wrap lazy-loaded routes in Suspense

```typescript
<Route
  path="/admin"
  element={
    <AdminGuard>
      <Suspense fallback={<RouteLoadingFallback />}>
        <AdminDashboard />
      </Suspense>
    </AdminGuard>
  }
/>
```

---

## Implementation Order

| Step | File | Change | Risk |
|------|------|--------|------|
| 1 | `src/hooks/queries/useProvider.ts` | Add `enabled` option | Low - backward compatible |
| 2 | `src/hooks/useIsFirstTimeProvider.ts` | Use `enabled: needsFallback` | Low - conditional logic |
| 3 | `src/contexts/EnrollmentContext.tsx` | Expose `provider` and `providerLoading` | Low - additive change |
| 4 | `src/hooks/useIsFirstTimeProvider.ts` | Use context.provider | Low - uses existing data |
| 5 | `src/hooks/queries/useHierarchyResolverOptimized.ts` | Replace SELECT * | Medium - verify columns used |
| 6 | `src/services/assessmentService.ts` | Replace SELECT * | Medium - verify columns used |
| 7 | `src/App.tsx` | Add React.lazy() for admin/reviewer routes | Medium - test navigation |

---

## Files to Modify

1. `src/hooks/queries/useProvider.ts` - Add enabled option + export ProviderData type
2. `src/hooks/useIsFirstTimeProvider.ts` - Use enabled flag and context.provider
3. `src/contexts/EnrollmentContext.tsx` - Expose provider in context value
4. `src/hooks/queries/useHierarchyResolverOptimized.ts` - Replace SELECT * with specific columns
5. `src/services/assessmentService.ts` - Replace SELECT * with specific columns
6. `src/App.tsx` - Add React.lazy() for heavy routes (admin, reviewer)

---

## Preservation Guarantees

All changes are:
1. **Backward compatible** - existing code paths continue to work
2. **Additive** - new parameters have defaults that preserve current behavior
3. **Non-destructive** - no deletion of existing functionality
4. **Tested incrementally** - each phase can be verified independently

---

## Expected Results After Full Implementation

| Metric | Current | After This Phase |
|--------|---------|------------------|
| Provider queries on /pulse/feed | 2-4 | 1 |
| Hierarchy data payload size | ~50KB | ~15KB |
| Assessment data payload size | ~10KB | ~3KB |
| Initial bundle size | ~2MB | ~800KB |
| Admin route chunk | In main bundle | Separate lazy chunk |

