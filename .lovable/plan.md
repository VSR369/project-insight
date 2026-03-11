

# Performance Optimization Plan — 360° System Review

## Root Cause Analysis

After analyzing 140+ query hooks, page components, sidebar, and shell rendering patterns, I've identified **6 systemic performance bottlenecks** causing 6-8 second load times.

---

## Issue 1: Sequential Query Waterfalls in queryFn

**Severity: HIGH** — Adds 2-4 seconds per page

Several hooks make sequential Supabase calls inside a single `queryFn`, where each call waits for the previous one. This is the #1 cause of slow pages.

**Worst offenders:**

| Hook | Sequential calls | Est. waste |
|---|---|---|
| `useSolutionRequests` | 3 sequential calls (model lookup → challenges → assignments) | ~1.5s |
| `useSeekerOrgDetail` | 1 org fetch → then 9 parallel calls (good), but the initial org blocks everything | ~0.5s |
| `useVerificationDetail` | 2 sequential batches of Promise.all (batch 1 depends on batch 2) — acceptable but has a 3rd sequential call for industry names | ~0.5s |
| `useOpenQueue` | 2 sequential calls (queue entries → then verifications + org resolution) | ~1s |

**Fix:** Restructure `useSolutionRequests` to fetch marketplace model ID from cache or combine into a single query. For `useOpenQueue`, use Supabase joins or a database view to eliminate the second query.

---

## Issue 2: AdminSidebar Badge Queries Fire on Every Page

**Severity: HIGH** — 3 count queries on every navigation

The `AdminSidebar` component fires 3 independent count queries on every render:
- `usePendingReviewerCount()` — HEAD request
- `usePendingSeekerCount()` — HEAD request  
- `usePendingReassignmentCount()` — HEAD request

Plus `useAdminTier()` which chains `useCurrentAdminProfile()` → `tier_permissions` query.

These fire on **every page navigation** within the admin portal, adding ~1-1.5s baseline latency.

**Fix:** 
1. Consolidate the 3 badge counts into a single `useAdminSidebarCounts()` hook using `Promise.all`
2. Increase `staleTime` for badge counts from 120s to 300s (5 min) — they're informational, not critical
3. The `tier_permissions` query already has good caching (5 min staleTime) — no change needed

---

## Issue 3: No `.limit()` on Several List Queries

**Severity: MEDIUM** — Risk of fetching unbounded data

Several hooks fetch all rows without pagination or limits, which will degrade as data grows:

| Hook | Table | Missing limit |
|---|---|---|
| `useAllChallengeAssignments` | `challenge_role_assignments` | No limit |
| `usePanelReviewers` | `panel_reviewers` | No limit |
| `usePoolMembers` | `platform_provider_pool` | No limit |
| `useAllAdminMetrics` (RPC) | `get_realtime_admin_metrics` | No limit |
| `useSolutionRequests` (assignments sub-query) | `challenge_role_assignments` | No limit |

**Fix:** Add `.limit(200)` safety caps on all list queries. For large tables, implement cursor-based pagination.

---

## Issue 4: Duplicate Master Data Fetches

**Severity: MEDIUM** — Redundant network calls

Multiple hooks re-fetch the same reference data under different query keys:

- `useCountries()` in `useMasterData.ts` uses key `['countries']`
- `useCountries()` in `useCountries.ts` uses key `['countries-lookup']`
- `useCountries()` defined inline in `DomainWeightsPage.tsx` uses key `['countries-active']`
- `useIndustrySegments()` exists in both `useMasterData.ts` and `useIndustrySegments.ts` and `useRegistrationData.ts` with 3 different query keys

This means the same data is fetched 2-3 times across different pages that share the same layout.

**Fix:** Consolidate all master data hooks to use canonical query keys. Create a single `useMasterCountries()` etc. and re-export from one location.

---

## Issue 5: `useMyMetrics` Polls Every 5 Minutes

**Severity: LOW-MEDIUM** — Unnecessary background load

`useMyMetrics` has `refetchInterval: 300_000` (5 min) which triggers an RPC call every 5 minutes even when the user isn't viewing metrics. The `useVisibilityPollingInterval` pattern isn't applied here.

