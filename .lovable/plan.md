

# Plan: Fix Demo Seed to Support Marketplace Model

## Root Cause

The `setup-test-scenario` edge function hardcodes:
- `operatingModel: "AGG"` — the org is always Aggregator
- Only `nh-rq@testsetup.dev` exists — no `nh-am@testsetup.dev` user is created

When a user selects **Marketplace (MP)** on the demo login page, the UI shows `nh-am@testsetup.dev` but that user doesn't exist in the database, causing "No organization linked" error.

## Solution

Seed **both** AM and RQ users always, and update the org's `operating_model` at login time based on the demo selection.

## Changes

### 1. `supabase/functions/setup-test-scenario/index.ts`

- Add `nh-am@testsetup.dev` (Alex Morgan, roles: `["AM"]`) to the `new_horizon_demo` users list
- Update Sam Solo's roles to include both `AM` and `RQ`
- This ensures both MP and AGG demo paths have valid users

### 2. `src/pages/cogniblend/DemoLoginPage.tsx` — Update org operating_model at login

In `handleLogin`, after successful sign-in and org_users check, update the org's `operating_model` to match the selected engagement model:

```ts
// Update org operating model to match demo selection
const { data: orgUser } = await supabase
  .from('org_users')
  .select('organization_id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();

if (orgUser) {
  await supabase
    .from('seeker_organizations')
    .update({ operating_model: engagementModel === 'MP' ? 'MP' : 'AGG' })
    .eq('id', orgUser.organization_id);
}
```

This ensures the downstream `OrgContext`, `SimpleIntakeForm`, and lifecycle logic all respect the selected model.

### 3. Redeploy edge function

The `setup-test-scenario` function must be redeployed after the user list change.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Add `nh-am@testsetup.dev` user; add AM to Solo's roles |
| `src/pages/cogniblend/DemoLoginPage.tsx` | Update org `operating_model` on login based on engagement model selection |

