

# Complexity Assessment — 4 Bugs Fix Plan

## Summary

The Accept button in the AI review panel computes its own score (wrong weights, wrong params) instead of delegating to the module. This causes score mismatches between what the module displays and what gets saved. Additionally, the Manual tab lacks an AI score reference.

## Changes

### File 1: `ComplexityAssessmentModule.tsx`

**A. Convert to `forwardRef` + `useImperativeHandle`**
- Wrap the component with `forwardRef` to expose a `saveAiDraft()` method
- `saveAiDraft()` computes the weighted score using `effectiveParams` (correct weights) and `aiDraft`, then calls `onSave(aiDraft, score, level, "AI_AUTO", resolvedParams)`

**B. Expand `onSave` signature to include resolved params**
- Add optional 5th param: `resolvedParams?: { param_key: string; name: string; value: number; weight: number }[]`
- In `handleSave`, build `paramsToSave` from `effectiveParams` and pass it to `onSave`

**C. Compute AI score independently for reference**
- Add `aiScore` / `aiLevel` memos computed from `aiDraft` + `effectiveParams`
- Pass to `ManualParamsTab` as optional `aiScoreRef` / `aiLevelRef` props

**D. Add AI reference badge in `ManualParamsTab`**
- Before the "Weighted Score" display, show a small Bot icon + "AI recommended: X.XX (LN)" when available

### File 2: `CurationReviewPage.tsx`

**E. Add `complexityModuleRef`**
- `const complexityModuleRef = useRef<{ saveAiDraft: () => void }>(null);`
- Pass `ref={complexityModuleRef}` to `ComplexityAssessmentModule` in the JSX (line ~3146)

**F. Replace complexity Accept handler**
- Replace the score computation block (lines 1908-1923) with:
  ```
  complexityModuleRef.current?.saveAiDraft();
  return;
  ```

**G. Update `handleSaveComplexity` to accept resolved params**
- Add optional `resolvedParams` parameter
- If provided, use it instead of iterating `complexityParams` (generic params)
- This ensures solution-type-specific dimension keys and weights are saved to DB

## Technical Details

- `forwardRef` + `useImperativeHandle` is the standard React pattern for parent-triggered child actions
- The module already has the correct scoring logic (`effectiveParams` with equal `1/n` weights from `complexity_dimensions`)
- The `resolvedParams` flow ensures DB gets solution-type dimension keys, not generic `master_complexity_params` keys
- Bug 3 (module ignores saved score) resolves naturally because the module's own `weightedScore` IS the correct score when Accept delegates to it

## Files Modified
1. `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` — forwardRef, saveAiDraft, resolved params, AI reference badge
2. `src/pages/cogniblend/CurationReviewPage.tsx` — ref, delegate Accept, updated handleSaveComplexity

