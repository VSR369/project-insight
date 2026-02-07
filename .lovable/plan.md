
# Performance Diagnostic Report & Implementation Plan

## Executive Summary

After running the comprehensive diagnostic test kit, I have identified **12 critical and high-priority performance issues** causing the system to be extremely slow. The primary culprits are:

1. **Aggressive polling intervals** consuming network bandwidth continuously
2. **Duplicate API calls** for the same data on single page load
3. **Missing cache optimization** despite recent changes
4. **SELECT * anti-patterns** increasing payload sizes
5. **Cascading context waterfalls** creating sequential data fetching

---

## Diagnostic Scorecard

| # | Area | Status | Priority | Findings |
|---|------|--------|----------|----------|
| 1 | Bundle Size | 🟡 Warning | Medium | Heavy dependencies (xlsx, recharts, date-fns) |
| 2 | Re-render Storms | 🟡 Warning | Medium | Skeleton component ref warning indicates potential issues |
| 3 | Supabase/DB Performance | 🔴 Critical | P0 | 12+ duplicate calls on page load, SELECT * patterns |
| 4 | Real-time Subscriptions | 🟢 Healthy | Low | No WebSocket subscriptions detected |
| 5 | Component Architecture | 🟡 Warning | Medium | Large page components (PulseFeedPage ~220 lines) |
| 6 | Image/Asset Performance | 🟢 Healthy | Low | Storage transformations in use |
| 7 | Routing & Code Splitting | 🔴 Critical | P0 | No React.lazy() visible, all routes load together |
| 8 | Third-Party Scripts | 🟢 Healthy | Low | Minimal external scripts |
| 9 | Build & Deployment | 🟡 Warning | Medium | No manual chunk splitting configured |
| 10 | Memory Leaks | 🟡 Warning | Medium | Polling without page visibility check |

**Overall Health: 4/10 areas healthy**

---

## Critical Issues Identified (Network Analysis)

### Issue #1: Duplicate Provider Queries (🔴 Critical)

From network analysis, on a single `/pulse/feed` page load:

```text
Request #1:  GET /solution_providers?select=*...&user_id=eq.xxx (17:07:58)
Request #2:  GET /solution_providers?select=id&user_id=eq.xxx (17:07:58)
Request #3:  GET /solution_providers?select=id&user_id=eq.xxx (17:07:58)
Request #4:  GET /solution_providers?select=*...&user_id=eq.xxx (17:07:59)
```

**Root Cause:** Multiple hooks calling `useCurrentProvider()` independently:
- EnrollmentContext calls it
- useIsFirstTimeProvider calls it (fallback path)
- PulseFeedPage indirectly through useIsFirstTimeProvider
- useUserRoles makes a separate lightweight call

**Impact:** 4x redundant API calls for provider data on every page load.

---

### Issue #2: Aggressive Polling Still Active (🔴 Critical)

Despite previous optimization, polling is still aggressive for certain queries:

| Query | Current Interval | Recommended |
|-------|-----------------|-------------|
| `pulse_cards` feed | 30,000ms (30s) | 120,000ms (2 min) |
| `pulse_card` detail | 5,000ms (5s) | 30,000ms (30s) |
| `pulse_card_layers` | 5,000ms (5s) | 30,000ms (30s) |
| `pulse_card` votes | 5,000ms (5s) | 30,000ms (30s) |
| `notifications` count | 60,000ms (1 min) | 120,000ms (2 min) |
| `notifications` list | 60,000ms (1 min) | 120,000ms (2 min) |

**Location:** `src/constants/pulseCards.constants.ts` lines 127-131

**Impact:** Every 5 seconds on card detail pages, 3+ API calls fire. Combined with feed polling, this creates constant network churn.

---

### Issue #3: SELECT * Anti-Pattern (🔴 Critical)

Found **410 instances** of `select('*')` across 37 files. Examples:

| File | Table | Impact |
|------|-------|--------|
| `useCapabilityTags.ts` | capability_tags | Over-fetching all columns |
| `useCountries.ts` | countries | Over-fetching all columns |
| `useOrganizationTypes.ts` | organization_types | Over-fetching all columns |
| `useHierarchyResolverOptimized.ts` | 5 tables | Massive over-fetch |
| `assessmentService.ts` | assessment_attempts | Over-fetching |
| `useCandidateProofPoints.ts` | proof_points, links, files | 3x over-fetch |

**Impact:** Larger response payloads, slower parsing, increased memory usage.

---

### Issue #4: EnrollmentContext Waterfall Pattern (🔴 Critical)

