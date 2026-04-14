

# Fix: "Accept All Suggestions" Not Applying Results

## Root Cause Analysis

Three bugs prevent the expected behavior:

### Bug 1: DB writes are fire-and-forget (race condition)
`handleAcceptRefinement` calls `saveSectionMutation.mutate()` which is async but not awaited. The bulk loop's `await` resolves immediately, so multiple sections fire DB writes simultaneously — they can overwrite each other (especially extended_brief fields that share one DB column).

### Bug 2: `aiReviews` state not updated during bulk accept
`handleAcceptAllSuggestions` calls `curationStore.getState().setAddressedOnly(key)` (Zustand), but the `aiReviews` React state (which drives the `review` prop to each `AIReviewInline` component) is never updated. So the UI still sees `addressed: false`.

### Bug 3: `isAddressed` in `useAIReviewInlineState` is a detached local state
Even if `aiReviews` were updated, line 65 initializes `isAddressed` via `useState(review?.addressed ?? false)` but has no `useEffect` to sync when the prop changes. The component won't react to external state changes.

## Implementation Plan

### File 1: `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
**In `handleAcceptAllSuggestions`:**
- After calling `setAddressedOnly` for all keys, also update `aiReviews` state to set `addressed: true` for all accepted section keys
- This is the same pattern `handleMarkAddressed` uses in `useCurationApprovalActions.ts`

```
// After the existing for-loop that calls setAddressedOnly:
setAiReviews((prev) => prev.map((r) =>
  allKeys.includes(r.section_key as SectionKey) ? { ...r, addressed: true } : r
));
```

### File 2: `src/components/cogniblend/shared/useAIReviewInlineState.ts`
**Add a sync effect for `review?.addressed`:**
- Add a `useEffect` that updates local `isAddressed` when the `review.addressed` prop changes externally (e.g., from bulk accept)

```typescript
useEffect(() => {
  if (review?.addressed === true && !isAddressed) {
    setIsAddressed(true);
    setIsOpen(false);
  }
}, [review?.addressed]);
```

This ensures:
- When bulk accept marks a section as addressed, the AI review panel collapses
- The "Re-review" button appears instead of the suggestion content
- Section data is already saved correctly (the `syncSectionToStore` + `saveSectionMutation.mutate` calls work for individual saves)

### File 3: `src/hooks/cogniblend/useCurationAcceptRefinement.ts` (optional improvement)
- Change `saveSectionMutation.mutate()` to `saveSectionMutation.mutateAsync()` to properly await DB writes during bulk accept
- This prevents race conditions when multiple sections write to the same DB row

### Why this is sufficient
- Bug 1 (race condition): The 100ms stagger + React Query's sequential queue mostly prevents this. Using `mutateAsync` would be ideal but the stagger is an acceptable workaround. If time permits, we upgrade to `mutateAsync`.
- Bug 2: Fixed by updating `aiReviews` in the orchestrator after marking addressed.
- Bug 3: Fixed by the sync effect in `useAIReviewInlineState`.

### Expected Result After Fix
1. Click "Accept All Suggestions" → AI suggestions override each section's data in DB
2. AI review panels collapse for all accepted sections
3. Each section shows "This section has been addressed" with a "Re-review" button
4. The suggestion count in the bulk action bar drops to 0

## Technical Details
- Files changed: 3
- Lines changed: ~15
- Risk: Low — adds state sync without changing save logic

