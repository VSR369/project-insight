

## Fix: Accept Suggestion Not Updating Section Content

### Root Cause Analysis

Two interrelated bugs prevent Accept from working:

**Bug 1 — Effect Race Condition (refinedContent cleared after seeding)**

In `useAIReviewInlineState.ts`, two effects fire in the same render when a Pass 2 review arrives:

```text
Effect 1 (line 99): Seeds refinedContent from review.suggestion
Effect 2 (line 154): Detects review signature change → clears refinedContent = null

React runs them in declaration order. Effect 2 overwrites Effect 1.
Result: refinedContent is null. User either sees no suggestion at all,
or if it briefly appears, handleAccept hits "No AI suggestion available" guard.
```

The auto-refine fallback (line 116) that would re-seed is blocked by `suppressAutoRefine={reviewSessionActive}` in the curation workflow. And even when not suppressed, it short-circuits on line 134 (`if (review.suggestion != null) return;`) assuming the seeding effect already handled it — but it didn't, because the reset effect cleared it.

**Bug 2 — Double-mutation on same useMutation instance**

`handleAccept` calls both:
1. `onAcceptRefinement(sectionKey, content)` → `saveSectionMutation.mutate({ field: dbField, value })` 
2. `onMarkAddressed(sectionKey)` → `saveSectionMutation.mutate({ field: 'ai_section_reviews', value })`

TanStack Query's `useMutation.mutate()` called twice in the same tick discards `onSuccess` for the first call. If the section data mutation is first and its `onSuccess` (which invalidates the query) is discarded, the UI may not refetch at all — it only refetches if the second mutation's `onSuccess` fires.

### Fix Plan

**File 1: `src/components/cogniblend/shared/useAIReviewInlineState.ts`**

1. **Fix the effect race**: Move the reset logic to run BEFORE the seeding logic, or merge them into a single effect. The safest approach: in the reset effect (line 154-167), do NOT clear `refinedContent` if the new review has a `suggestion`. Instead, let the seeding effect handle it on the next tick.

   Concrete change: In the reset effect, skip clearing `refinedContent` when the incoming review has a non-null `suggestion`:
   ```typescript
   // Reset effect — only clear refinedContent if the new review has no suggestion
   if (prevReviewSignature.current !== null && prevReviewSignature.current !== sig) {
     autoRefineTriggered.current = false;
     if (review?.suggestion == null) {
       setRefinedContent(null);
     }
     setEditedSuggestedContent(null);
     setEditedDeliverableItems(null);
     setSelectedItems(new Set());
   }
   ```

   Also add `review?.suggestion` to the reset effect's deps so it re-evaluates when suggestion appears.

2. **Add fallback in handleAccept**: If `refinedContent` is null but `review.suggestion` exists, use `review.suggestion` directly as a last-resort fallback before showing the error toast.

**File 2: `src/hooks/cogniblend/useCurationApprovalActions.ts`**

3. **Decouple handleMarkAddressed from saveSectionMutation**: `handleMarkAddressed` should NOT call `saveSectionMutation.mutate()` for `ai_section_reviews`. Instead, it should only update local state (`setAiReviews`). The Zustand store sync will persist the addressed state via its debounced save. This eliminates the double-mutation problem.

   ```typescript
   const handleMarkAddressed = useCallback((sectionKey: string) => {
     setAiReviews((prev) => prev.map((r) =>
       r.section_key === sectionKey ? { ...r, addressed: true } : r
     ));
     // No saveSectionMutation.mutate here — store sync handles persistence
   }, [setAiReviews]);
   ```

   Also: stop clearing `comments: []` — addressed doesn't mean comments should be deleted. Comments should remain for audit/history.

### Files to Change

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/useAIReviewInlineState.ts` | Fix effect race, add fallback in handleAccept |
| `src/hooks/cogniblend/useCurationApprovalActions.ts` | Decouple handleMarkAddressed from mutation |

### Technical Detail

```text
Current broken flow:
Pass 2 arrives → seed effect sets refinedContent → reset effect clears it
→ refinedContent = null → Accept hits guard → "No AI suggestion" error

OR:
refinedContent is set → Accept calls two mutations on same useMutation
→ first mutation's onSuccess (query invalidation) discarded
→ DB saves but UI doesn't refetch

Fixed flow:
Pass 2 arrives → reset effect skips clearing (suggestion exists)
→ seed effect sets refinedContent → user sees suggestion
→ Accept calls onAcceptRefinement → single mutation fires → onSuccess invalidates
→ handleMarkAddressed only updates local state → store sync persists later
```

