

# Plan: Seed Subscription Tier on Demo Organization

## Problem
The `seeker_organizations` insert in the seed function does not set the `subscription_tier` column. This defaults the org to "basic" tier, which only allows QUICK governance mode. The `new_horizon_demo` scenario sets `governance_profile: "ENTERPRISE"` (STRUCTURED mode), but the tier gate blocks it.

## Fix

### File: `supabase/functions/setup-test-scenario/index.ts`

Add `subscription_tier` to each scenario config and include it in the org insert:

| Scenario | `subscription_tier` | Reason |
|----------|-------------------|--------|
| `agg_enterprise` | `"enterprise"` | Full governance access |
| `agg_lightweight_bypass` | `"basic"` | QUICK-only, matches LIGHTWEIGHT |
| `new_horizon_demo` | `"premium"` | Unlocks QUICK + STRUCTURED + CONTROLLED |

**Changes:**

1. **Scenario configs** (lines 30-88): Add `subscriptionTier` field to each scenario definition.

2. **Org insert** (line 195-207): Add `subscription_tier: config.subscriptionTier` to the insert object.

3. **Results log**: Add a line showing the tier that was seeded so the user can verify.

This ensures the governance mode engine (`getAvailableGovernanceModes`) returns the correct modes for the org, and the tier limit check (`useTierLimitCheck`) uses the right quota.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Add `subscriptionTier` to scenario configs and org insert |

