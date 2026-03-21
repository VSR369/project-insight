

## Plan: Fix button visibility logic in CurationAIReviewPanel

### Current behavior (broken)
- After AI review, both "Refine with AI" AND "Re-review this section" show simultaneously
- "Re-review this section" appears even on first review (before any refinement)

### Correct behavior (per your instructions)
- **First review done, not yet refined**: Show only "Refine with AI"
- **After refinement accepted (addressed)**: Show only "Re-review this section"
- **Pending (never reviewed)**: Show neither

### Change

**File: `src/components/cogniblend/curation/CurationAIReviewPanel.tsx`**

Remove the "Re-review this section" button at lines 301–315 (inside the active review state). It already exists correctly in the `isAddressed` block (lines 224–237), which is the only place it should appear.

This is a single deletion — no other files affected.

