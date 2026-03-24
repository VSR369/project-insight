

# Plan: Enable "Refine with AI" for Empty Sections

## Problem

The "Refine with AI" button is disabled for Deliverables and other sections because the `currentContent` prop is `null` (the field has no data). The disable condition on line 269 of `AIReviewInline.tsx` is `disabled={isRefining || !currentContent}`.

This is counterproductive: the AI review says "Needs Revision — add deliverables" but the user cannot use the AI to generate them because the button is disabled precisely because there is nothing there yet.

## Fix

**File: `src/components/cogniblend/shared/AIReviewInline.tsx`**

1. **Remove the `!currentContent` disable condition** — change `disabled={isRefining || !currentContent}` to `disabled={isRefining}`.

2. **Handle empty content in the refine handler** — update `handleRefineWithAI` to send a fallback value (e.g., `"[empty — no content yet]"`) when `currentContent` is null/empty. This tells the AI model the section is blank and it should generate initial content based on the review comments.

3. **Update button label** — when `currentContent` is empty, show "Draft with AI" instead of "Refine with AI" to clarify the action.

No other files need changes. The edge function (`refine-challenge-section`) already handles both generation and refinement — it uses the curator instructions (review comments) to produce content regardless of whether `current_content` is empty or populated.

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Remove `!currentContent` disable guard; send fallback for empty sections; label "Draft with AI" vs "Refine with AI" |

