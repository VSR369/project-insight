
Issue location and why (root cause)

1) Reusable component path (yes, it is shared):
- `CurationReviewPage.tsx` renders `CurationAIReviewInline` for every section (problem statement, scope, deliverables, etc.).
- `CurationAIReviewInline` is a re-export of shared `AIReviewInline.tsx`.
- `AIReviewInline.tsx` renders the common `AIReviewResultPanel.tsx`.
So this confusion is coming from shared logic, not only one section.

2) Why you see “Pass” + warning comments + (sometimes) Accept suggestion:
- `review-challenge-sections` prompt currently allows/encourages comments even when status is `pass` (in `index.ts` + `promptTemplate.ts`).
- Deep review results are merged directly in `CurationReviewPage.tsx` without pass-with-comments normalization, so `status: pass` with comments can remain.
- In `AIReviewInline.tsx`, local `refinedContent` is not reset when a new review arrives. So an old suggestion can remain visible after status changes, creating “Pass but accept suggestion” confusion.

Implementation plan (fix for all sections)

1) Enforce consistent review contract in deep-review edge function
- File: `supabase/functions/review-challenge-sections/index.ts`
- Add post-processing normalization for every returned section:
  - If `status === "pass"` and `comments.length > 0` => downgrade to `warning`.
- Update fallback prompt text to explicitly require:
  - `pass` => `comments: []`
  - `warning/needs_revision` => actionable comments.
- Apply same wording alignment in `promptTemplate.ts`.

2) Add frontend normalization safety net (shared, all sections)
- Create utility: `src/lib/cogniblend/normalizeSectionReview.ts`
  - `normalizeSectionReview(review)`:
    - pass + comments => warning
    - ensure comments array exists
  - `normalizeSectionReviews(reviews)` for arrays.
- Use it in `CurationReviewPage.tsx` at all entry points:
  - when loading stored `ai_section_reviews`
  - after triage response
  - when merging deep review result
  - in `handleSingleSectionReview` (re-review path)

3) Reset stale suggested content when review object changes
- File: `src/components/cogniblend/shared/AIReviewInline.tsx`
- Add effect to clear stale local suggestion state on new review payload:
  - reset `refinedContent`, `editedSuggestedContent`, `selectedItems` when review signature changes (`reviewed_at/status/comments`).
- This removes old “Accept suggestion” UI when the latest review no longer has a fresh refinement.

4) Keep refinement trigger aligned to normalized status
- In `AIReviewInline.tsx`, keep auto-refine tied to actionable statuses after normalization (`warning` / `needs_revision` with comments).
- In `CurationReviewPage.tsx`, retain existing Phase-2 trigger for comments as defensive fallback.

Technical details (exact files)

- `supabase/functions/review-challenge-sections/index.ts`
- `supabase/functions/review-challenge-sections/promptTemplate.ts`
- `src/lib/cogniblend/normalizeSectionReview.ts` (new)
- `src/pages/cogniblend/CurationReviewPage.tsx`
- `src/components/cogniblend/shared/AIReviewInline.tsx`

Expected result after fix

- If there are actionable comments, section status will be `Warning`/`Needs Revision` (never `Pass`).
- `Pass` sections won’t show warning-like review blocks.
- “Accept AI suggested version” will only appear for current, valid refinement output (no stale carryover).
- Behavior is fixed once in shared flow and applies to all sections.
