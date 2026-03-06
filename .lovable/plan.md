

# Plan: Platform Admin Sub-Role Tiers (Supervisor, Senior Admin, Admin)

## Design Decision

**Keep `platform_admin` as the single `app_role`** — adding new enum values would require updating 50+ existing RLS policies. Instead, introduce an `admin_tier` column on `platform_admin_profiles` to differentiate access levels. This preserves all existing functionality with zero RLS impact.

## Current State
- One `platform_admin` role in `app_role` enum — used in 50+ RLS policies
- `is_supervisor` boolean on `platform_admin_profiles` — basic two-level distinction
- Login page: single "Platform Admin" tab
- Registration: single "Platform Admin" tab with access code
- All platform admins see the same sidebar/dashboard

## What Changes

### 1. Database Migration

**Alter `platform_admin_profiles`:**
- Add `admin_tier TEXT NOT NULL DEFAULT 'admin' CHECK (admin_tier IN ('supervisor', 'senior_admin', 'admin'))`
- Migrate existing data: `SET admin_tier = 'supervisor' WHERE is_supervisor = TRUE`
- Keep `is_supervisor` as a computed/backward-compatible column (or drop after migration — plan retains it as a generated column for backward compat)

**Alter `admin_access_codes`:**
- Add `admin_tier TEXT NOT NULL DEFAULT 'admin' CHECK (admin_tier IN ('supervisor', 'senior_admin', 'admin'))` — so access codes are tier-specific

**Add `fn_guard_tier_hierarchy` trigger:**
- Only supervisors can create/promote senior_admins
- Only supervisors/senior_admins can create regular admins
- Cannot demote self if last supervisor (existing BR-MPA-002 extended)

### 2. Edge Function Updates

**`register-platform-admin`:**
- Accept optional `adminTier` field (default: `'admin'`)
- Look up `admin_tier` from the `admin_access_codes` record to determine tier
- Set `admin_tier` on `platform_admin_profiles` insert

**`manage-platform-admin`:**
- `create` action: accept `admin_tier`, enforce hierarchy (supervisor can create any tier, senior_admin can only create admin)
- `update` action: enforce tier-based permission (only supervisor can change tier)
- No changes to `deactivate` (already supervisor-only)

### 3. Login Page — Sub-Tabs for Admin Portal

Split the existing single "Platform Admin" login tab into a dropdown or sub-selector:

```
Login Tab: "Platform Admin" (existing)
  → Sub-selector: Supervisor | Senior Admin | Admin
```

After login, store `adminTier` in sessionStorage alongside `activePortal`. Post-login validation checks `platform_admin_profiles.admin_tier` matches selected sub-role. If mismatch, show toast and redirect to correct tier view.

### 4. Registration Page — Tier-Aware Registration

The existing admin registration form adds a read-only tier indicator:
- Access code determines the tier (looked up from `admin_access_codes.admin_tier`)
- After entering code, display: "This code grants **Supervisor** access" (or Senior Admin / Admin)
- No manual tier selection — the code controls it

### 5. Sidebar Visibility by Tier

| Sidebar Section | Supervisor | Senior Admin | Admin |
|----------------|------------|--------------|-------|
| Dashboard | Yes | Yes | Yes |
| Master Data | Yes | Yes | Yes |
| Taxonomy | Yes | Yes | Yes |
| Interview Setup | Yes | Yes | Yes |
| Seeker Management | Yes | Yes | Read-only |
| Team Management (Platform Admins) | Yes | View-only | Hidden |
| Seeker Config | Yes | Yes | Hidden |
| Other (Settings, Tests) | Yes | Yes | Limited |
| My Profile | Yes | Yes | Yes |

### 6. New Hook: `useAdminTier`

```typescript
// Returns current user's admin tier from platform_admin_profiles
function useAdminTier(): {
  tier: 'supervisor' | 'senior_admin' | 'admin' | null;
  isSupervisor: boolean;
  isSeniorAdmin: boolean;
  isLoading: boolean;
}
```

Replaces ad-hoc `is_supervisor` checks throughout the codebase.

### 7. Existing Admin Pages — Tier-Based Guards

- `PlatformAdminListPage`: Supervisor sees full CRUD, Senior Admin sees list + view, Admin sees nothing (hidden from sidebar)
- `CreatePlatformAdminPage`: Supervisor + Senior Admin (senior can only create admin tier)
- `EditPlatformAdminPage`: Supervisor only
- `ViewPlatformAdminPage`: Supervisor + Senior Admin
- `MyProfilePage` / `AvailabilitySettingsPage`: All tiers

## Impact Analysis

| Area | Impact | Risk |
|------|--------|------|
| RLS Policies (50+) | **None** — still uses `has_role(uid, 'platform_admin')` | Zero |
| `useUserRoles` hook | **None** — `isAdmin` check unchanged | Zero |
| `AdminGuard` | **None** — still checks `platform_admin` role | Zero |
| `RoleBasedRedirect` | **None** — still routes to `/admin` | Zero |
| Login page | **Minor** — add sub-selector within admin tab | Low |
| Registration page | **Minor** — tier derived from access code | Low |
| `AdminSidebar` | **Moderate** — conditional section visibility | Low |
| Edge functions | **Moderate** — add tier validation logic | Low |
| Platform Admin pages | **Moderate** — replace `is_supervisor` with tier checks | Low |

## Files to Create/Modify

**New:**
- `src/hooks/useAdminTier.ts`

**Modified:**
- `supabase/functions/register-platform-admin/index.ts` — tier from access code
- `supabase/functions/manage-platform-admin/index.ts` — tier hierarchy enforcement
- `src/pages/Login.tsx` — admin sub-selector
- `src/pages/Register.tsx` — tier display from access code
- `src/components/admin/AdminSidebar.tsx` — tier-based visibility
- `src/pages/admin/platform-admins/PlatformAdminListPage.tsx` — tier guards
- `src/pages/admin/platform-admins/CreatePlatformAdminPage.tsx` — tier guards
- `src/pages/admin/platform-admins/EditPlatformAdminPage.tsx` — tier guards
- `src/hooks/queries/usePlatformAdmins.ts` — add `admin_tier` to columns
- `src/components/admin/platform-admins/platformAdminForm.schema.ts` — add tier field
- DB migration for `admin_tier` column + access code tier

## Implementation Order

1. DB migration (add `admin_tier`, migrate `is_supervisor` data)
2. Edge function updates (tier validation)
3. `useAdminTier` hook
4. Login/Registration UI changes
5. Sidebar + page-level tier guards

