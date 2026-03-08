

# Performance Analysis: Admin Screen Loading Times

## What Happens on Every Admin Navigation

When you click a sidebar menu item, the following chain executes:

```text
Navigation Click
  │
  ├─ AdminShell stays mounted (good — no re-render of sidebar/header)
  ├─ Suspense boundary shows skeleton while lazy chunk loads
  │
  ├─ BUT these queries re-evaluate on every render:
  │   ├─ useAuth() → supabase.auth.getUser()         ~200ms
  │   ├─ useUserRoles() → user_roles table            ~150ms
  │   ├─ useAdminTier() → platform_admin_profiles      ~150ms
  │   │                 + tier_permissions table        ~150ms
  │   ├─ usePendingReviewerCount() → panel_reviewers   ~100ms
  │   ├─ usePendingSeekerCount() → seeker_orgs         ~100ms
  │   ├─ usePendingReassignmentCount() → reassignments ~100ms
  │   ├─ useMpaConfig() → md_mpa_config                ~100ms
  │   ├─ useUnreadNotificationCount() → notifications  ~100ms
  │   └─ TierGuard → useAdminTier() (cached, but waits) 
  │
  └─ Page-specific queries fire AFTER the above resolve:
      └─ e.g. useAllAdminMetrics() → RPC + table       ~300-500ms
```

## Root Causes of Perceived Slowness

### 1. Waterfall: TierGuard blocks page render while `useAdminTier` loads
Every tier-guarded route (Performance, Reassignments, Platform Admins, System Config, etc.) shows a skeleton while `useAdminTier` resolves. Even though the data is cached after first load (staleTime: 30s), the **first visit** and any visit after 30s staleness causes a visible loading flash.

**Impact:** ~300ms blocking skeleton on tier-guarded pages.

### 2. `supabase.auth.getUser()` called inside `useAdminTier` queryFn
The `useAdminTier` hook calls `supabase.auth.getUser()` on every fresh fetch. This is a network round-trip to Supabase auth (~200ms) that happens **inside** the query function, creating a serial dependency: auth call → then profile + permissions queries.

**Impact:** 200ms added to every `useAdminTier` cache miss.

### 3. AdminHeader fires `useMpaConfig()` on every admin page
The header calls `useMpaConfigValue('executive_escalation_contact_id')` which triggers `useMpaConfig()` — fetching ALL 17 config rows. This fires on every admin page mount (the header remounts when the Outlet content changes... actually no, AdminShell persists). BUT the staleTime is 60s so it's cached.

**Actually OK** — this is cached properly.

### 4. Sidebar badge count queries fire on mount
Three count queries (`usePendingReviewerCount`, `usePendingSeekerCount`, `usePendingReassignmentCount`) fire from the sidebar. These have 30s staleTime and use HEAD requests (lightweight). **Acceptable.**

### 5. Lazy chunk download time
Each admin page is a separate JS chunk. First-time navigation requires downloading the chunk. The `prefetchRoute` on hover mitigates this, but only if the user hovers before clicking.

**Impact:** 100-500ms on first visit per page (depends on chunk size).

### 6. Page-level RPC calls (especially Performance page)
`useAllAdminMetrics` calls `supabase.rpc('get_realtime_admin_metrics')` which is a potentially expensive DB function. With 60s staleTime, subsequent visits within a minute are instant.

**Impact:** 300-500ms on first load or after cache expiry.

## Estimated Loading Times Per Screen

| Screen | First Visit | Subsequent (<30s) | Bottleneck |
|--------|-------------|-------------------|------------|
| Dashboard | ~800ms | ~100ms | Lazy chunk + sidebar badge queries |
| Countries/Master Data | ~600ms | ~50ms | Lazy chunk + data query |
| Team Performance | ~1200ms | ~100ms | Lazy chunk + RPC + TierGuard wait |
| My Performance | ~900ms | ~100ms | Lazy chunk + RPC |
| Verifications | ~800ms | ~100ms | Lazy chunk + realtime setup |
| Reassignments | ~900ms | ~100ms | Lazy chunk + TierGuard + query |
| Notification Audit | ~700ms | ~100ms | Lazy chunk + TierGuard + query |
| Platform Admins | ~800ms | ~100ms | Lazy chunk + TierGuard + list query |
| System Config | ~700ms | ~100ms | Lazy chunk + TierGuard + config query |
| Permissions | ~700ms | ~100ms | Lazy chunk + TierGuard + permissions query |
| Availability | ~600ms | ~50ms | Lazy chunk + profile query |

## Proposed Fixes

### Fix 1: Remove `getUser()` from `useAdminTier` queryFn
Instead of calling `supabase.auth.getUser()` (network call) inside the queryFn, pass `user.id` from the `useAuth` context and use the `enabled` guard. This eliminates a 200ms serial network call.

### Fix 2: Increase `useAdminTier` staleTime to 5 minutes
Admin tier and permissions rarely change mid-session. Increasing from 30s to 300s (5 min) means the TierGuard skeleton almost never shows after the first load.

### Fix 3: Prefetch more aggressively
The current `prefetchAdminRoutes` only prefetches 6 routes. Expand to include all MPA screens (verifications, performance, reassignments, notifications, system-config) since these are the pages the user navigates frequently.

### Fix 4: Add the WorkloadBar `forwardRef` fix
The console error `Function components cannot be given refs` in `WorkloadBar.tsx` causes React to do extra validation work on every render of the performance table. Wrapping with `forwardRef` or removing the ref usage eliminates this.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useAdminTier.ts` | Remove `getUser()` call, use `user.id` from auth context, increase staleTime to 300s |
| `src/lib/routePrefetch.ts` | Add MPA routes (verifications, performance, reassignments, notifications, system-config, permissions) to prefetch list |
| `src/components/admin/platform-admins/WorkloadBar.tsx` | Add `forwardRef` to fix console warning |

These 3 changes address the two biggest delays (auth waterfall + TierGuard flicker) and the console error, without touching any DB schema, RLS, business logic, or query keys.

