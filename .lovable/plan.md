

# Fix: Block Admin Creation at Tier Depth 1

## Problem

When `platform_admin_tier_depth = 1`, the system is in single-operator mode (Supervisor only). No sub-tiers exist, so creating new admins is nonsensical. Currently:
- The "Add Platform Admin" button still appears on the list page
- The `/admin/platform-admins/new` route is accessible
- The create form renders without any depth check

## Changes

### 1. `PlatformAdminListPage.tsx`
- Change `canCreate` logic: set to `false` when `depth === 1`
- Hide the "Add Platform Admin" button and empty-state add button at depth 1

### 2. `CreatePlatformAdminPage.tsx`
- Import `usePlatformTierDepth` and check depth
- If `depth === 1`, show a message like "Admin creation is disabled in single-operator mode" and redirect back to the list

### 3. `PlatformAdminForm.tsx` (defense-in-depth)
- No changes needed if the page-level guard is sufficient, but optionally add a depth check as a safety net

### 4. Sidebar visibility (if applicable)
- At depth 1, optionally hide the "Team Management" / "Platform Admins" sidebar link entirely since there's nothing to manage — only the Supervisor's own profile matters. This is a UX choice to confirm with you.

## Summary of logic

```text
depth = 1 → Hide "Add" button, block /new route, show "single-operator" message
depth = 2 → Allow creating Senior Admins only (no Basic Admin tier)
depth = 3 → Full creation (Supervisor, Senior Admin, Admin)
```

No database changes required — this is purely frontend gating.

