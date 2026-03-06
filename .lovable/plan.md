

## Plan: Create Seed Edge Function for Admin Tier Test Accounts

### Problem
The quick-login buttons for **Senior Admin** (`senioradmin@test.local`) and **Basic Admin** (`basicadmin@test.local`) exist in the UI, but these accounts do not exist in the database. Clicking them will fail with an auth error. The existing `admin@test.local` (Supervisor) account works because it was created separately.

The dashboard cards, sidebar navigation, and route-level `TierGuard` are already correctly filtering by tier -- the only gap is **account provisioning**.

### Solution
Create a `seed-admin-test-accounts` edge function (modeled on the existing `seed-test-reviewer`) that idempotently creates all three admin tier accounts. Add a "Seed Admin Accounts" button to the SmokeTestPage so supervisors can trigger it.

### Changes

**1. New Edge Function: `supabase/functions/seed-admin-test-accounts/index.ts`**

Creates/verifies three accounts in a single call:

| Account | Email | Password | `admin_tier` |
|---|---|---|---|
| Supervisor | `admin@test.local` | `Admin123!` | `supervisor` |
| Senior Admin | `senioradmin@test.local` | `SeniorAdmin123!` | `senior_admin` |
| Basic Admin | `basicadmin@test.local` | `BasicAdmin123!` | `admin` |

For each account, idempotently:
1. Check if auth user exists; create if not (with `email_confirm: true`)
2. Check if `user_roles` record exists for `platform_admin`; insert if not
3. Check if `platform_admin_profiles` record exists; create if not with correct `admin_tier`
4. Check if `profiles` record exists; insert if not

Uses `SUPABASE_SERVICE_ROLE_KEY` (same pattern as `seed-test-reviewer`).

**2. Update: `src/pages/admin/SmokeTestPage.tsx`**

Add a "Seed Admin Accounts" card (similar to existing "Test Data Seeder" card) that calls the new edge function. Shows success/error result. Placed right after the existing seeder card.

### Impact Analysis

| Area | Impact | Risk |
|---|---|---|
| Existing admin@test.local | Preserved (idempotent) | Zero |
| Provider/Reviewer/Org logins | None | Zero |
| Dashboard/Sidebar/TierGuard | Already correct | Zero -- accounts just need to exist |
| RLS policies | Unchanged | Zero |
| Production safety | Edge function only creates `@test.local` accounts | Low |

### Files
- `supabase/functions/seed-admin-test-accounts/index.ts` -- New edge function
- `src/pages/admin/SmokeTestPage.tsx` -- Add seed button for admin accounts

