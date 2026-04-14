

# Fix: "Generate Suggestions" Appearing Active During Re-analyse

## Root Cause

Two UX bugs, both in the right rail UI — no backend issues.

**Bug 1 — Generate Suggestions button shows spinner during Analyse:**
`handleAnalyse` sets `aiReviewLoading = true`. The "Generate Suggestions" button is visible (because `pass1Done` is already `true` from a prior run) and uses the same `aiReviewLoading` flag for its spinner. Result: it looks like Generate Suggestions is executing when only Analyse is running.

**Bug 2 — WaveProgressPanel shows "N Generated" during Pass 1:**
`determineSectionAction()` returns `'generate'` for empty sections regardless of which pass is running. The WaveProgressPanel displays a blue "Generated" badge for these. During Pass 1, this confuses the user into thinking suggestions are being produced.

## Fix (2 files)

### File 1: `src/hooks/cogniblend/useCurationAIActions.ts`
- At the start of `handleAnalyse`, call `setPass1DoneSession(false)` immediately — this hides the Generate Suggestions button and Context Library prompt while re-analysis runs
- After Pass 1 completes, `setPass1DoneSession(true)` re-shows them (already exists at line 210)

### File 2: `src/components/cogniblend/curation/WaveProgressPanel.tsx`
- Change the "Generated" badge label to "Drafted" to avoid confusion with the "Generate Suggestions" workflow step
- Alternatively, when the parent is running Pass 1, show "Analysed" instead — but since WaveProgressPanel doesn't know which pass is active, the simplest fix is to relabel to a neutral term like "Drafted" or "Content created"

### Result
- During Re-analyse: Generate Suggestions button is hidden, only the Analyse button shows a spinner
- Wave progress shows "Reviewed" and "Drafted" (not "Generated")
- After analysis completes: pass1Done flips back to true, showing the Context Library prompt and Generate Suggestions button in correct sequence

