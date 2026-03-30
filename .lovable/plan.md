

# Fix: AI Suggestions Not Showing After Re-Review

## Root Cause

There are **two** interacting bugs preventing AI suggestions from appearing after "Re-review this section":

### Bug 1: Race condition — signature-reset effect overwrites inline suggestion

In `AIReviewInline.tsx`, the re-review handler (`handleReReview`, line 418) does this sequence:
1. Gets `freshReview` from the edge function
2. Calls `onSingleSectionReview()` → updates the parent `review` prop
3. Sets `refinedContent` to `freshReview.suggestion` (line 465)
4. Sets `autoRefineTriggered.current = true`

But on the **next render**, the signature-reset effect (line 320) detects the `review` prop changed and:
- Resets `refinedContent = null` (line 326)
- Resets `autoRefineTriggered.current = false` (line 325)

This **overwrites** the suggestion that was just set in step 3.

### Bug 2: Auto-refine only fires for warning/needs_revision/generated — not pass

The auto-refine effect (line 288) has a condition at line 295:
```
review.status === "warning" || review.status === "needs_revision" || review.status === "generated"
```

If re-review returns `pass`, no auto-refine triggers, so no suggestion is ever shown — even if the edge function returned one.

Additionally, the LLM prompt itself says `suggestion: null for pass` (promptTemplate.ts line 379), so pass sections typically have no suggestion to show anyway.

## Fix — Two changes in `AIReviewInline.tsx`

### Change 1: Prevent signature-reset from overwriting re-review suggestion

In the `handleReReview` callback, **update the signature ref immediately** so the reset effect doesn't fire after re-review:

```typescript
// After line 461 (onSingleSectionReview call), add:
// Update signature immediately so the reset effect doesn't overwrite
const freshHash = freshReview.comments.map(c => 
  typeof c === 'string' ? c : c.text
).join('\x1f');
prevReviewSignature.current = `${freshReview.reviewed_at}|${freshReview.status}|${freshHash}`;
```

This ensures the signature-reset effect sees no change and doesn't clear `refinedContent`.

### Change 2: Handle non-string suggestions from re-review

Line 464 checks `typeof freshReview.suggestion === 'string'`, but for structured sections (line_items, tables), suggestions may need to be stringified. Broaden the check:

```typescript
// Line 463-467: Handle both string and object/array suggestions
if (freshReview.suggestion != null) {
  const suggestionStr = typeof freshReview.suggestion === 'string' 
    ? freshReview.suggestion 
    : JSON.stringify(freshReview.suggestion);
  if (suggestionStr.trim().length > 0) {
    setRefinedContent(suggestionStr);
    autoRefineTriggered.current = true;
  }
}
```

### Change 3: Include `pass` status in auto-refine inline-suggestion check

The auto-refine effect should also check for inline suggestions when status is `pass` — the LLM sometimes returns suggestions even for pass (strength improvements). Update line 295:

```typescript
(review.status === "pass" || review.status === "warning" || 
 review.status === "needs_revision" || review.status === "generated") &&
```

And add an early exit: if status is `pass` and there's no inline suggestion, skip the separate refine call (don't call `handleRefineWithAI` for pass sections):

```typescript
// After the inline suggestion check (line 304-306):
// For pass sections, don't trigger separate refine — only use inline suggestions
if (review.status === 'pass') return;
```

## Files Changed
- `src/components/cogniblend/shared/AIReviewInline.tsx` — 3 targeted edits (~15 lines total)

## Impact
- Suggestions will now correctly appear after re-review for all section types
- No change to edge function or prompt behavior
- Pass sections show inline suggestions when the LLM provides them
- Warning/needs_revision sections no longer lose their suggestion to the race condition

