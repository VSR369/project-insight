

# Plan: Fix Seed Data Enum Values

## Problem
The seeder uses two invalid enum values:
1. `challenge_legal_docs.status = 'default_applied'` — valid values are `ATTACHED`, `TRIGGERED`, `SIGNED`, `EXPIRED`
2. `amendment_records.status = 'APPLIED'` — valid values likely don't include `APPLIED`

## Fix
Update `supabase/functions/seed-cogni-test-data/index.ts`:

1. **Legal docs** (line 162-165): Change `status: "default_applied"` → `status: "ATTACHED"` for all 3 document types
2. **Amendment record** (line 182): Change `status: "APPLIED"` → `status: "UNDER_REVIEW"` (or whichever valid enum the `amendment_records` table accepts)

Then redeploy the edge function.

## Files to edit
| File | Change |
|------|--------|
| `supabase/functions/seed-cogni-test-data/index.ts` | Fix 2 enum values |

