

## Problem

The `admin@test.local` user has the `platform_admin` role in `user_roles` but **no corresponding record in `platform_admin_profiles`**. The `useAdminTier` hook (used by `AdminSidebar` and `AdminHeader`) calls `.single()` which throws a 406 error when 0 rows are returned, causing the admin screens to fail to render.

## Fix

**File: `src/hooks/useAdminTier.ts`**

Change `.single()` to `.maybeSingle()` so that a missing profile row returns `null` instead of throwing an error. When `profile` is null, default the tier to `null` and let the UI render gracefully with no tier-restricted items visible.

This is a one-line change: line 29 `.single()` → `.maybeSingle()`.

This will immediately unblock the admin dashboard for users who have the `platform_admin` role but haven't yet been registered via the platform admin registration flow.

