

# Fix: setup-test-scenario Edge Function — Invalid Governance Profile Values

## Root Cause
The `seeker_organizations` table has a CHECK constraint allowing only: `QUICK`, `STRUCTURED`, `CONTROLLED`.

The edge function uses `ENTERPRISE` and `LIGHTWEIGHT` which violate this constraint, causing a 500 error on every seed attempt.

## Fix

**File: `supabase/functions/setup-test-scenario/index.ts`**

Replace all invalid `governanceProfile` values in the `SCENARIOS` config:

| Scenario | Current (invalid) | Fix |
|----------|-------------------|-----|
| `mp_quick` | `LIGHTWEIGHT` | `QUICK` |
| `mp_enterprise_3` | `ENTERPRISE` | `CONTROLLED` |
| `agg_enterprise_8` | `ENTERPRISE` | `CONTROLLED` |
| `agg_quick_bypass` | `LIGHTWEIGHT` | `QUICK` |
| `new_horizon_demo` | `ENTERPRISE` | `CONTROLLED` |

The mapping logic: `LIGHTWEIGHT` → `QUICK` (minimal governance), `ENTERPRISE` → `CONTROLLED` (maximum governance with all gates enabled).

No other file changes needed — the fix is entirely within the edge function's scenario config object (lines 24-95).