Also, `usePulseStats` polls every 60 seconds and `usePulseContent` detail polls active content every few seconds — these are fine with visibility polling but should be verified.

**Fix:** Replace `refetchInterval: 300_000` in `useMyMetrics` with `useVisibilityPollingInterval(300_000)` to pause when tab is hidden. Remove `refetchInterval` entirely if realtime subscriptions exist for the same data.

---

## Issue 6: Heavy Page Components Load All Tabs Eagerly

**Severity: MEDIUM** — Queries for hidden tabs fire on mount

The Verification Dashboard page (`VerificationDashboardPage.tsx`) fetches both `useMyAssignments()` and `useOpenQueue()` on mount, plus `TeamOverviewCards` fetches `useAvailableAdminCounts()`, `useAllAdminMetrics()`, and `usePendingReassignmentCount()` — that's **5 queries** for data the user may not even view (e.g., if they're on the "My Assignments" tab, the "Open Queue" + "Team Overview" data is wasted).

**Fix:** Defer non-active tab queries with `enabled: activeTab === 'open-queue'` pattern. Only fetch data for the currently visible tab.

---

## Implementation Plan

### Phase 1: High-Impact Query Fixes (biggest wins)

1. **Consolidate sidebar badge counts** — Merge 3 HEAD queries into 1 `Promise.all` hook with 5-min staleTime
2. **Fix `useSolutionRequests` waterfall** — Cache marketplace model ID (it's static reference data); use `.in()` for assignment counts in parallel with challenges fetch
3. **Fix `useOpenQueue` waterfall** — Create a Supabase view or use joins to eliminate the 2-step fetch
4. **Defer inactive tab queries** — Add `enabled` guards to `useOpenQueue`, `TeamOverviewCards` queries based on active tab

### Phase 2: Safety & Deduplication

5. **Add `.limit()` caps** — Add `.limit(200)` to `useAllChallengeAssignments`, `usePanelReviewers`, `usePoolMembers`, and all other unbounded list queries
6. **Consolidate master data query keys** — Unify country, industry segment, org type hooks to use single canonical query keys to eliminate duplicate fetches
7. **Fix polling governance** — Apply `useVisibilityPollingInterval` to `useMyMetrics`

### Phase 3: Database Indexes (if needed after Phase 1-2)

8. **Add composite indexes** for frequently filtered columns:
   - `challenge_role_assignments(challenge_id, status)` 
   - `platform_admin_verifications(assigned_admin_id, is_current, status)`
   - `seeker_organizations(verification_status, is_deleted)`

These may already exist but should be verified via `EXPLAIN ANALYZE`.

---

## Expected Impact

| Phase | Estimated improvement |
|---|---|
| Phase 1 | 2-4 seconds reduction on admin pages |
| Phase 2 | 0.5-1 second reduction + future-proofing |
| Phase 3 | 0.3-0.5 second on data-heavy pages |

**Total estimated improvement: 3-5 seconds**, bringing most pages from 6-8s to 2-3s.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/queries/useAdminSidebarCounts.ts` | **New** — consolidated badge count hook |
| `src/components/admin/AdminSidebar.tsx` | Use consolidated counts hook |
| `src/hooks/queries/useSolutionRequests.ts` | Eliminate waterfall, parallelize queries |
| `src/hooks/queries/useVerificationDashboard.ts` | Optimize `useOpenQueue` to reduce sequential calls |
| `src/pages/admin/verifications/VerificationDashboardPage.tsx` | Defer inactive tab queries |
| `src/hooks/queries/useAllChallengeAssignments.ts` | Add `.limit(200)` |
| `src/hooks/queries/usePanelReviewers.ts` | Add `.limit(200)` |
| `src/hooks/queries/usePoolMembers.ts` | Add `.limit(200)` |
| `src/hooks/queries/useMyMetrics.ts` | Use `useVisibilityPollingInterval` |
| Multiple master data hooks | Consolidate query keys |
| Database migration | Add composite indexes |

