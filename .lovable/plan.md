

## Plan: Separate Admin Tier Logins and Fix useAdminTier

### Problem

1. **`useAdminTier` crashes** when no `platform_admin_profiles` record exists (uses `.single()` which throws 406 on 0 rows)
2. **Only one "Platform Admin" quick-login button** — all three tiers share `admin@test.local`, making it impossible to test tier-specific features separately
3. The admin sub-tier selector on the login card is cosmetic — it writes to `sessionStorage` but the actual tier is determined by the DB record, so it has no real effect and creates confusion

### Changes

**1. Fix `src/hooks/useAdminTier.ts` (1-line fix)**
- Change `.single()` to `.maybeSingle()` on line 29
- When no profile exists, return `null` tier gracefully instead of crashing

**2. Update `src/pages/Login.tsx` — Split admin quick-login into 3 buttons**

Replace the single "Platform Admin" entry in `DEV_ACCOUNTS` with three separate entries:

| Button | Email | Portal | Description |
|---|---|---|---|
| Supervisor | `admin@test.local` | admin | Full system access (all features) |
| Senior Admin | `senioradmin@test.local` | admin | Config + team view, no edit/deactivate |
| Basic Admin | `basicadmin@test.local` | admin | Core admin only, no team mgmt or seeker config |

The quick-login grid changes from 4 columns to 6 (or wraps to 2 rows of 3).

**3. Remove the admin sub-tier selector buttons** from the login card header (lines 413-431) — they serve no purpose since tier is DB-driven, and having them implies the user can choose their tier at login, which is incorrect and confusing.

### Impact Analysis

| Area | Impact | Risk |
|---|---|---|
| Provider login/routes | None | Zero — no admin code touched |
| Reviewer login/routes | None | Zero — no reviewer code touched |
| Organization login/routes | None | Zero — no org code touched |
| AdminGuard | None | Still checks `has_role(uid, 'platform_admin')` |
| AdminSidebar tier logic | None | Still reads from `useAdminTier` hook |
| RoleBasedRedirect | None | Still checks `user_roles` table |
| Existing admin@test.local | Preserved | Same credentials, same behavior |

### Pre-requisite

The `senioradmin@test.local` and `basicadmin@test.local` test accounts must exist in Supabase Auth with corresponding `user_roles` (platform_admin) and `platform_admin_profiles` records (with correct `admin_tier`). These will need to be created via the edge function or directly in the database. The plan will note this but not auto-create them — you will need to register them through the platform admin registration flow or insert them manually.

### Files Modified
- `src/hooks/useAdminTier.ts` — `.single()` → `.maybeSingle()`
- `src/pages/Login.tsx` — 3 admin quick-login buttons, remove sub-tier selector

