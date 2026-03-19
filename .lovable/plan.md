

# Fix "Organization not found" on Generate with AI

## Root Cause

The `ConversationalIntakePage` calls `useCurrentOrg()` which queries `org_users` table. When the user clicks "Generate with AI", the AI generation succeeds, but then the code hits a null check on `currentOrg` at line 149 — AFTER the expensive AI call already completed. Two issues:

1. **Validation order bug**: The org check happens AFTER the AI call instead of BEFORE it. The AI generation runs, succeeds, but then the challenge creation fails because `currentOrg` is null.

2. **No org data exists**: The demo seed may not have been run, or may have failed silently. Currently no "New Horizon Company" org exists in the database.

## Fix Plan

### Change 1: Move org validation before AI call (`ConversationalIntakePage.tsx`)

In `handleGenerateWithAI` (line 140), move the `currentOrg` null check to the TOP of the function, before calling `generateSpec.mutateAsync()`. Also add a loading guard so the button is disabled while org data is loading.

```
Before:
  1. Call AI → wait for response
  2. Check if org exists → fail with "Organization not found"

After:
  1. Check if org exists → fail early with helpful message
  2. Call AI → proceed with challenge creation
```

Specific changes:
- Lines 141-147: Insert org/user null check at the start of the function, with a more helpful error message ("Please log in and ensure your organization is set up")
- Line 149-152: Remove the now-redundant check
- Add `orgLoading` to the button's disabled condition so users can't click while org is resolving

### Change 2: No edge function changes needed

The `setup-test-scenario` edge function already correctly inserts `org_users`, `user_roles`, `user_challenge_roles`, and a demo challenge. The `generate-challenge-spec` edge function has no org dependency — it just calls the AI gateway. The issue is purely in the frontend validation order.

## Technical Details

**File**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Move lines 149-152 (org null check) to be the first thing inside `handleGenerateWithAI`, before the `generateSpec.mutateAsync` call at line 143
- Update the error message to be more actionable: guide user to seed demo data or check their org setup
- Add `orgLoading` to the "Generate with AI" button's disabled state

