

# Performance Fix Plan: 6-Second Page Load Root Causes

## Diagnosis from Network Trace

Tracing the actual network requests when navigating to `/admin/my-performance`, I found **27 sequential Supabase requests** spanning ~6 seconds. The root causes are:

### Root Cause 1: `useMyMetrics` still does redundant auth + profile lookups
Despite creating `useCurrentAdminProfile`, **`useMyMetrics` was never updated to use it**. It still calls `supabase.auth.getUser()` + `platform_admin_profiles.select('id')` sequentially inside its `queryFn`. This adds ~400ms of redundant round-trips.

### Root Cause 2: `WorkloadBreakdown` triggers the entire verification dashboard chain
The My Performance page renders `<WorkloadBreakdown>` which imports and calls `useMyAssignments()`. This triggers the **full verification dashboard waterfall**: profile lookup → verifications → org details → countries + org types + industries. That is **5+ sequential queries** (~1.5s) fired just to show a small workload widget on a metrics page.

### Root Cause 3: `useAdminTier` duplicates the profile lookup
`useAdminTier` fetches `platform_admin_profiles` with its own query (`select admin_tier`), which is separate from `useCurrentAdminProfile` (`select id, admin_tier, is_supervisor, ...`). Both fire on every page load. The cached profile already has `admin_tier`.

### Root Cause 4: Duplicate queries on 60s refetchInterval
`useMyAssignments` still fires on a 60s `refetchInterval`, re-triggering the full waterfall repeatedly.

---

## Fix Plan (4 changes, zero UX/DB/API changes)

### Fix 1: Update `useMyMetrics` to use `useCurrentAdminProfile`
**File:** `src/hooks/queries/useMyMetrics.ts`

Remove the internal `getUser()` + profile lookup. Instead, accept the cached profile ID from `useCurrentAdminProfile` via the `enabled` guard pattern (same as `useMyAssignments` already does). Eliminates 2 redundant requests (~400ms).

### Fix 2: Decouple `WorkloadBreakdown` from `useMyAssignments`
**File:** `src/components/admin/performance/WorkloadBreakdown.tsx`

The component only needs: current pending count, max concurrent, and the list of active verifications with SLA data. Instead of importing `useMyAssignments()` (which triggers the full org resolution chain), create a lightweight query that fetches just `platform_admin_verifications` with SLA fields — no org name/country/industry resolution needed for the progress bars. Eliminates ~4 redundant requests (~1.2s).

### Fix 3: Update `useAdminTier` to derive tier from `useCurrentAdminProfile`
**File:** `src/hooks/useAdminTier.ts`

The profile query in `useAdminTier` duplicates `useCurrentAdminProfile`. Refactor to use `useCurrentAdminProfile` for the `admin_tier` value and keep only the `tier_permissions` query (which is genuinely separate data). Eliminates 1 redundant request (~200ms).

### Fix 4: Remove `refetchInterval` from `useMyAssignments`
**File:** `src/hooks/queries/useVerificationDashboard.ts`

The verification dashboard already has Realtime subscriptions that invalidate queries. The 60s polling is redundant and re-triggers the entire waterfall. Remove it.

---

## Expected Impact

| Before | After |
|--------|-------|
| 27 sequential requests, ~6s | ~12 requests, ~1.5s |
| 3 redundant `getUser()` calls | 0 (cached by AuthProvider) |
| 3 redundant `platform_admin_profiles` queries | 1 (cached by `useCurrentAdminProfile`) |
| Full org resolution on My Performance page | Lightweight SLA-only query |

## Safety
- No DB, RLS, routing, or UX changes
- All existing return shapes preserved
- `useAdminTier` still returns same interface
- `WorkloadBreakdown` still renders same UI

