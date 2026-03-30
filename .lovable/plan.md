

# Complexity Assessment — Two Bugs Fix Plan

## Bug 1: Score mismatch between AI ratings and displayed score

**Root Cause:** The Accept handler in `CurationReviewPage.tsx` (lines 1843-1864) recalculates the score using `complexityParams` (from `master_complexity_params` table — generic params with custom weights like 0.15, 0.25, etc.), but the AI actually rated against `effectiveParams` inside the module (solution-type-specific dimensions with equal weights `1/n`). Different param keys + different weights = different score.

**Fix:** The Accept handler must use the same params the AI rated against. Pass `effectiveParams` or compute using the same dimension set. Specifically:
- In `handleAcceptRefinement` for `complexity` (line 1843), instead of iterating `complexityParams`, iterate the AI ratings directly and compute with equal weights (matching what `effectiveParams` does in the module).
- Better: have the module's `onSave` handle Accept too — the Accept handler should call `handleSaveComplexity` with the values the module already computed correctly.

**Concrete change in `CurationReviewPage.tsx` lines 1843-1866:**
Replace the manual score recalculation with the module's own logic. Use `aiSuggestedComplexity` keys as the param set with equal weights:

```typescript
if (sectionKey === "complexity") {
  if (aiSuggestedComplexity) {
    const ratingKeys = Object.keys(aiSuggestedComplexity);
    const paramValues: Record<string, number> = {};
    ratingKeys.forEach((key) => {
      const r = aiSuggestedComplexity[key];
      paramValues[key] = r ? Math.max(1, Math.min(10, Math.round(r.rating))) : 5;
    });
    // Use equal weights (matching effectiveParams in module)
    const count = ratingKeys.length || 1;
    const ws = ratingKeys.reduce((s, k) => s + (paramValues[k] ?? 5), 0) / count;
    const score = Math.round(ws * 100) / 100;
    const level = deriveComplexityLevel(score);
    handleSaveComplexity(paramValues, score, level);
  }
  return;
}
```

## Bug 2: Manual params overwrite AI review values on re-render

**Root Cause:** When manual params are saved, `queryClient.invalidateQueries` triggers a re-fetch. The `ComplexityAssessmentModule` component re-renders with new `currentParams` (now containing manual values). While `useState` preserves state across re-renders, `handleCancel` (line 306-313) and `handleConfirmSwitch` (line 252-264) both reset `aiDraft` from `currentParams` — which now has manual values. Additionally, if the component unmounts and remounts, `useState` initializer runs again from `currentParams`, losing the AI draft entirely.

**Fix:** Preserve `aiDraft` independently from DB-persisted `currentParams`:
1. Store AI draft values in a `useRef` that only gets set from `aiSuggestedRatings`, never from `currentParams`.
2. In `handleCancel`, only reset `manualDraft` from `currentParams` — reset `aiDraft` from the preserved AI ref (or keep current aiDraft unchanged).
3. In `handleConfirmSwitch`, same — don't reset `aiDraft` when switching to manual tab.

**Concrete changes in `ComplexityAssessmentModule.tsx`:**

- Add `const aiDraftRef = useRef<Record<string, number> | null>(null);`
- In the `aiSuggestedRatings` useEffect (line 164-189), also save to ref: `aiDraftRef.current = newAiDraft;`
- In `handleCancel` (line 306-313): reset `manualDraft` from `currentParams` but reset `aiDraft` from `aiDraftRef.current ?? buildDraftFromExisting(currentParams, effectiveParams)`
- In `handleConfirmSwitch` (line 252-264): only reset the draft for the tab being switched TO, not aiDraft when switching to manual

## Files Modified
1. `src/pages/cogniblend/CurationReviewPage.tsx` — Fix Accept handler score calculation (Bug 1)
2. `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` — Preserve AI draft independently (Bug 2)

