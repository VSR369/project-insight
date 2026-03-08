

# Editable Permissions Management for Supervisors

## Current State

The Permissions Management page is a **read-only hardcoded matrix**. No database table exists for tier permissions — access control is enforced via hardcoded `useAdminTier` checks scattered across components and `TierGuard` route guards.

## What Needs to Change

### Database Layer
1. **New table: `tier_permissions`** — Stores which permissions are enabled/disabled per tier
   - Columns: `id`, `tier` (admin/senior_admin/supervisor), `permission_key` (e.g. `verification.view_dashboard`), `is_enabled`, `updated_at`, `updated_by`
   - Seed with current hardcoded defaults
   - RLS: supervisors can SELECT/UPDATE; others can SELECT only

2. **New table: `tier_permissions_audit`** — Audit trail for permission changes
   - Columns: `id`, `permission_key`, `tier`, `previous_value`, `new_value`, `changed_by_id`, `changed_at`, `change_reason`

### Hook Layer
3. **`useTierPermissions` hook** — Fetches all tier permissions from the database via React Query. Provides a `hasPermission(tier, key)` helper. Replaces the hardcoded matrix on the UI.

4. **`useUpdateTierPermission` mutation** — Toggles a permission for a tier. Calls Supabase update + invalidates cache. Supervisor-only.

### UI Layer
5. **Rework `PermissionsManagementPage.tsx`** — Replace static badges with interactive Switch/Toggle controls for supervisors. Keep read-only badges for non-supervisors. Add:
   - Toggle switches per permission per tier
   - "Supervisor" column is always fully enabled (non-editable — cannot remove own permissions)
   - Save confirmation toast on each toggle
   - Audit history section at the bottom (reuse the config audit pattern)

### Enforcement Integration
6. **`useAdminTier` enhancement** — Extend to also load the user's effective permissions from `tier_permissions`, so components can check `hasPermission('admin_management.create')` instead of `isSupervisor || isSeniorAdmin`.

## Key Design Decisions

- **Supervisor permissions are locked** — A supervisor cannot disable their own tier's permissions (prevents lockout)
- **Immediate effect** — Permission changes take effect on next page load (React Query cache invalidation)
- **Audit trail** — Every toggle is logged with who changed it and when
- **Backward compatible** — Existing `isSupervisor`/`isSeniorAdmin` checks continue to work as a fallback; the permission table provides granular overrides

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/xxx_tier_permissions.sql` | Create table, seed defaults, RLS, audit trigger |
| `src/hooks/queries/useTierPermissions.ts` | New — fetch + mutation hooks |
| `src/pages/admin/permissions/PermissionsManagementPage.tsx` | Rewrite — interactive toggles for supervisor, read-only for others |
| `src/hooks/useAdminTier.ts` | Extend — load effective permissions alongside tier |

