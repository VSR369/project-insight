

# 5 Whys Root Cause Analysis & Fix Plan

## The Problem
Sidebar menu items are visible to admins who lack the permissions to use them. Navigating to those screens either shows "Permission denied" (via TierGuard) or shows full content without access control (no guard at all). The permission matrix in `tier_permissions` is the source of truth, but the sidebar and routes don't consistently use it.

## 5 Whys Analysis

**Why 1: Why do admins see menu items they can't access?**
Because the sidebar uses non-existent permission keys (e.g., `verification.view` instead of `verification.view_dashboard`) and some groups have no permission gate at all.

**Why 2: Why are non-existent permission keys used?**
Because the sidebar gating was added without cross-referencing the actual `tier_permissions` table. The code assumed `verification.view` exists but the real key is `verification.view_dashboard`.

**Why 3: Why do routes still allow access even when sidebar hides them?**
Because routes use `TierGuard` (static tier hierarchy: admin < senior_admin < supervisor) instead of `hasPermission()`. The tier hierarchy is hardcoded and doesn't reflect the dynamic permission matrix that supervisors can toggle.

**Why 4: Why are there two competing access control systems (TierGuard vs hasPermission)?**
Because `TierGuard` was built first as a simple tier-rank check, and `hasPermission()` was added later for the dynamic matrix. Nobody unified them — they coexist and contradict each other.

**Why 5 (Root Cause): Why was no single source of truth enforced?**
Because the permission matrix was treated as a UI-only enhancement for the sidebar, not as the authoritative access control layer. Routes, pages, and sidebar each make independent access decisions using different mechanisms.

## Current State: What Each Tier Actually Has (from DB)

```text
Permission Key                    admin  senior  supervisor
──────────────────────────────── ────── ─────── ──────────
verification.view_dashboard        ✓      ✓        ✓
verification.claim_from_queue      ✓      ✓        ✓
verification.*                     ✓      ✓        ✓
org_approvals.view                 ✓      ✓        ✓
org_approvals.approve_reject       ✓      ✓        ✓
org_approvals.manage_agreements    ✗      ✓        ✓
marketplace.view                   ✓      ✓        ✓
marketplace.assign_members         ✓      ✓        ✓
marketplace.manage_pool            ✗      ✓        ✓
marketplace.manage_config          ✗      ✓        ✓
master_data.view                   ✓      ✓        ✓
master_data.create/edit/delete     ✗      ✓        ✓
taxonomy.view                      ✓      ✓        ✓
taxonomy.create/edit               ✗      ✓        ✓
interview.view                     ✓      ✓        ✓
interview.manage_*                 ✗      ✓        ✓
seeker_config.view                 ✗      ✓        ✓
seeker_config.edit                 ✗      ✓        ✓
content.view_questions             ✗      ✓        ✓
invitations.view                   ✗      ✓        ✓
admin_management.view_my_profile   ✓      ✓        ✓
admin_management.view_all_admins   ✗      ✓        ✓
admin_management.view_settings     ✗      ✓        ✓
supervisor.*                       ✗      ✗        ✓
```

## What's Broken (Specific Issues)

### Sidebar Issues (AdminSidebar.tsx)
| Issue | Line | Problem |
|-------|------|---------|
| Operations group gate | 258 | Uses `verification.view` — key does NOT exist in DB. Group hidden for ALL tiers |
| Org Approvals item | 306 | No permission gate — should check `org_approvals.view` |
| Verifications item | 268 | No permission gate — should check `verification.view_dashboard` |
| Dashboard items in AdminDashboard.tsx | 60-158 | Shows Countries, Questions, Invitations etc. as `requiredTier: 'all'` — Basic Admin sees cards for screens they can't edit |

