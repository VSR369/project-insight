

## Fix: Sequential Two-Step AI Workflow (Analyse → Context Library → Generate)

### Current Problem
The UI shows either "Analyse Challenge" OR "Generate Suggestions" based on `pass1Done`, but:
1. After analysis completes, it does NOT auto-open the Context Library
2. The "Generate Suggestions" button appears immediately after pass1 — there's no gate requiring the curator to review context first

### Correct Sequence (per spec)
```text
[Analyse Challenge] → Pass 1 runs → auto-opens Context Library drawer
        ↓
Curator reviews/accepts discovered sources, closes drawer
        ↓
[Generate Suggestions] button now appears (replacing Analyse)
        ↓
Curator clicks → Pass 2 runs with enriched context
```

### Changes (3 files)

**1. `useCurationAIActions.ts` (line 146)**
After `executeWavesPass1()` succeeds, call `setContextLibraryOpen(true)` to auto-open the Context Library drawer so the curator can review discovered sources before generating suggestions.

**2. `CurationRightRail.tsx` (lines 103-121)**
Replace the single-button toggle with a two-button sequential layout:
- **"Analyse Challenge"** — always visible; disabled after pass1Done (can re-run, shown as secondary)
- **"Generate Suggestions"** — visible only when `pass1Done` is true; primary action button

This way both buttons can coexist, with "Generate Suggestions" appearing only after analysis is complete.

**3. `CurationReviewPage.tsx` (line 252)**
No change needed — the `pass1Done` derivation (`aiReviews.length > 0 && aiReviews.every(r => !r.suggestion)`) is correct and will naturally become true after Pass 1 (which strips suggestions).

### What stays the same
- All hooks, edge functions, executors, Context Library components unchanged
- Legacy "Review Sections by AI" fallback button preserved
- `handleSingleSectionReview` untouched

