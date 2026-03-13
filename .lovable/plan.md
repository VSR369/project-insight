

# Compliance Audit: Role Management Module — Findings and Fixes

## Audit Scope
All RBAC components, hooks, and pages across both portals (Platform Admin Marketplace + Seeking Org Admin Aggregator/Core).

---

## Compliance Status

### PASSING (No Action Needed)
- **No raw console.log/warn/error** — clean across all RBAC files
- **No `select("*")`** — all queries use explicit column selection
- **Responsive breakpoints** — all using `lg:` (1024px), no `md:` violations
- **Audit fields** — `withCreatedBy`/`withUpdatedBy` used in all mutation hooks
- **Query safety caps** — `useRoleAssignments` has `.limit(200)`
- **Master data purity** — all roles, countries, proficiency areas from DB
- **Shared utilities** — `getRoleLabel`, `deduplicateMembers`, `EnrollModeToggle` correctly extracted (just completed)

---

## FINDINGS — Issues to Fix

### Finding 1: Missing `FeatureErrorBoundary` on 3 Pages (Compliance Rule #8)

| Page | Current | Required |
|------|---------|----------|
| `CreateDelegatedAdminPage.tsx` | None | `FeatureErrorBoundary` |
| `EditDelegatedAdminPage.tsx` | None | `FeatureErrorBoundary` |
| `AdminManagementPage.tsx` | None | `FeatureErrorBoundary` |

Also: `RoleManagementDashboard.tsx` uses the generic `ErrorBoundary` instead of `FeatureErrorBoundary`. Should be upgraded.

### Finding 2: Missing `useSessionRecovery` on Critical Forms (Compliance Rule #12)

The standard mandates session resilience for critical forms. Currently:
- `AssignRoleSheet` (588 lines, multi-tab form) — **no session recovery**
- `MsmeQuickAssignModal` (503 lines, 3-tab form) — **no session recovery**
- `CreateDelegatedAdminPage` (long form with scope selection) — **no session recovery**

Only `AssignMemberModal` (Marketplace) has `useSessionRecovery`. The org-portal equivalents do not.

### Finding 3: `useRoleReadiness` has `staleTime: 0` (Performance)

This hook fires on every mount/focus, calling the `role_readiness_cache` table unnecessarily. Given readiness changes only when assignments change (and those mutations already `invalidateQueries`), a `staleTime` of 30s-60s is appropriate.

### Finding 4: Missing `.limit()` on `useRoleReadiness` Query

The query fetches from `role_readiness_cache` without a `.limit()` safety cap. While likely small, the standard requires it on all list queries.

### Finding 5: `useSlmRoleCodes` Missing `.limit()` Safety Cap

Same issue — master data query without `.limit()`. Should have `.limit(100)` as a safety cap.

### Finding 6: `RoleManagementDashboard` Loads All Tabs Eagerly

All three tab contents (`org-core`, `agg-challenge`, `delegated-admins`) are rendered simultaneously. Per performance standards, inactive tab queries should be deferred using the `enabled: activeTab === ...` pattern to avoid unnecessary network calls on load.

---

## Summary of Changes

| File | Fix |
|------|-----|
| `src/pages/org/CreateDelegatedAdminPage.tsx` | Wrap in `FeatureErrorBoundary` |
| `src/pages/org/EditDelegatedAdminPage.tsx` | Wrap in `FeatureErrorBoundary` |
| `src/pages/org/AdminManagementPage.tsx` | Wrap in `FeatureErrorBoundary` |
| `src/pages/rbac/RoleManagementDashboard.tsx` | Upgrade to `FeatureErrorBoundary`; add tab-aware lazy loading |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Add `useSessionRecovery` |
| `src/components/rbac/MsmeQuickAssignModal.tsx` | Add `useSessionRecovery` |
| `src/hooks/queries/useRoleReadiness.ts` | Set `staleTime: 30_000`, add `.limit(50)` |
| `src/hooks/queries/useSlmRoleCodes.ts` | Add `.limit(100)` |

All changes are non-breaking compliance and performance fixes. No behavioral changes, no DB changes.

