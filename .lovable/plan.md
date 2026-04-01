

# Fix: My Challenges — Draft vs Submitted State & Resume Bug

## Problem Summary

Two related bugs after submitting a challenge that was previously saved as a draft:

1. **Duplicate challenge created**: When submitting from a draft (`?draft=<id>`), the submit flow always calls `initialize_challenge` RPC to create a **new** challenge instead of using the existing draft. The old draft remains at Phase 1 ("Draft" status) while a new challenge is created at Phase 2.

2. **Resume shows empty form**: Clicking "Resume" on the old draft loads it, but since all form data was saved to the *new* challenge, the draft has no meaningful data.

3. **Missing query invalidation**: `onSuccess` in `useSubmitSolutionRequest` doesn't invalidate `['cogni-my-challenges']`, so the list may show stale data.

**Additionally**, the My Challenges page shows "Resume" for all drafts but doesn't distinguish between a true draft (never submitted) and a submitted challenge. Per the user's requirement:
- **Draft (Phase 1, not submitted)** → "Resume" button + "Delete" button
- **Submitted to Curator (Phase 2+)** → "View" button only

## Plan

### 1. Add `draftChallengeId` to `SubmitPayload` in `useSubmitSolutionRequest.ts`

- Add optional `draftChallengeId?: string` to the `SubmitPayload` interface
- When `draftChallengeId` is provided, **skip** `initialize_challenge` RPC and use the existing challenge ID directly
- Update the challenge record with form data and call `complete_phase` on the existing draft
- Add `['cogni-my-challenges']` to query invalidation in `onSuccess`

### 2. Pass `draftChallengeId` from `ChallengeCreatorForm.tsx`

- In `handleSubmit`, include `draftChallengeId` in the payload passed to `submitMutation.mutateAsync()`
- This ensures drafts are promoted rather than duplicated

### 3. Fix `MyChallengesPage.tsx` action buttons

The current logic already correctly distinguishes draft vs non-draft:
```
isDraft = master_status === 'IN_PREPARATION' && current_phase === 1
```
- Draft → Resume + Delete (already correct)
- Non-draft → View (already correct)

No changes needed here since fixing bugs #1 and #2 will resolve the display issue — submitted challenges will properly advance to Phase 2 and show "View" instead of "Resume".

## Files Changed

| File | Change |
|---|---|
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Add `draftChallengeId` to payload; skip `initialize_challenge` when present; add `cogni-my-challenges` invalidation |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Pass `draftChallengeId` in submit payload |