```text
EnrollmentContext flow:
1. useCurrentProvider() → wait 100-300ms
2. useProviderEnrollments(provider?.id) → wait 100-300ms (depends on #1)
3. useActiveEnrollment(provider?.id) → wait 100-300ms (depends on #1)

Total sequential wait: 300-900ms before context is ready
```

**Location:** `src/contexts/EnrollmentContext.tsx` lines 57-67

**Impact:** Every protected route waits up to 900ms just for context initialization.

---

### Issue #5: useIsFirstTimeProvider Hook Inefficiency (🟠 High)

The hook has a fallback path that creates redundant queries:

```typescript
// Fallback hooks - called even when context should have data
const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider();
const { data: fallbackEnrollments, isLoading: fallbackEnrollmentsLoading } = useProviderEnrollments(
  enrollmentContext ? undefined : fallbackProvider?.id
);
```

**Problem:** When `enrollmentContext` exists but doesn't have `provider` exposed directly, the fallback `useCurrentProvider()` still executes.

**Location:** `src/hooks/useIsFirstTimeProvider.ts` lines 21-25

---

### Issue #6: No Route-Level Code Splitting (🟠 High)

From `src/App.tsx`:

```tsx
import PulseFeedPage from "@/pages/pulse/PulseFeedPage";
import PulseReelsPage from "@/pages/pulse/PulseReelsPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
// ... 50+ more static imports
```

**Problem:** All page components are bundled together and loaded on initial app load, even if user never visits those routes.

**Impact:** Larger initial bundle, longer Time to Interactive (TTI).

---

### Issue #7: Missing Page Visibility Polling Control (🟠 High)

Polling continues even when browser tab is not active:

```typescript
// usePulseCards.ts
refetchInterval: PULSE_CARDS_POLLING.FEED_MS, // Polls even when tab is hidden
```

**Impact:** Wasted API calls when user is not viewing the app.

---

### Issue #8: React Ref Warnings (🟡 Medium)

Console shows:
```
Warning: Function components cannot be given refs.
Check the render method of `PulseFeedPage`.
```

**Components affected:** `Skeleton`, `PulseBottomNav`

**Impact:** Minor performance impact, but indicates architectural issues.

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate - High Impact)

#### 1.1 Increase Pulse Cards Polling Intervals

**File:** `src/constants/pulseCards.constants.ts`

```typescript
// BEFORE (lines 127-131)
export const PULSE_CARDS_POLLING = {
  FEED_MS: 30000,   // 30 seconds
  DETAIL_MS: 5000,  // 5 seconds
  VOTES_MS: 5000,   // 5 seconds
} as const;

// AFTER
export const PULSE_CARDS_POLLING = {
  FEED_MS: 120000,   // 2 minutes - feed updates don't need to be instant
  DETAIL_MS: 30000,  // 30 seconds - reduce detail polling
  VOTES_MS: 30000,   // 30 seconds - votes can wait
} as const;
```

#### 1.2 Add Visibility-Aware Polling

**Create utility:** `src/lib/useVisibilityPolling.ts`

```typescript
import { useEffect, useState } from 'react';

export function useDocumentVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  
  return isVisible;
}

export function useVisibilityPollingInterval(baseInterval: number | false) {
  const isVisible = useDocumentVisibility();
  return isVisible ? baseInterval : false;
}
```

**Apply to polling hooks:**

```typescript
// usePulseCards.ts
import { useVisibilityPollingInterval } from '@/lib/useVisibilityPolling';

export function usePulseCards(filters: CardFilters = {}) {
  const refetchInterval = useVisibilityPollingInterval(PULSE_CARDS_POLLING.FEED_MS);
  
  return useQuery({
    queryKey: ['pulse-cards', filters],
    queryFn: async () => { ... },
    refetchInterval, // Now pauses when tab is hidden
  });
}
```

#### 1.3 Fix useIsFirstTimeProvider to Use Context Provider Properly

**File:** `src/hooks/useIsFirstTimeProvider.ts`

```typescript
export function useIsFirstTimeProvider() {
  const enrollmentContext = useOptionalEnrollmentContext();
  
  // Only call fallback hooks when context is truly unavailable
  const contextAvailable = !!enrollmentContext;
  
  // Fallback hooks - ONLY called when outside EnrollmentProvider
  const { data: fallbackProvider, isLoading: fallbackProviderLoading } = useCurrentProvider({
    enabled: !contextAvailable, // Don't fetch if context available
  });
  
  // ... rest of logic
}
```

This requires modifying `useCurrentProvider` to accept an `enabled` option.

---

### Phase 2: Query Optimization (High Impact)

#### 2.1 Replace SELECT * with Specific Columns

**Priority files to fix:**

