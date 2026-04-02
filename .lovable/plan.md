

# Auto-Save After Fill Test Data

## What's Happening Now
- "Fill Test Data" populates the form locally (no DB write)
- User must manually click "Submit to Curator" to persist and advance

## Proposed Enhancement
After "Fill Test Data" populates the form, automatically trigger "Save Draft" so the data is immediately persisted in the database. The user can then review and click "Submit to Curator" when ready.

**Why not auto-submit?** Submitting advances the challenge to Phase 2 (Curation) immediately — the user should review the seeded data first and consciously submit.

## Changes

### 1. `ChallengeCreatorForm.tsx`
After `form.reset(filteredSeed)` in `handleFillTestData`, automatically call `handleSaveDraft()` so the filled data is persisted as a Phase 1 draft. Show a toast: "Test data filled & saved as draft."

### 2. Flow After Fill
1. User clicks "Fill Test Data"
2. Form populates with seed content + org context saves to `seeker_organizations`
3. Draft auto-saves to `challenges` table (Phase 1)
4. User reviews → clicks "Submit to Curator" → advances to Phase 2

## Files Modified
| File | Change |
|------|--------|
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Call `handleSaveDraft()` after `form.reset()` in `handleFillTestData` |

## Technical Detail
- `handleSaveDraft` already handles both new draft creation (`useSaveDraft`) and existing draft update (`useUpdateDraft`)
- The auto-save uses the same mutation path, so error handling and query invalidation are already wired
- A small `setTimeout` (100ms) ensures the form state is fully committed before reading values for the draft payload

