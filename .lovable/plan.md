

# Fix: "Generate Suggestions" Spinner During Re-analyse

## Problem
When "Re-analyse" is clicked, the "Generate Suggestions" button remains visible and shows a spinner because `pass1DoneSession`, `generateDoneSession`, `contextLibraryReviewed`, and old `aiReviews` are never reset. The shared `aiReviewLoading` flag makes Generate appear to be running when only Pass 1 is active.

## Changes (3 files, ~15 lines)

### 1. `src/hooks/cogniblend/useCurationAIActions.ts`
- Add `setContextLibraryReviewed?: (v: boolean) => void` to the options interface
- Destructure it in the function signature
- In `handleAnalyse`, before `setAiReviewLoading(true)` (line 162), add 4 resets:
  - `setPass1DoneSession(false)` — hide Generate button
  - `setGenerateDoneSession(false)` — clear completion banner
  - `setAiReviews([])` — clear stale review badges
  - `setContextLibraryReviewed?.(false)` + clear sessionStorage — reset context library gate
- Update the `useCallback` dependency array to include `setGenerateDoneSession`, `setAiReviews`, `setContextLibraryReviewed`

### 2. `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- Pass `setContextLibraryReviewed` to `useCurationAIActions()` call (line 159)

### 3. `src/components/cogniblend/curation/CurationRightRail.tsx`
- Line 139: Remove spinner from Generate button — replace `{aiReviewLoading ? <Loader2 .../> : <Sparkles .../>}` with just `<Sparkles .../>`
- The button is already disabled via `aiReviewLoading`, which is sufficient UX feedback

## Result
- During Re-analyse: Generate button hidden, old badges cleared, context library gate locked
- After analysis completes: Generate button appears (no spinner), user reviews context library, then clicks Generate