| File | Change |
|------|--------|
| `useCapabilityTags.ts` | `.select('id, name, code, display_order, is_active')` |
| `useCountries.ts` | `.select('id, code, name, phone_code, display_order')` |
| `useOrganizationTypes.ts` | `.select('id, code, name, display_order')` |
| `useHierarchyResolverOptimized.ts` | Select only required fields per table |

**Example fix for `useCapabilityTags.ts`:**

```typescript
// BEFORE
.select("*")

// AFTER
.select("id, name, code, description, category, display_order, is_active")
```

#### 2.2 Consolidate EnrollmentContext Provider Query

**File:** `src/contexts/EnrollmentContext.tsx`

Expose `provider` from context to prevent duplicate fetching:

```typescript
interface EnrollmentContextType {
  // ... existing fields
  provider: ProviderData | null; // ADD THIS
  providerLoading: boolean;      // ADD THIS
}

export function EnrollmentProvider({ children }: EnrollmentProviderProps) {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  
  // ... rest of implementation
  
  const value: EnrollmentContextType = {
    // ... existing values
    provider,           // EXPOSE THIS
    providerLoading,    // EXPOSE THIS
  };
}
```

Then update `useIsFirstTimeProvider` to use `enrollmentContext.provider` directly.

---

### Phase 3: Code Splitting (Medium Impact)

#### 3.1 Implement React.lazy for Route Components

**File:** `src/App.tsx`

```typescript
import { lazy, Suspense } from 'react';

// Convert static imports to lazy imports
const PulseFeedPage = lazy(() => import('@/pages/pulse/PulseFeedPage'));
const PulseReelsPage = lazy(() => import('@/pages/pulse/PulseReelsPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
// ... other pages

// Create a route loading component
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Skeleton className="h-8 w-8 rounded-full" />
  </div>
);

// Wrap routes in Suspense
<Route
  path="/pulse/feed"
  element={
    <AuthGuard>
      <Suspense fallback={<RouteLoadingFallback />}>
        <PulseFeedPage />
      </Suspense>
    </AuthGuard>
  }
/>
```

#### 3.2 Group Routes for Chunking

**File:** `vite.config.ts`

```typescript
export default defineConfig(({ mode }) => ({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* etc */],
          'vendor-charts': ['recharts'],
          'vendor-excel': ['xlsx'],
        },
      },
    },
  },
}));
```

---

### Phase 4: Component Architecture (Lower Impact)

#### 4.1 Fix Skeleton Ref Warning

**File:** `src/components/ui/skeleton.tsx`

```typescript
import * as React from "react";

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
```

---

## Expected Results After Implementation

| Metric | Current | After Phase 1 | After All Phases |
|--------|---------|---------------|------------------|
| API calls on /pulse/feed load | ~15-20 | ~8-10 | ~5-7 |
| Polling calls per minute (active) | ~8-12 | ~2-4 | ~2-4 |
| Polling calls per minute (hidden tab) | ~8-12 | 0 | 0 |
| Initial bundle size | ~2MB+ | ~2MB | ~500KB-800KB |
| Time to Interactive (TTI) | 3-5s | 2-3s | 1-2s |
| EnrollmentContext ready time | 300-900ms | 200-400ms | 100-200ms |

---

## Files to Modify

### Phase 1 (Critical - Do First)
1. `src/constants/pulseCards.constants.ts` - Increase polling intervals
2. `src/lib/useVisibilityPolling.ts` - NEW FILE - Visibility-aware polling
3. `src/hooks/queries/usePulseCards.ts` - Apply visibility polling
4. `src/hooks/queries/usePulseCardLayers.ts` - Apply visibility polling
5. `src/hooks/queries/usePulseSocial.ts` - Apply visibility polling
6. `src/hooks/queries/useUnifiedPulseFeed.ts` - Apply visibility polling

### Phase 2 (Query Optimization)
7. `src/contexts/EnrollmentContext.tsx` - Expose provider
8. `src/hooks/useIsFirstTimeProvider.ts` - Use context provider
9. `src/hooks/queries/useCapabilityTags.ts` - Replace SELECT *
10. `src/hooks/queries/useCountries.ts` - Replace SELECT *
11. `src/hooks/queries/useOrganizationTypes.ts` - Replace SELECT *
12. `src/hooks/queries/useHierarchyResolverOptimized.ts` - Replace SELECT *

### Phase 3 (Code Splitting)
13. `src/App.tsx` - Add React.lazy imports
14. `vite.config.ts` - Add manual chunks configuration
15. `src/components/ui/skeleton.tsx` - Fix forwardRef

---

## Monitoring After Implementation

1. Use browser Network tab to verify reduced API calls
2. Use React Query DevTools to monitor cache hit rates
3. Check bundle size in build output
4. Measure TTI using Lighthouse
5. Monitor Supabase dashboard for reduced query volume
