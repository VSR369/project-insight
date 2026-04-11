

## Implementation Plan: Two-Step AI Review Workflow (Context Intelligence Integration)

This spec introduces a split AI review workflow: **Step 1 "Analyse Challenge"** (Pass 1 only + auto-discovery) and **Step 2 "Generate Suggestions"** (Pass 2 with enriched context). It also adds a context intake trigger on challenge submission, improves industry segment resolution, and always regenerates the digest on source acceptance/upload.

### Impact Assessment

| Area | Risk | Notes |
|------|------|-------|
| `useWaveReviewSection` | Low | Add `pass1Only` param, pass through to edge function |
| `useWaveExecutor` | Low | Add `pass1Only` option, `pass1Results` state |
| `useCurationWaveSetup` | Medium | Split into two executor instances (pass1 + full) |
| `useCurationAIActions` | Medium | Add `handleAnalyse`, `handleGenerateSuggestions`, shared `runPreFlight` |
| `CurationRightRail` | Low | Replace single button with conditional Analyse/Generate UI |
| `CurationReviewPage` | Low | Wire new props to right rail |
| `useCurationPageOrchestrator` | Low | Pass two new props to AI actions |
| `useContextLibrary` | Low | Change `onSuccess` to always regenerate digest + add 2 new exports |
| `useChallengeSubmit` | Low | Add fire-and-forget `trigger-context-intake` call |
| `curationHelpers` | Low | Add `industry_segment_id` as Rule 1 in `resolveIndustrySegmentId` |
| `review-challenge-sections` edge function | Low | Add `pass1_only` param + append `industry_segment_id` to field list + industry resolution fix |
| `trigger-context-intake` edge function | New | Fire-and-forget intake pipeline |
| `curation-intelligence` edge function | New | 4-stage curation pipeline (doc says 515 lines, available in working dir) |
| DB migration | Low | Add `context_intake_status` column with CHECK constraint |

**Existing per-section inline review (`handleSingleSectionReview`) is NOT touched.**

### Execution Steps

**Part 1 — Database Migration**
- Add `context_intake_status TEXT` column to `challenges` with CHECK constraint and backfill existing phase-2 challenges

**Part 2 — New Edge Functions**
- Create `trigger-context-intake` — extracts creator files + reference URLs on submission
- Create `curation-intelligence` — 4-stage pipeline (Pass 1 → discover → synthesize → digest)

**Part 3 — Edge Function Modifications (`review-challenge-sections`)**
- 3A: Append `industry_segment_id` to curation challenge field list (line 300)
- 3B: Add `pass1_only` to request body destructuring (line 196)
- 3C: When `pass1_only=true`, strip `suggestion` from batch results before pushing to `allNewSections`
- 3D: Fix industry segment resolution to prefer `challenge.industry_segment_id` over org industries

**Part 4 — TypeScript Changes**

- **4A** `curationHelpers.ts` — Add `industry_segment_id` as Rule 1 in `resolveIndustrySegmentId`
- **4B** `useContextLibrary.ts` — Always regenerate digest on accept (remove conditional), add `useIntakeStatus` and `useCurationIntelligence` exports
- **4C** `useChallengeSubmit.ts` — Add `trigger-context-intake` call after phase-1 completion notification (before QUICK block, line 275)
- **4D** `useWaveReviewSection.ts` — Add `pass1Only` option, pass `pass1_only` in edge function body
- **4E** `useWaveExecutor.ts` — Add `pass1Only` option, `pass1Results` state, wire into `useWaveReviewSection`
- **4F** `useCurationWaveSetup.ts` — Split into `pass1Executor` + `fullExecutor`, return both `executeWaves` and `executeWavesFull`
- **4G** `useCurationAIActions.ts` — Add `executeWavesFull`, `setContextLibraryOpen` to interface; add `runPreFlight`, `handleAnalyse`, `handleGenerateSuggestions`; keep existing `handleAIReview` as legacy "re-analyse from scratch"
- **4H** `useCurationPageOrchestrator.ts` — Pass `executeWavesFull` and `setContextLibraryOpen` to AI actions
- **4I** `CurationReviewPage.tsx` — Derive `pass1Done`, pass `onAnalyse`, `onGenerateSuggestions`, `pass1Done` to `CurationRightRail`
- **4J** `CurationRightRail.tsx` — Add 3 new props, import `Sparkles`, replace single "Review Sections by AI" button with conditional Analyse/Generate UI

### What Is NOT Touched (per spec Part 5)
- Creator module, Solver module, Admin module
- `CurationActions.tsx`, `useCompletePhase.ts`
- `ContextLibraryDrawer.tsx`, `SourceList`, `SourceDetail`, `DigestPanel`
- Wave config (`waveConfig.ts`, `EXECUTION_WAVES`)

### Technical Notes
- The `curation-intelligence` edge function (515 lines) is referenced as "available in working directory" — since it's not provided in the spec text, I will create it based on the described 4-stage pipeline behavior (pass1 → discover → synthesize → digest)
- The `pass1Done` signal is derived client-side: `aiReviews.length > 0 && aiReviews.every(r => !r.suggestion)` — this toggles the button between "Analyse Challenge" and "Generate Suggestions"
- Two `useWaveExecutor` instances in `useCurationWaveSetup` means two independent `inFlightRef` trackers — the combined `isWaveRunning` is `pass1.isRunning || full.isRunning`

