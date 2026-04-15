
<final-text>
## Permanent Fix Plan: Waves appear to stop after Wave 1

### What I found

This is not just one bug. It is a combination of:
1. **A real workflow bug**
2. **A diagnostics/reporting bug**
3. **A state persistence bug**

So the system can both:
- actually stop the broader Analyse/Generate flow early, and
- falsely look like later waves never ran even when section-level state exists.

## 5 Why analysis

### Problem
Only one wave appears to run, later waves look abandoned, and credits feel wasted.

### Why 1
Because the UI flow treats **“Pass 1 executor finished”** as **“Analyse flow succeeded”** and **“Pass 2 executor finished”** as **“Generate flow succeeded”**, even though the wider flow has more stages after the wave loop.

### Why 2
Because `runAnalyseFlow()` always continues to discovery and then sets `pass1DoneSession = true` after `await executeWavesPass1()`, but `executeWavesPass1()` currently **swallows failures** inside `useWaveExecutor` (sets `overallStatus = 'error'`, toast, then returns). The outer flow cannot tell whether waves completed or failed.

### Why 3
Because `useWaveExecutor.executeWaves()` catches errors internally and does **not rethrow** or return a success/failure result. So callers cannot distinguish:
- completed all 6 waves
- stopped after wave 1
- cancelled
- failed mid-run

### Why 4
Because the diagnostics screen is reading **store snapshots only** (`reviewStatus`, `aiAction`, `aiSuggestion`) rather than authoritative per-wave execution records. That means later waves can show “Not Run” simply because:
- the page was remounted,
- the store was reset by `clearAllSuggestions()`,
- Pass 1/Pass 2 state overwrote each other,
- or the active executor changed.

### Why 5
Because wave execution state is split across too many weakly-coupled places:
- `useWaveExecutor` local React state
- Zustand section store
- `ai_section_reviews` JSON
- `curation_progress`
- localStorage wave summary
- session flags (`pass1DoneSession`, `contextLibraryReviewed`)
  
There is **no single authoritative execution record** for “which wave started/completed/failed for which pass”.

## Root causes to fix permanently

### Root cause A — Executor does not return outcome
`useWaveExecutor` should not be fire-and-forget. It must return a typed result like:
- `completed`
- `cancelled`
- `error`
with wave/section details.

### Root cause B — Outer flows mark success even after partial failure
`runAnalyseFlow()` and `handleGenerateSuggestions()` currently assume success if the executor promise resolves. That is unsafe because the executor resolves even on internal failure.

### Root cause C — Diagnostics is not authoritative
`DiagnosticsReviewPanel` / `DiagnosticsSuggestionsPanel` infer status from section store entries, not from real pass/wave execution history. That is why only one wave can appear to have run.

### Root cause D — Pass state is being overwritten/reset
`clearAllSuggestions()` wipes comments, suggestions, statuses, and `aiAction` for every section before Analyse. This is correct for a clean Pass 1 start, but combined with diagnostics relying on the store, it destroys traceability of previous pass outcomes.

### Root cause E — Progress metadata is incomplete/inaccurate
`useCurationWaveSetup` updates `curation_progress`, but:
- `sections_total` is hardcoded to **27** while wave config has **33 section slots**
- `onAllComplete` sets `sections_reviewed: 27`
- there is no persisted per-pass/per-wave failure record
So creator/admin progress can be misleading even when execution works.

## Implementation plan

### 1. Make wave execution return a typed outcome
Update `src/hooks/useWaveExecutor.ts` so both `executeWaves` and `reReviewStale` return structured results:
- overall outcome
- completed waves
- failed wave number
- failed sections
- cancellation flag

Do not swallow errors silently. Convert them into a returned outcome and only rethrow when truly unexpected.

### 2. Stop Analyse / Generate from pretending success
Update `src/hooks/cogniblend/useCurationAIActions.ts`:
- `runAnalyseFlow()` must only set `pass1DoneSession = true` and open Context Library if Pass 1 outcome is `completed`
- `handleGenerateSuggestions()` must only set `generateDoneSession = true` and show success toast if Pass 2 outcome is `completed`
- if cancelled or errored, show explicit failure messaging with last completed wave

### 3. Create authoritative persisted execution state
Add a small service/hook for wave run state, e.g.:
- current pass (`analyse` / `generate`)
- current wave
- per-wave status
- per-wave section results
- startedAt / completedAt / failedAt
- error message

Persist it by challenge + pass in localStorage, and wire the executor to update it on:
- start
- wave start
- wave complete
- error
- cancel
- all complete

This becomes the single source for diagnostics and recovery UI.

### 4. Make Diagnostics read execution history, not inferred section state
Refactor:
- `DiagnosticsReviewPanel`
- `DiagnosticsSuggestionsPanel`
- `DiagnosticsSheet`

So they display persisted pass/wave execution records first, and only use section store data as supporting detail. This will fix the “only one wave ran” false signal.

### 5. Correct progress math and status updates
Update `src/hooks/cogniblend/useCurationWaveSetup.ts`:
- derive total sections from `EXECUTION_WAVES`
- stop hardcoding `27`
- write accurate `sections_reviewed`
- keep `current_wave` and status aligned with real executor outcome
- on error/cancel, persist a non-success status instead of flipping to curator editing

### 6. Keep UI stable across refresh/navigation
Use the persisted execution record to restore:
- active pass type
- current/last wave
- completed vs failed waves
- partial results banner
- “Generate Suggestions” eligibility only after truly completed Pass 1

### 7. Improve credit protection
Before starting Generate:
- verify Pass 1 fully completed
- verify context review gate still valid
- block duplicate run if same pass already active or just failed without user acknowledgement
- show “resume / restart” choice if an incomplete run exists

## Files to change

| File | Change |
|---|---|
| `src/hooks/useWaveExecutor.ts` | Return structured execution outcome; persist authoritative per-wave state; stop hiding failures |
| `src/hooks/cogniblend/useCurationAIActions.ts` | Gate success flags/toasts on real executor completion; handle error/cancel outcomes correctly |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Fix progress math, remove hardcoded 27, persist accurate status/current wave |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | Load authoritative execution history |
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | Render real pass-1 wave history |
| `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | Render real pass-2 wave history |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Show last known failed/cancelled wave clearly in right rail if run incomplete |
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | Support restored/error/cancelled persisted state with clearer messaging |

## Expected result after fix

- All waves either run fully, or the UI clearly shows exactly where they stopped.
- Pass 1 cannot falsely unlock Pass 2 after a partial/failed run.
- Diagnostics will no longer claim later waves “did not run” when that is only a display artifact.
- Progress counts and wave numbers will be accurate.
- Users get a durable execution record, reducing wasted retries and credit loss.

## Technical note
The most important permanent fix is: **executor outcome must become explicit and authoritative**. Everything else should key off that, instead of inferring run state from transient section store fields.
</final-text>
