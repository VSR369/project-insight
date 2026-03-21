

## Plan: Fix AI Review Persistence + EvaluationCard Score Visibility

### Problem 1: Addressed state lost on navigation
The `isAddressed` flag in `CurationAIReviewInline` is **local React state** (`useState(false)`). When the user navigates away and returns, the component remounts, `isAddressed` resets to `false`, and the section reverts to showing "needs attention" + "Refine with AI" — even though the content was already refined and saved.

### Problem 2: EvaluationCard score/max values hidden
The screenshot shows criteria names with progress bars but `score/max` values appear as `/` (empty). The AI is returning criteria without `score` and `max` fields, or with `undefined` values. The component doesn't guard against missing values, producing `undefined/undefined` and NaN-width bars that render full-width red.

---

### Fix 1: Persist "addressed" status in `ai_section_reviews` JSONB

**Approach**: Add an `addressed` boolean to the `SectionReview` type. When a refinement is accepted, update the review in state AND persist it to the database. On load, initialize `isAddressed` from the persisted review data.

**File: `src/components/cogniblend/curation/CurationAIReviewPanel.tsx`**
- Add `addressed?: boolean` to the `SectionReview` interface
- Add a new prop: `onMarkAddressed?: (sectionKey: string) => void`
- Initialize `isAddressed` from `review?.addressed ?? false` instead of `false`
- In `handleAccept`, call `onMarkAddressed` to propagate the state change upward

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**
- Add `handleMarkAddressed` callback that:
  1. Updates `aiReviews` state: sets `addressed: true` on the matching review
  2. Persists the updated `ai_section_reviews` array to the database via `saveSectionMutation`
- Pass `onMarkAddressed={handleMarkAddressed}` to each `CurationAIReviewInline`
- When loading persisted reviews (line ~793), the `addressed` field is already in the JSONB, so sections that were previously addressed will load correctly

### Fix 2: Guard EvaluationCard against missing score values

**File: `src/components/ui/AiStructuredCards.tsx`**
- In the criteria breakdown loop, guard against missing/undefined `score` and `max`:
  - Default `c.max` to `100` if falsy, default `c.score` to `0` if falsy
  - Only show `score/max` text when both are valid numbers
  - Clamp `cpct` to 0–100 range to prevent overflow bars
- In the overall score section, add similar guards for `score` vs `maxScore`

---

### Files changed
1. `src/components/cogniblend/curation/CurationAIReviewPanel.tsx` — persist addressed state via new prop + derive initial state from review data
2. `src/pages/cogniblend/CurationReviewPage.tsx` — add `handleMarkAddressed` that writes to DB
3. `src/components/ui/AiStructuredCards.tsx` — guard against missing score/max values in EvaluationCard

