

# Fix: AM → CA Data Flow + Demo Data Cleanup

## Root Cause (Confirmed)

Three distinct issues prevent the AM → CA handoff from working:

### Issue 1: Backend role matching ignores CA
- `get_phase_required_role(2)` returns `'CR'` (hardcoded)
- `get_user_dashboard_data` checks `v_required_role = ANY(rec.role_codes)` — Chris has `['CA']` but required is `'CR'` → item goes to `waiting_for` instead of `needs_action`
- `can_perform` checks `role_code = p_required_role` — Chris has `CA`, system expects `CR` → returns `false` → phase completion would also fail

### Issue 2: Demo cleanup fails silently
- 11 duplicate "New Horizon Company" orgs exist with 18 orphaned challenges
- Edge function tries to `DELETE FROM challenges` but `audit_trail` (32 rows) and `sla_timers` (6 rows) have `NO ACTION` FK constraints blocking deletion
- Cleanup silently fails, old data persists

### Issue 3: CA login lands on wrong page
- `DemoLoginPage` routes Chris to `/cogni/challenges/create` instead of `/cogni/dashboard`
- CA should land on dashboard to see incoming requests from AM

## Implementation

### Step 1: DB Migration — CA/CR Role Equivalence

Create two SQL changes:

**A) Helper function `roles_equivalent`:**
```sql
CREATE OR REPLACE FUNCTION public.roles_equivalent(p_required text, p_actual text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_required = p_actual
      OR (p_required = 'CR' AND p_actual = 'CA')
      OR (p_required = 'CA' AND p_actual = 'CR');
$$;
```

**B) Update `can_perform`:** Replace `role_code = p_required_role` with `roles_equivalent(p_required_role, role_code)` in the EXISTS check.

**C) Update `get_user_dashboard_data`:** Replace `v_required_role = ANY(rec.role_codes)` with a check that uses `roles_equivalent` to match any of the user's role codes.

### Step 2: Fix Edge Function Cleanup

Update `setup-test-scenario/index.ts` to delete dependent rows before challenges:
```
audit_trail → sla_timers → user_challenge_roles → challenge_legal_docs → challenges → org_users → seeker_organizations
```

### Step 3: Fix CA Login Destination

In `DemoLoginPage.tsx`, change Chris Rivera's `aiDestination` and `manualDestination` to `/cogni/dashboard` instead of `/cogni/challenges/create`.

### Step 4: Redeploy Edge Function

Deploy the updated `setup-test-scenario` function so the cleanup works properly.

## Files Changed
- 1 new migration (role equivalence + function updates)
- `supabase/functions/setup-test-scenario/index.ts` (cleanup order fix)
- `src/pages/cogniblend/DemoLoginPage.tsx` (CA destination)

## Expected Result
1. Re-seed creates fresh data with no duplicates
2. Chris (CA) logs in → lands on dashboard → sees "Predictive Maintenance" in Incoming Requests
3. Clicking "Review" opens spec page with AM's problem statement, scope, budget, timeline prefilled
4. Phase completion works because `can_perform` now accepts CA for Phase 2

