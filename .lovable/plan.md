

# Fix: Accept Suggestion Not Working Consistently

## Root Cause Analysis

Three interacting bugs cause Accept to silently fail:

### Bug 1: Signature hash mismatch → race condition clears suggestion

**Line 329** computes the comment hash using `.join('\x1f')` on the raw comments array. When comments are objects (e.g. `{text: "...", type: "warning"}`), `.join()` produces `[object Object]` for each.

But **line 472-474** (in `handleReReview`) correctly extracts `.text` from object comments before joining.

Result: After re-review, the signature-reset effect (line 328-339) computes a **different** hash than what `handleReReview` set → detects a "change" → clears `refinedContent` to null → Accept finds nothing to save.

### Bug 2: Silent early return when refinedContent is null

**Line 568**: `if (!refinedContent) return;` — if the suggestion was lost to the race condition above, or auto-refine hasn't completed, clicking Accept does absolutely nothing. No toast, no feedback. The user thinks the system is broken.

### Bug 3: Pass status sections never get refinedContent

For sections returning `pass` with no inline suggestion, auto-refine skips (line 315: `if (review.status === 'pass') return;`), so `refinedContent` stays null permanently. Accept always silently fails for these sections.

## Fix — 2 changes in `AIReviewInline.tsx`

### Change 1: Fix signature hash to handle object comments consistently

**Line 329** — normalize comments the same way as `handleReReview`:

```typescript
const commentHash = (review?.comments ?? []).map((c: any) =>
  typeof c === 'string' ? c : c.text ?? JSON.stringify(c)
).join('\x1f');
```

This eliminates the race condition — the reset effect will compute the same hash as `handleReReview` set, so it won't clear `refinedContent`.

### Change 2: Show feedback when Accept has nothing to apply

**Line 568** — instead of silent return, inform the user:

```typescript
if (!refinedContent) {
  // For pass sections with no suggestion, accept is a no-op — just mark addressed
  if (review?.status === 'pass') {
    setIsAddressed(true);
    setIsOpen(false);
    onMarkAddressed?.(sectionKey);
    return;
  }
  toast.error("No AI suggestion available to accept. Try re-reviewing the section first.");
  return;
}
```

## Files Changed
- `src/components/cogniblend/shared/AIReviewInline.tsx` — 2 targeted edits

## Impact
- Accept now works consistently because the suggestion is no longer lost to the race condition
- Pass sections gracefully mark as addressed instead of silently failing
- Non-pass sections with missing suggestions give clear user feedback

