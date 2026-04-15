

# Fix: JSZip Crash + Stage-Based Progress Panel

## Problem Summary
1. **`extract-attachment-text` is 100% broken** — named import `{ JSZip }` causes BootFailure on every call. This breaks ALL extraction, meaning discovery sources never get real content, digests are empty, and suggestions are generic.
2. **No progress feedback** during Analyse or Generate — the unified flow only touches wave 7 (discovery) while waves 1-6 sit at "pending" forever. The `WaveProgressPanel` shows nothing useful.
3. **Generate Suggestions has zero progress** — only a button spinner.

## Changes

### 1. Fix JSZip import (CRITICAL — 1 line)
**File:** `supabase/functions/extract-attachment-text/index.ts` line 14
- Change `import { JSZip }` to `import JSZip` (default export)
- Redeploy immediately

### 2. New component: `AnalyseProgressPanel.tsx` (~80 lines)
**File:** `src/components/cogniblend/curation/AnalyseProgressPanel.tsx`
- Stage-based progress (not wave-based) with types: `AnalyseProgressState`, `ProgressStage`
- Renders vertical stepper with status icons (CheckCircle2/Loader2/Circle/XCircle)
- Progress bar showing completed/total stages
- Completion summary badge
- Exported `IDLE_PROGRESS` constant for initial state

### 3. Wire progress into `useCurationAIActions.ts`
**File:** `src/hooks/cogniblend/useCurationAIActions.ts`
- Add `setAnalyseProgress` to options interface (replaces reliance on `pass1SetWaveProgress` for unified flow display)
- Keep `pass1SetWaveProgress` — it's still called for legacy wave tracking
- In `runAnalyseFlow`: set 3 stages (Analysing → Discovering → Extracting), update each as it completes
- In `handleGenerateSuggestions`: set 3 stages (Digest → Generating → Validating), update each as it completes

### 4. Add state in `useCurationPageOrchestrator.ts`
**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- Add `const [analyseProgress, setAnalyseProgress] = useState(IDLE_PROGRESS)`
- Pass `setAnalyseProgress` to `useCurationAIActions`
- Expose `analyseProgress` in return object

### 5. Update `CurationRightRail.tsx`
**File:** `src/components/cogniblend/curation/CurationRightRail.tsx`
- Add `analyseProgress` to props interface
- Import and render `AnalyseProgressPanel` (replaces `WaveProgressPanel` for unified flow)
- Keep `WaveProgressPanel` only for legacy single-section re-review (when `waveProgress.overallStatus !== 'idle'` AND `analyseProgress.phase === 'idle'`)

### 6. Pass prop in `CurationReviewPage.tsx`
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Add `analyseProgress={o.analyseProgress}` to CurationRightRail

## Deploy
- `extract-attachment-text` (critical fix)

## Result
- Extraction works for PDFs, DOCX, URLs, images
- User sees real-time stage progress during both Analyse and Generate flows
- Digests built from actual extracted content instead of search snippets
- Suggestions grounded in real research

