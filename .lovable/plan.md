

# Performance Fix: Slow Admin Page Navigation (5-10s to <1s)

## Root Cause Analysis (5 Whys)

**Symptom:** Clicking any admin sidebar menu item takes 5-10 seconds to display the page.

1. **Why is the page slow to appear?** Because the browser must download, parse, and execute the JavaScript chunk for each lazy-loaded page before React can render it.

2. **Why are the chunks slow to download?** Because the initial bundle is bloated. 15 Pulse pages are **eagerly imported** (not lazy-loaded) in App.tsx line 85, pulling their entire dependency tree into the main bundle. This means every page load -- including admin pages -- pays the cost of parsing Pulse code.

3. **Why does the chunk download not start sooner?** Because there is no **prefetching** of admin route chunks. The chunk only begins downloading after the user clicks a sidebar item. The browser must complete: click -> React Router match -> Suspense triggers -> dynamic import starts -> network fetch -> parse -> render. All of this is sequential.

4. **Why is there no prefetching?** The sidebar items use plain `navigate()` calls with no preloading strategy. When a user hovers or the admin shell mounts, no chunks are fetched ahead of time.

5. **Why does back-navigation also feel slow?** Because while React Query caches the API data (staleTime 5min), the JavaScript chunks are re-evaluated by the module system on each navigation. Additionally, the `AdminSidebar` instantiates 5 mutation hooks (`usePendingReviewerCount`) on every render cycle.

## Solution: Three Targeted Fixes

### Fix 1: Convert Pulse Pages from Eager to Lazy Imports (BIGGEST IMPACT)

Currently, 15 Pulse pages are eagerly imported in App.tsx. They are pulled into the main bundle even when visiting admin pages, inflating parse time for every single route.

**Change in `src/App.tsx`:**
- Move the Pulse barrel import from eager (line 85) to lazy loading, just like admin pages
- Each Pulse page becomes a `lazy(() => import(...))` call
- This reduces the initial bundle size significantly, speeding up all routes

### Fix 2: Add Route Chunk Prefetching to AdminSidebar

When the AdminShell mounts, preload the chunks for the most likely admin pages. When a user hovers on any sidebar item, preload that specific chunk.

**Changes:**
- Create a `src/lib/routePrefetch.ts` utility that maps sidebar paths to their dynamic import functions
- In `AdminSidebar`, call `prefetchAdminRoutes()` once on mount (via useEffect) to preload the top 5-6 most-used pages
- Add `onMouseEnter` handlers to sidebar menu items to prefetch the hovered route's chunk

**Prefetch utility pattern:**
```typescript
const ADMIN_ROUTE_IMPORTS: Record<string, () => Promise<any>> = {
  '/admin/master-data/countries': () => import('@/pages/admin/countries'),
  '/admin/master-data/industry-segments': () => import('@/pages/admin/industry-segments'),
  // ... all admin routes
};

export function prefetchRoute(path: string) {
  ADMIN_ROUTE_IMPORTS[path]?.();
}

export function prefetchAdminRoutes() {
  // Preload top routes after a short idle delay
  requestIdleCallback(() => {
    ['/admin/master-data/countries', '/admin/master-data/industry-segments', ...]
      .forEach(path => prefetchRoute(path));
  });
}
```

### Fix 3: Eager-Load AdminDashboard (Already Done) and Deduplicate Sidebar Queries

The `AdminSidebar` calls `usePendingReviewerCount()` which fires a HEAD request to `panel_reviewers` on every sidebar render. This is fine, but ensure it uses aggressive caching.

**Changes in `AdminSidebar.tsx`:**
- Add `onMouseEnter` prefetch handlers to each sidebar menu item
- Call `prefetchAdminRoutes()` on mount

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Convert 15 Pulse page imports from eager to lazy |
| `src/lib/routePrefetch.ts` | New file: admin route prefetch registry |
| `src/components/admin/AdminSidebar.tsx` | Add onMouseEnter prefetch + mount-time preload |

## What We Are NOT Changing

| Item | Reason |
|---|---|
| React Query config | Already optimized (staleTime 30s, gcTime 5min) |
| DataTable component | Already has skeletons, pagination, memoized columns |
| Hook patterns | Already use React Query with explicit columns |
| Server-side pagination | Datasets are 10-200 rows; client-side is faster |
| Database indexes | Already added in previous migration |
| Lazy loading of admin pages | Already implemented |

## Expected Results

- **First admin page load:** <1s (chunk prefetched during idle or hover)
- **Subsequent navigation:** Near-instant (chunk already cached by browser)
- **Main bundle size reduction:** ~30-50% smaller from removing eager Pulse imports
- **Zero functional changes:** No database, hook, UX, or navigation modifications

