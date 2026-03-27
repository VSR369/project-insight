

# Fix: Complexity Section — Re-review + Review State Synchronization

## Problems Identified

### 1. No Re-review action for Complexity
The `CurationAIReviewInline` component renders a "Re-review this section" button for all sections. However, for Complexity, the AI review is routed to the `assess-complexity` edge function (not `review-challenge-sections`). When the inline panel calls `handleReReview`, it invokes `review-challenge-sections` with `section_key: "complexity"` — which returns generic review comments, not complexity-specific parameter ratings. The re-review button IS visible (it's part of `AIReviewInline`), but the result overwrites the specialized complexity review with a generic one.

**Root cause**: `handleReReview` in `AIReviewInline.tsx` always calls `review-challenge-sections`. For complexity, it should call `assess-complexity` instead.

### 2. Comments badge remains static after acceptance
When the curator accepts AI complexity recommendations (via Accept in the `AIReviewResultPanel`), `handleAcceptRefinement` at line 1502 applies the ratings and saves them via `handleSaveComplexity`. Then `handleMarkAddressed` is called (from `AIReviewInline.handleAccept`), which sets `addressed: true` on the review. However, the comments array is never cleared — the old `7 comments` badge persists. Per user preference: after acceptance, comments should reset to 0.

**Root cause**: `handleMarkAddressed` only sets `addressed: true` but keeps the comments array intact. For the user's desired behavior, we need to also clear the comments array when marking as addressed.

## Fix Plan

### Fix 1: Complexity-aware re-review in `AIReviewInline`
**File**: `src/components/cogniblend/shared/AIReviewInline.tsx`

Add a new prop `onReReview?: (sectionKey: string) => Promise<void>` to allow the parent to provide a custom re-review handler. When this prop is provided, `handleReReview` delegates to it instead of calling `review-challenge-sections` directly.

**File**: `src/pages/cogniblend/CurationReviewPage.tsx`

Create a `handleComplexityReReview` callback that:
1. Calls `assess-complexity` edge function
2. Transforms the result into a `SectionReview` format
3. Updates `aiSuggestedComplexity` state
4. Calls `handleSingleSectionReview` to persist
5. Resets addressed state

Pass this as `onReReview` prop to `CurationAIReviewInline` when `section.key === "complexity"`.

### Fix 2: Clear comments on acceptance
**File**: `src/pages/cogniblend/CurationReviewPage.tsx`

Update `handleMarkAddressed` to clear the comments array (set to `[]`) along with setting `addressed: true`. This ensures the "Comments (7)" badge resets to 0 after acceptance.

```typescript
// Before:
const updated = prev.map((r) =>
  r.section_key === sectionKey ? { ...r, addressed: true } : r
);

// After:
const updated = prev.map((r) =>
  r.section_key === sectionKey ? { ...r, addressed: true, comments: [] } : r
);
```

This change affects ALL sections (not just complexity), which is the correct behavior — once a section's AI suggestions are accepted, the old comments are no longer relevant.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Add optional `onReReview` prop; delegate to it in `handleReReview` when provided |
| `src/pages/cogniblend/CurationReviewPage.tsx` | 1) Create `handleComplexityReReview` callback; 2) Pass `onReReview` for complexity section; 3) Clear comments in `handleMarkAddressed` |

## Behavior After Fix

- **Re-review**: Always visible for complexity (and all sections). For complexity, it calls `assess-complexity` and returns parameter-specific ratings/justifications. For all other sections, existing `review-challenge-sections` flow is unchanged.
- **Comments after accept**: Reset to 0 for all sections. The badge disappears. The section shows "Addressed" state with "Re-review this section" button.
- **Data integrity**: All state changes are persisted to `ai_section_reviews` in the DB via `saveSectionMutation`.

