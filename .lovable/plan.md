

# Plan: Fix Sidebar Disappearing on Navigation — Persistent Org Shell

## Root Cause

Every `/org/*` page individually wraps itself in `OrgLayout`, which creates a **new** `SidebarProvider` + `OrgSidebar` on each navigation. The admin management pages (`AdminManagementPage`, `CreateDelegatedAdminPage`, `EditDelegatedAdminPage`) don't use `OrgLayout` at all — so they render with **no sidebar**.

The Admin portal solved this with `AdminShell` — a persistent layout using `<Outlet />`. The Org portal needs the same pattern.

## Changes

### 1. Create `OrgShell.tsx` (new file)
A persistent shell mirroring `AdminShell`:
- `SidebarProvider` + `OrgSidebar` + `SidebarInset` + `OrgHeader`
- `<Suspense>` boundary around `<Outlet />`
- Sidebar stays mounted across all `/org/*` navigations

### 2. Refactor `App.tsx` — Nest all `/org/*` routes under `OrgShell`
Replace flat `/org/*` routes with a parent route:
```
<Route path="/org" element={<SeekerGuard><OrgShell /></SeekerGuard>}>
  <Route path="dashboard" element={<LazyRoute><OrgDashboardPage /></LazyRoute>} />
  <Route path="settings" element={<LazyRoute><OrgSettingsPage /></LazyRoute>} />
  <Route path="admin-management" element={<LazyRoute><AdminManagementPage /></LazyRoute>} />
  <Route path="admin-management/create" element={<LazyRoute><CreateDelegatedAdminPage /></LazyRoute>} />
  <Route path="admin-management/:adminId/edit" element={<LazyRoute><EditDelegatedAdminPage /></LazyRoute>} />
  <Route path="challenges" element={<LazyRoute><ChallengeListPage /></LazyRoute>} />
  <Route path="challenges/create" element={<LazyRoute><ChallengeCreatePage /></LazyRoute>} />
  <Route path="membership" element={<LazyRoute><MembershipPage /></LazyRoute>} />
  <Route path="parent-dashboard" element={<LazyRoute><ParentDashboardPage /></LazyRoute>} />
  <Route path="team" element={<LazyRoute><TeamPage /></LazyRoute>} />
  <Route path="billing" element={<LazyRoute><OrgBillingPage /></LazyRoute>} />
</Route>
```

`SeekerGuard` (which provides `OrgProvider`) wraps the shell once — all child routes inherit it.

### 3. Strip `OrgLayout` from all org pages
Remove the `OrgLayout` wrapper from:
- `OrgDashboardPage.tsx`
- `OrgSettingsPage.tsx`
- `ChallengeListPage.tsx`
- `MembershipPage.tsx`
- `OrgBillingPage.tsx`
- `TeamPage.tsx`
- `ParentDashboardPage.tsx` (if it uses OrgLayout)

Each page becomes a flat fragment rendering just its title/description + content (like admin pages do inside `AdminShell`). Page-level titles and breadcrumbs move into the page content area (no layout wrapper needed).

### 4. Keep `OrgLayout` component available
Don't delete `OrgLayout.tsx` yet — deprecate it. The shell replaces its role.

## What This Fixes
- Sidebar stays visible on all `/org/*` routes including admin management pages
- No sidebar remount/flash on navigation
- `SidebarProvider` created once, persists across navigation
- Consistent with `AdminShell` architecture

## Files Changed

| File | Action |
|------|--------|
| `src/components/org/OrgShell.tsx` | **Create** — persistent shell with Outlet |
| `src/App.tsx` | Refactor `/org/*` routes into nested layout route |
| `src/pages/org/OrgDashboardPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/OrgSettingsPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/ChallengeListPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/MembershipPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/OrgBillingPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/TeamPage.tsx` | Remove `OrgLayout` wrapper |
| `src/pages/org/ParentDashboardPage.tsx` | Remove `OrgLayout` wrapper (if applicable) |

