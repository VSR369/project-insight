

# Merge Complexity into Global Review Flow — Implementation Plan

## Summary

Delete the dedicated `assess-complexity` edge function. When `review-challenge-sections` receives `section_key === 'complexity'`, it will fetch `master_complexity_params`, build a specialized prompt using full challenge context, and return structured per-parameter ratings alongside guideline-style comments. The frontend removes all dedicated complexity handling and renders a parameter table in the AI review panel.

## Changes

### 1. Edge Function: `review-challenge-sections/index.ts`

**Add `callComplexityAI` function** (insert after `callAIBatch`, ~line 294):
- Fetches `master_complexity_params` (param_key, name, weight, description) from DB
- Builds a specialized system prompt with parameter-specific guidance (reuse the proven SYSTEM_PROMPT from assess-complexity)
- Sends full challenge data as user prompt context
- Uses tool calling with schema: `{ ratings: { [param_key]: { rating, justification, evidence_sections } }, guideline_comments: string[] }`
- Returns a standard section review object with `section_key: 'complexity'`, plus `suggested_complexity` containing the structured ratings

**Modify batch loop** (~lines 506-581):
- Before batching, check if `sectionsToReview` contains `complexity`
- If yes, remove it from batch processing and call `callComplexityAI` separately
- Merge complexity result into `allNewSections` with the extra `suggested_complexity` field

### 2. Delete `supabase/functions/assess-complexity/index.ts`

Entire function removed — no longer needed.

### 3. `src/lib/sectionRoutes.ts`

Remove `complexity: 'assess-complexity'` from `SECTION_REVIEW_ROUTES` (line 14). Complexity now routes to `review-challenge-sections` by default.

### 4. `src/lib/cogniblend/complexityScoring.ts`

Remove `buildComplexitySuggestionMd` function (lines 88-104). No longer needed — UI renders structured table directly.

### 5. `src/pages/cogniblend/CurationReviewPage.tsx`

- **Remove state**: `aiSuggestedComplexity`, `complexitySuggestionMd`
- **Remove `handleComplexityReReview`** callback (~lines 1764-1801)
- **Simplify global AI review** (~lines 1433-1528): Remove dedicated complexity promise. Complexity is now just another section in the standard `review-challenge-sections` batch — no special routing needed.
- **Extract `suggested_complexity` from review data**: When processing AI review results, check if a complexity section review has a `suggested_complexity` field and pass it to `ComplexityAssessmentModule` as `aiSuggestedRatings`.
- **Remove `onReReview` and `initialRefinedContent`** props for complexity section in the render block (~line 2888-2889). Standard re-review path handles it.

### 6. `src/components/cogniblend/shared/AIReviewInline.tsx`

- **Add optional `complexityRatings` prop**: `complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>`
- **Pass to `AIReviewResultPanel`** as new prop
- **Skip auto-refine** when `sectionKey === 'complexity'` (complexity gets its structured table, not a text refinement)

### 7. `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

**Add complexity parameter table renderer**:
- New prop: `complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>`
- When `complexityRatings` is present, render a table instead of the standard suggested version area:
  - Columns: **Parameter**, **Rating** (colored badge), **Justification**, **Evidence**
  - Uses `Table` components from `src/components/ui/table.tsx`
  - Weighted score and level shown as summary below table
- Accept button applies all ratings to the complexity module

### 8. Prompt Template: `review-challenge-sections/promptTemplate.ts`

Add complexity format to `SECTION_FORMAT_MAP` and `FORMAT_INSTRUCTIONS`:
```
complexity: 'complexity_assessment'
```
With instruction: "Output: Use the assess_complexity tool to return per-parameter ratings with justifications."

## Data Flow (After)

```text
Global AI Review button
  → review-challenge-sections (all sections including complexity)
    → standard batches for 26 non-complexity sections
    → callComplexityAI for complexity (parallel)
  → response includes { sections: [...], suggested_complexity: {...} }
  → CurationReviewPage extracts suggested_complexity from review
  → AIReviewInline receives complexityRatings prop
  → AIReviewResultPanel renders parameter table
  → Accept → applies ratings to ComplexityAssessmentModule
```

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/review-challenge-sections/index.ts` | Add `callComplexityAI`, modify batch loop |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Add complexity format entry |
| `supabase/functions/assess-complexity/index.ts` | **Delete** |
| `src/lib/sectionRoutes.ts` | Remove complexity route |
| `src/lib/cogniblend/complexityScoring.ts` | Remove `buildComplexitySuggestionMd` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove dedicated complexity logic |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Add `complexityRatings` prop, skip auto-refine |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add parameter table renderer |

