

# 5-Why Analysis: Seed Demo Scenario Failure

## Error
```
"CONTROLLED challenge: Invalid maturity_level: growth"
```

## 5-Why Chain

**Why 1:** The `setup-test-scenario` edge function returns a 500 error when inserting the CONTROLLED challenge.
→ Because the database trigger `trg_challenges_validate` rejects the insert.

**Why 2:** The trigger rejects the insert.
→ Because `maturity_level: "growth"` fails the CHECK: `maturity_level NOT IN ('BLUEPRINT','POC','PROTOTYPE','PILOT')`.

**Why 3:** The seed function uses `"growth"`, `"emerging"`, `"concept"` as maturity levels.
→ Because when the seed data was written, it used arbitrary descriptive labels instead of the platform's enum values.

**Why 4:** The trigger enforces `('BLUEPRINT','POC','PROTOTYPE','PILOT')` as the only valid values.
→ Because migration `20260318025218` added a validation trigger with these exact values (line 28-29).

**Why 5:** The seed function was never tested against the actual database constraints.
→ Because it was written/updated without cross-referencing the validation trigger migration.

## Root Cause

The seed function uses **3 invalid maturity_level values** that don't match the database trigger constraint:

| Challenge | Current (WRONG) | Correct |
|-----------|-----------------|---------|
| CONTROLLED (AI Predictive Maintenance) | `"growth"` | `"PROTOTYPE"` |
| STRUCTURED (Healthcare Claims) | `"emerging"` | `"POC"` |
| QUICK (Supply Chain Dashboard) | `"concept"` | `"BLUEPRINT"` |

## Fix

**File:** `supabase/functions/setup-test-scenario/index.ts`

Three single-value changes:
- Line 325: `"growth"` → `"PROTOTYPE"`
- Line 348: `"emerging"` → `"POC"`
- Line 370: `"concept"` → `"BLUEPRINT"`

Redeploy the edge function after.

