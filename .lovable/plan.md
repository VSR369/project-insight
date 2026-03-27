

# Fix: Complexity Score Mismatch Between AI Suggestion and Parameters

## Root Cause

There are **two different averaging formulas** producing conflicting results:

1. **`buildComplexitySuggestionMd`** (line 775) and both `complexityPromise` / `handleComplexityReReview` blocks use a **simple average** — sum of all ratings divided by count, ignoring weights.

2. **`ComplexityAssessmentModule`** (line 170) and the **accept handler** (line 1578) correctly use a **weighted average** — each rating multiplied by its parameter weight, divided by total weight.

This means the "AI Suggested Observation" panel says "L3 — Medium (Score: 5.80)" while the sliders (which use weights) calculate "L4 — High (Score: 7.30)" from the same ratings. The AI panel is wrong.

## Fix Plan

### 1. Pass `complexityParams` into `buildComplexitySuggestionMd`

Change the function signature to accept `complexityParams` so it can compute the weighted average instead of the simple average:

```typescript
function buildComplexitySuggestionMd(
  ratings: Record<string, { rating: number; justification: string }>,
  complexityParams: ComplexityParam[]
): string {
  // Use weighted average (matching ComplexityAssessmentModule)
  const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
  const ws = totalWeight > 0
    ? complexityParams.reduce((s, p) => {
        const r = ratings[p.param_key];
        return s + (r ? r.rating : 5) * p.weight;
      }, 0) / totalWeight
    : /* fallback simple avg */;
  // ... derive level from ws
}
```

### 2. Fix `complexityPromise` block (line 1447) — same simple average bug

Replace the simple `avgRating` calculation used for the `complexityReview.status` determination with the weighted formula.

### 3. Fix `handleComplexityReReview` (line 1778) — same bug

Same simple average → weighted average fix.

### 4. Update all call sites

Pass `complexityParams` to `buildComplexitySuggestionMd` at both call sites (lines 1441, 1772).

### 5. Auto-navigate to AI Review tab after re-review

After `handleComplexityReReview` completes and sets `aiSuggestedComplexity`, the `ComplexityAssessmentModule` already auto-switches to `ai_review` tab via `useEffect` on line 162: `setActiveTab("ai_review")`. This should already work — but we need to verify the `useEffect` dependency fires correctly when `aiSuggestedRatings` reference changes. If the ratings object is the same reference, it won't trigger. We'll ensure a new object reference is always created.

### Files to Change

- **`src/pages/cogniblend/CurationReviewPage.tsx`**:
  - `buildComplexitySuggestionMd` — accept `complexityParams`, use weighted average
  - `complexityPromise` block — weighted average for status
  - `handleComplexityReReview` — weighted average for status
  - Both call sites — pass `complexityParams`

### No other files need changes

The `ComplexityAssessmentModule` already uses the correct weighted formula. The accept handler (line 1578) also already uses weighted. Only the suggestion/review-building code in `CurationReviewPage` is wrong.

