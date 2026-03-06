

# Platform Admin Sub-Role Tiers — Implementation Complete

## What Was Implemented

### Database
- Added `admin_tier` column to `platform_admin_profiles` (supervisor, senior_admin, admin)
- Added `admin_tier` column to `admin_access_codes` (tier-specific codes)
- Migrated existing `is_supervisor = true` → `admin_tier = 'supervisor'`
- Added `fn_guard_tier_hierarchy` trigger (prevents demoting last supervisor)
- Added index `idx_pap_admin_tier`

### Edge Functions
- `register-platform-admin`: Derives tier from `admin_access_codes.admin_tier`
- `manage-platform-admin`: Enforces tier hierarchy (supervisor > senior_admin > admin)

### Frontend
- `useAdminTier` hook: Returns `tier`, `isSupervisor`, `isSeniorAdmin`
- `AdminSidebar`: Tier-based visibility (Team Management, Seeker Config hidden for basic admin)
- `PlatformAdminForm`: Admin tier dropdown with hierarchy-restricted options
- `PlatformAdminListPage`: Tier column, tier-based CRUD buttons
- `CreatePlatformAdminPage`: Supervisor + Senior Admin can create (with tier restrictions)
- `EditPlatformAdminPage`: Supervisor only
- `ViewPlatformAdminPage`: Shows tier badge, supervisor-only edit/deactivate
- `Login.tsx`: Admin sub-tier selector (Supervisor | Senior Admin | Admin)

## Tier Permission Matrix

| Feature | Supervisor | Senior Admin | Admin |
|---------|-----------|--------------|-------|
| Dashboard | ✅ | ✅ | ✅ |
| Master Data | ✅ | ✅ | ✅ |
| Taxonomy | ✅ | ✅ | ✅ |
| Interview Setup | ✅ | ✅ | ✅ |
| Seeker Management | ✅ | ✅ | ✅ |
| Team Management (list) | ✅ | ✅ (view-only) | ❌ |
| Create Admin | ✅ (any tier) | ✅ (admin only) | ❌ |
| Edit Admin | ✅ | ❌ | ❌ |
| Deactivate Admin | ✅ | ❌ | ❌ |
| Seeker Config | ✅ | ✅ | ❌ |
| My Profile | ✅ | ✅ | ✅ |

## Zero-Impact Areas
- All 50+ RLS policies unchanged (still use `has_role(uid, 'platform_admin')`)
- `AdminGuard` unchanged
- `useUserRoles` unchanged
- `RoleBasedRedirect` unchanged
- All existing admin CRUD for master data, seekers, etc. untouched
