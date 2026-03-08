

# Root Cause Analysis: 6-8 Second Page Load Times

## The Problem

When navigating between admin pages, the user experiences 6-8 second delays despite minimal data. The root cause is a **sequential waterfall of auth checks and data queries** that block rendering.

## Root Cause Breakdown

### Waterfall #1: Auth → Roles → Tier → Page Data (Serial Chain)

Every admin page navigation triggers this serial chain:

```text
1. AuthGuard: supabase.auth.getUser()           ~200ms
2. AdminRoleCheck: useUserRoles → user_roles     ~200ms  (waits for #1)
3. AdminShell mounts:
   a. AdminSidebar: useAdminTier()               ~400ms  (2 parallel queries)
      - platform_admin_profiles
      - tier_permissions
   b. AdminSidebar: usePendingReviewerCount()    ~200ms
   c. AdminSidebar: usePendingSeekerCount()      ~200ms
   d. AdminSidebar: usePendingReassignmentCount() ~200ms
   e. AdminHeader: useAdminTier() (duplicate)    ~0ms (cached)
   f. AdminHeader: useMpaConfig()                ~200ms
4. Page content loads (lazy chunk + page queries) ~500ms+
```

**Total theoretical minimum: ~1.5s** but due to serial dependencies (each step waits for the previous), real-world is 3-5s. Add Supabase cold-start latency and it reaches 6-8s.

### Waterfall #2: useMyAssignments — 5 Sequential Queries

The verification dashboard's `useMyAssignments` hook executes **5 sequential Supabase calls** in a single `queryFn`:

1. `supabase.auth.getUser()` — redundant (already authenticated)
2. `platform_admin_profiles` — get profile ID
3. `platform_admin_verifications` — get assignments
4. `seeker_organizations` — get org details
5. `countries` + `organization_types` + `seeker_org_industries` — resolve references

Each round-trip is ~150-300ms. Total: **~1-2s** just for this one hook.

### Waterfall #3: useVerificationDetail — 8+ Sequential Queries

Even worse: `useVerificationDetail` makes **8 sequential** Supabase calls in one `queryFn`, each waiting for the previous.

### Issue #4: AdminShell Queries Not Cached Aggressively Enough

The sidebar badge counts (`usePendingReviewerCount`, `usePendingSeekerCount`, `usePendingReassignmentCount`) use `staleTime: 20-30s`. Since AdminShell is persistent, these re-fire frequently. They should have longer staleness since they're just badge counts.

## Fix Plan

### Fix 1: Cache admin profile ID to eliminate repeated lookups

Create a `useCurrentAdminProfile` hook that caches the admin's profile ID with long `staleTime`. This eliminates the repeated `getUser()` + `platform_admin_profiles` lookup that happens in `useMyAssignments`, `useVerificationDetail`, `useOpenQueue`, and many other hooks.

**File:** `src/hooks/queries/useCurrentAdminProfile.ts` (new)

### Fix 2: Parallelize useMyAssignments queries

Restructure the `queryFn` to use `Promise.all` where possible instead of sequential `await`s. After getting the profile ID (from Fix 1), the verifications query can proceed. Then the org/country/industry lookups can ALL run in parallel via `Promise.all`.

**File:** `src/hooks/queries/useVerificationDashboard.ts`

### Fix 3: Parallelize useVerificationDetail queries

Same approach — after fetching the verification record, run org lookup, checks, history, assignment, and admin name lookups in parallel.

**File:** `src/hooks/queries/useVerificationDashboard.ts`

### Fix 4: Increase staleTime for sidebar badge counts

Change badge count hooks from 20-30s to 2 minutes — these are low-priority display counters and don't need near-real-time freshness.

**Files:**
- `src/hooks/queries/usePanelReviewers.ts` — `usePendingReviewerCount`: staleTime → 120s
- `src/hooks/queries/useSeekerOrgApprovals.ts` — `usePendingSeekerCount`: staleTime → 120s
- `src/hooks/queries/useReassignmentRequests.ts` — `usePendingReassignmentCount`: staleTime → 120s

### Fix 5: Increase staleTime for MPA config

`useMpaConfig` fetches 17 config rows on every header render with 60s stale time. This data almost never changes. Increase to 5 minutes.

**File:** `src/hooks/queries/useMpaConfig.ts`

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/queries/useCurrentAdminProfile.ts` | **New** — cached admin profile ID hook |
| `src/hooks/queries/useVerificationDashboard.ts` | Parallelize `useMyAssignments`, `useOpenQueue`, `useVerificationDetail` queries; use cached profile |
| `src/hooks/queries/usePanelReviewers.ts` | Increase `staleTime` to 120s for pending count |
| `src/hooks/queries/useSeekerOrgApprovals.ts` | Increase `staleTime` to 120s for pending count |
| `src/hooks/queries/useReassignmentRequests.ts` | Increase `staleTime` to 120s for pending count |
| `src/hooks/queries/useMpaConfig.ts` | Increase `staleTime` to 5 minutes |

## Expected Impact

- **Before:** 6-8 second page loads due to serial waterfall
- **After:** 1-2 seconds — parallel queries + cached profile eliminates 4-6 redundant round-trips per navigation

## Safety

- No DB, RLS, routing, or UX changes
- All existing hooks retain the same return shapes
- Cache invalidation patterns unchanged
- Only internal query structure and timing adjusted

