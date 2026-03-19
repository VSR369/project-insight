

# Fix: "Invalid method: USER" Error Blocking AI Generation

## Root Cause

The `audit_trail` table has an enum column `method` that only accepts: `HUMAN`, `AUTO_COMPLETE`, or `SYSTEM`. But the code inserts `method: 'USER'` in multiple places, which the database rejects.

The "AI generation unavailable" is a **cascading failure**: the AI spec generates successfully, but then `createChallenge.mutateAsync()` (which calls `useSubmitSolutionRequest`) fails at the audit trail insert (line 112) because of the invalid enum value. This throws an error, which is caught by the `catch` block in `handleGenerateWithAI` (line 388), setting `aiFailure = true` and showing the amber fallback banner.

So the AI **did** work — the challenge record creation after it is what fails.

## Fix

Replace all `method: 'USER'` with `method: 'HUMAN'` across 3 files (8 occurrences total):

1. **`src/hooks/cogniblend/useSubmitSolutionRequest.ts`** (line 111)
   - `method: 'USER'` → `method: 'HUMAN'`

2. **`src/hooks/cogniblend/usePublishChallenge.ts`** (line 96)
   - `method: 'USER'` → `method: 'HUMAN'`

3. **`src/hooks/cogniblend/useQAManagement.ts`** (lines 76, 107, 154, 205)
   - All 4 instances: `method: 'USER'` → `method: 'HUMAN'`

That's it. One enum value fix across 3 files resolves both errors.

