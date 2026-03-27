

# Fix: Restore "Re-review this section" Button for All Section States

## Problem

The "Re-review this section" button currently only appears when a section is either **addressed** or **pass with no comments**. For sections in the most common post-review state — **warning or needs_revision with active comments** — there is no way to trigger a re-review. This effectively removed re-review from all sections that have AI feedback.

## Root Cause

In `AIReviewInline.tsx`, the render logic has three branches:
1. `isPending` → "Run Review with AI" text (no button)
2. `isAddressed` → ✅ Has re-review button
3. `isPassWithNoComments` → ✅ Has re-review button
4. **else (has comments)** → Renders `AIReviewResultPanel` only — ❌ No re-review button

## Fix

Add a "Re-review this section" button **after** the `AIReviewResultPanel` in the comments branch (line ~682 area). This ensures curators can always re-trigger AI review regardless of whether the section has active comments, a suggestion, or is in warning/needs_revision state.

### File: `src/components/cogniblend/shared/AIReviewInline.tsx`

After the `AIReviewResultPanel` closing tag (around line 682), inside the `!isLockedSection` block, add:

```tsx
{/* Re-review button — always available after initial review */}
<Button
  size="sm"
  variant="outline"
  className="w-full text-xs h-7 mt-2"
  onClick={handleReReview}
  disabled={isReReviewing}
>
  {isReReviewing
    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
    : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
  {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
</Button>
```

This places the re-review button at the bottom of the panel, below Accept/Keep Original, consistent with the addressed-state placement.

### No other files need changes

The `handleReReview` function already exists and works correctly. The `onReReview` prop for complexity's custom handler is already wired. This is purely a rendering gap — the button was accidentally excluded from one branch.

