

## Plan: Streamline AI Review — Single Batch Trigger, Auto-Display Under Each Section

### Current State
The backend already reviews **all 14 sections in a single AI call**. The "Review Sections by AI" button in the right rail triggers this batch call, and results are stored in `aiReviews` state and passed to each section's `CurationAIReviewInline` component. However, each section also shows a redundant "Request AI Review" button that just re-triggers the same full batch call — adding unnecessary clicks and confusion.

### What Changes

#### File: `src/components/cogniblend/curation/CurationAIReviewPanel.tsx`
- Remove the "Request AI Review" fallback button that shows when `review` is undefined
- When no review exists yet, simply render nothing (the user triggers review from the top-level button)

#### File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Remove the `handleReviewSection` callback and `onReviewSection` prop from `CurationAIReviewInline`
- After batch review completes, **auto-expand** the `CurationAIReviewInline` collapsible for sections with `warning` or `needs_revision` status so results are immediately visible without extra clicks
- Keep the "Review Sections by AI" button in the right rail as the single trigger point
- Keep the AI Review Summary card for navigation

### Result
One click on "Review Sections by AI" → all section reviews appear inline and auto-expand for sections needing attention. No per-section "Request AI Review" buttons. The curator can then edit comments and use "Refine with AI" on any section.

### Technical Details
- `CurationAIReviewInline`: remove the `onReviewSection` prop and the conditional render block for the trigger button
- Add `defaultOpen` or `autoOpen` prop to `CurationAIReviewInline` — set to `true` when status is `warning` or `needs_revision`
- Pass this from `CurationReviewPage` based on the review status

