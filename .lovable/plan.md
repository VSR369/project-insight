

## Plan: Always-Visible AI Review Collapsible Under Each Section

### Problem
Currently, `CurationAIReviewPanel.tsx` returns `null` when no review exists (line 152-154). This means the "AI Review" collapsible is completely hidden until the batch review runs. The user wants:

1. **Always show** the "AI Review" collapsible trigger under every section
2. **Before review**: Show collapsed with a "No review yet" or neutral state — clicking it could prompt the user to run "Review Sections by AI"
3. **After review with warning/needs_revision**: Auto-expand to show comments
4. **After addressed**: Collapse but remain visible with "Addressed" badge — user can re-expand anytime

### Changes

#### File: `src/components/cogniblend/curation/CurationAIReviewPanel.tsx`
- Remove the `if (!review) return null` guard (line 152-154)
- When `review` is undefined, render the collapsible in a "pending" state: show the trigger bar with a "Pending" or "Not Reviewed" badge, and when expanded show a message like "Run 'Review Sections by AI' to generate review comments for this section"
- Keep all existing logic for when review exists (editable comments, refine button, accept/discard)

### Result
Every section always shows the "AI Review" collapsible bar. Before batch review: neutral collapsed state. After review: auto-expands for flagged sections. After addressed: collapses with "Addressed" badge but stays clickable.

