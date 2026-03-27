
## What I found (actual root causes)

1. **Complexity re-review uses a custom path that does not reset local inline state**
   - In `AIReviewInline.tsx`, the default re-review path resets `isAddressed`, `editedComments`, and selected comments.
   - But for complexity (`onReReview` custom handler), it returns early after `await onReReview(sectionKey)` and **skips that reset**, so old comments/suggestion can remain visible.

2. **Review-change detection is too weak, so stale suggestion state is not cleared**
   - Current signature uses: `reviewed_at | status | comments.length`.
   - Complexity re-review objects in `CurationReviewPage.tsx` are saved **without `reviewed_at`**, status is usually `warning`, and comment count is often constant (same parameter count), so signature may not change even when comment text changed.

3. **Complexity review status derivation is wrong**
   - In both complexity review creation blocks, status is `ws > 0 ? 'warning' : 'pass'` (effectively always warning).
   - This causes inconsistent semantics and stale “warning” behavior.

4. **Score contract is still duplicated in two files**
   - `CurationReviewPage.tsx` and `ComplexityAssessmentModule.tsx` each maintain scoring/level logic.
   - Even if currently similar, this duplication is brittle and can drift again.

---

## Implementation plan (fool-proof fix)

### 1) Fix custom complexity re-review state reset in inline panel
**File:** `src/components/cogniblend/shared/AIReviewInline.tsx`
- In `handleReReview`, after successful `onReReview(sectionKey)`:
  - force reset local state just like normal path:
    - `setIsAddressed(false)`
    - `setEditedComments([])`
    - `setSelectedComments(new Set())`
    - `setRefinedContent(null)`
    - clear edited suggestion/item states
- This ensures old comments/suggestion cannot remain after complexity re-review.

### 2) Strengthen review-change signature logic
**File:** `src/components/cogniblend/shared/AIReviewInline.tsx`
- Replace signature from `reviewed_at|status|comments.length` to include **actual content**, e.g. serialized comments hash/string.
- This guarantees stale suggestion state is cleared whenever comment content changes (not just count).

### 3) Always stamp complexity re-reviews with fresh metadata
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- In both complexity review creation paths (initial complexity promise + `handleComplexityReReview`):
  - include `reviewed_at: new Date().toISOString()`
  - normalize review before persist
- This guarantees deterministic refresh behavior in the inline panel.

### 4) Correct complexity status derivation
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Replace `status: ws > 0 ? 'warning' : 'pass'` with:
  - `status: comments.length > 0 ? 'warning' : 'pass'`
- This aligns status with actual review content.

### 5) Remove scoring drift risk with one shared scorer
**Files:**  
- `src/lib/cogniblend/complexityScoring.ts` (new utility)  
- `src/pages/cogniblend/CurationReviewPage.tsx`  
- `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`
- Centralize:
  - weighted score calculation
  - level/label derivation
  - rating normalization (clamp/round)
- Use this single utility in both the AI suggestion markdown generator and module display.

### 6) Re-review button hardening
**File:** `src/components/cogniblend/shared/AIReviewInline.tsx`
- Keep “Review/Re-review” action consistently rendered in all non-locked states (pending, warning, pass, addressed).
- Add a tiny guard to prevent any branch from hiding it after state transitions.

---

## Verification plan (must pass)

1. **Complexity re-review freshness**
   - Run re-review twice; confirm comments and suggested text change immediately when AI output changes.
   - Confirm no old comments persist after re-review.

2. **Score consistency**
   - In AI Review tab, ensure:
     - score badge,
     - level badge,
     - suggested markdown score/level
     all match for same parameter values.

3. **Manual → AI tab switch**
   - Start with manual edits, switch to AI review, run re-review.
   - Confirm no `0` score unless quick-select mode is active by design.

4. **Re-review action availability**
   - Verify button visibility for pending, warning, pass, addressed states in non-locked sections.

5. **Regression checks**
   - Reward structure persistence remains intact.
   - No break in standard AI review flow for non-complexity sections.
