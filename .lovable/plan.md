

# Plan: Add Master Data Access Control to Permissions Matrix

## Problem
Master Data pages (Countries, Industries, Academic hierarchy, etc.) have no entries in the permissions matrix. Access is controlled by hardcoded tier flags in `AdminSidebar.tsx` rather than the configurable `tier_permissions` table. This means Supervisors cannot dynamically grant/revoke Master Data access per tier.

## Changes

### 1. Add Master Data permission category to `PermissionsManagementPage.tsx`

Add a new category to `PERMISSION_CATEGORIES`:

```typescript
{
  category: 'Master Data',
  permissions: [
    { key: 'master_data.view', label: 'View Master Data' },
    { key: 'master_data.create', label: 'Create Records' },
    { key: 'master_data.edit', label: 'Edit Records' },
    { key: 'master_data.deactivate', label: 'Deactivate Records' },
    { key: 'master_data.delete', label: 'Delete Records' },
  ],
},
```

Also add a `CardDescription` for the new category.

### 2. Seed `tier_permissions` table in Supabase

Insert rows for each new permission key × tier combination so the matrix has data to display:

```sql
INSERT INTO tier_permissions (tier, permission_key, is_enabled)
VALUES
  ('supervisor', 'master_data.view', true),
  ('supervisor', 'master_data.create', true),
  ('supervisor', 'master_data.edit', true),
  ('supervisor', 'master_data.deactivate', true),
  ('supervisor', 'master_data.delete', true),
  ('senior_admin', 'master_data.view', true),
  ('senior_admin', 'master_data.create', true),
  ('senior_admin', 'master_data.edit', true),
  ('senior_admin', 'master_data.deactivate', false),
  ('senior_admin', 'master_data.delete', false),
  ('admin', 'master_data.view', true),
  ('admin', 'master_data.create', false),
  ('admin', 'master_data.edit', false),
  ('admin', 'master_data.deactivate', false),
  ('admin', 'master_data.delete', false);
```

### 3. Wire sidebar visibility to dynamic permissions (optional enhancement)

In `AdminSidebar.tsx`, replace the hardcoded `canSeeTeamManagement` check for Master Data menu items with `hasPermission('master_data.view')` so the sidebar respects the matrix. This makes the permission toggles actually functional — not just display.

## What stays unchanged
- All other permission categories
- Audit log functionality
- TierGuard route protection (remains tier-based)
- Existing Master Data pages and CRUD logic

## Technical note
The seed SQL must be run against the Supabase database. The frontend changes are in one file only (`PermissionsManagementPage.tsx`).

