

# Fix: Seed Demo Scenario — `context_background` column error

## Root Cause

Line 325 of `setup-test-scenario/index.ts` inserts `context_background` as a **top-level column** on the `challenges` table. This column does not exist — `context_background` is a field inside the `extended_brief` JSONB column.

The error: `"Could not find the 'context_background' column of 'challenges' in the schema cache"`

## Fix

**File:** `supabase/functions/setup-test-scenario/index.ts`

**Change:** On line 325, remove `context_background: "Our facility operates 24/7..."` from the top-level insert object. The value is already included inside `extended_brief` on line 330 (`context_background: "Facility operates 24/7, 12 production lines."`).

Single line removal — no other files affected. Redeploy the edge function after.