### Route Issues (App.tsx)
| Route | Current Guard | Should Be |
|-------|---------------|-----------|
| master-data/* | `TierGuard senior_admin` | Basic admin has `master_data.view` = true, should be able to VIEW (read-only) |
| interview/* | `TierGuard senior_admin` | Basic admin has `interview.view` = true, should be able to VIEW |
| questions, capability-tags | `TierGuard senior_admin` | Basic admin has NO content.view_questions — correct block, but wrong mechanism |
| invitations | `TierGuard senior_admin` | Basic admin has NO invitations.view — correct block, but wrong mechanism |
| verifications | No guard | Has `verification.view_dashboard` for all — correct, but should be explicit |
| seeker-org-approvals | No guard | Has `org_approvals.view` for all — correct, but should be explicit |
| marketplace/* (core) | No guard | Has `marketplace.view` for all — correct, but should be explicit |

### Page-Level Issues
- `CountriesPage.tsx`: No read-only mode — shows Edit/Delete/Add buttons to all tiers regardless of `master_data.edit` permission
- `ResourcePoolPage.tsx`: Uses `usePoolPermissions` (tier-based, not permission-based) for write gating
- `AdminDashboard.tsx`: Uses hardcoded `requiredTier` instead of `hasPermission()` — shows wrong cards

## The Fix: Permission-Only Model

### Phase 1: Fix Sidebar (AdminSidebar.tsx)
Replace all broken/missing permission gates with correct DB keys:

1. **Operations group gate**: `verification.view` → `verification.view_dashboard`
2. **Verifications item**: Add `hasPermission('verification.view_dashboard')` gate
3. **Org Approvals item**: Add `hasPermission('org_approvals.view')` gate  
4. **Reference Data**: Basic admin has `master_data.view` = true — they should see the items (read-only access)
5. **Interview & Review**: Basic admin has `interview.view` = true — they should see items
6. **Knowledge Centre items**: Always visible within their group (per user's choice — show read-only KC)

### Phase 2: Create PermissionGuard Component
Replace `TierGuard` with a new `PermissionGuard` that checks `hasPermission()`:

```tsx
// New: src/components/admin/PermissionGuard.tsx
function PermissionGuard({ permissionKey, children }) {
  const { hasPermission, isLoading } = useAdminTier();
  if (isLoading) return <Skeleton />;
  if (!hasPermission(permissionKey)) return <Navigate to="/admin" />;
  return children;
}
```

### Phase 3: Update Routes (App.tsx)
Replace `TierGuard` with `PermissionGuard` for routes where permission-matrix control is needed:

| Route | Old | New |
|-------|-----|-----|
| master-data/* | `TierGuard senior_admin` | `PermissionGuard permissionKey="master_data.view"` |
| interview/* | `TierGuard senior_admin` | `PermissionGuard permissionKey="interview.view"` |
| questions | `TierGuard senior_admin` | `PermissionGuard permissionKey="content.view_questions"` |
| invitations/* | `TierGuard senior_admin` | `PermissionGuard permissionKey="invitations.view"` |
| seeker-config/* | `TierGuard senior_admin` | `PermissionGuard permissionKey="seeker_config.view"` |
| platform-admins | `TierGuard senior_admin` | `PermissionGuard permissionKey="admin_management.view_all_admins"` |
| settings | `TierGuard senior_admin` | `PermissionGuard permissionKey="admin_management.view_settings"` |
| system-config | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.configure_system"` |
| permissions | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.manage_permissions"` |
| reassignments | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.approve_reassignments"` |
| assignment-audit-log | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.view_audit_logs"` |
| performance | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.view_team_performance"` |
| notifications/audit | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.view_audit_logs"` |
| compliance config | `TierGuard supervisor` | `PermissionGuard permissionKey="seeker_config.manage_compliance"` |
| smoke-test, regression, pulse-social | `TierGuard supervisor` | `PermissionGuard permissionKey="supervisor.configure_system"` |
| Admin Contact, Email Templates | `TierGuard senior_admin` | `PermissionGuard permissionKey="marketplace.manage_config"` |

### Phase 4: Fix AdminDashboard.tsx
Replace `requiredTier` with permission keys so dashboard cards match sidebar visibility.

### Phase 5: Fix usePoolPermissions
Change from tier-based to permission-based: `canWrite = hasPermission('marketplace.manage_pool')`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/PermissionGuard.tsx` | **NEW** — Permission-based route guard |
| `src/components/admin/AdminSidebar.tsx` | Fix all permission keys, add missing gates |
| `src/App.tsx` | Replace TierGuard with PermissionGuard on ~30 routes |
| `src/pages/admin/AdminDashboard.tsx` | Use permission keys instead of tier labels |
| `src/hooks/usePoolPermissions.ts` | Use `hasPermission('marketplace.manage_pool')` |
| `src/components/admin/TierGuard.tsx` | Keep for backward compat but unused by routes |

## What Does NOT Change
- No database changes
- No new permissions added
- `useAdminTier` hook stays the same (it's the source of `hasPermission`)
- KC pages stay accessible (read-only guidance)
- No RLS changes

