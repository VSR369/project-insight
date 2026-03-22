

# Plan: Fix Demo Login for All Engagement Models & Governance Modes

## Root Cause Analysis

**Database state investigation reveals 3 problems:**

1. **`nh-am@testsetup.dev` has NO `org_users` record** — The user exists in `auth.users` but was never linked to an organization. The seed function was updated to include AM but was never re-run, OR a previous partial seed created the auth user without completing the org linkage.

2. **4 duplicate "New Horizon Company" organizations exist** — The cleanup logic in the seed function fails to fully cascade-delete old data. Stale orgs accumulate across re-seeds, causing data drift.

3. **RLS may block `operating_model` update** — The `seeker_organizations` UPDATE policy requires `tenant_id = get_user_tenant_id()` which depends on `org_users` existing. If the update fails silently, the org stays on AGG even when MP is selected.

## Changes

### 1. `supabase/functions/setup-test-scenario/index.ts` — Robust cleanup

- Before creating a new org, delete ALL stale data in the correct cascade order:
  - `user_challenge_roles` → `challenges` → `org_users` → `user_roles` (for scenario users) → `seeker_organizations`
- Also delete stale `org_users` records for ALL scenario user emails (not just by org_id) to handle orphaned records from partial runs
- This prevents duplicate orgs and ensures a clean slate

### 2. `src/pages/cogniblend/DemoLoginPage.tsx` — Resilient login flow

- After confirming `orgRow` exists, wrap the `seeker_organizations` update in a try-catch so a silent RLS failure doesn't break login
- Add a fallback: if the update via client fails, invoke an edge function (or skip gracefully with a warning toast)
- Add a more descriptive error when org_users is missing: "User not linked to org. Please re-seed the demo scenario."

### 3. Redeploy edge function & document re-seed requirement

After deploying the updated edge function, the user must click "Seed Demo Scenario" again to create proper org_users records for all users including AM.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Robust cascading cleanup; delete orphaned org_users by user email |
| `src/pages/cogniblend/DemoLoginPage.tsx` | Wrap operating_model update in try-catch; improve error message |

