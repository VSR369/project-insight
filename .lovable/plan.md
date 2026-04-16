

## Investigation: Wave 1 stuck at 0% during Pass 1

### What the logs actually show

Looking at the edge-function logs from the current session (challenge `25ca71a0-…`):

| Time | Event |
|---|---|
| 19:28:45 | ✅ `organization_context` — Pass 1 complete (4 comments, 100% coverage) |
| 19:29:06 | ✅ `problem_statement` — Pass 1 complete (5 comments) |
| 19:29:42 | ✅ `scope` — Pass 1 complete (5 comments) |
| 19:30:09 | ✅ `expected_outcomes` — Pass 1 complete (5 comments) |
| 19:30:32 | ✅ `context_and_background` — Pass 1 complete (5 comments) |

The session replay confirms the SAME sections are appearing in the UI ("Organization Context", "Problem Statement", "Scope", "Expected Outcomes" added in sequence over ~2 minutes).

**So Pass 1 is NOT hung — it's actively running and completing sections every ~20–30 seconds.** Each section costs ~50K prompt tokens + 2K completion tokens, and the AI gateway is responding successfully.

### What's actually wrong: the progress bar

The progress bar showing **0%** while sections clearly ARE being reviewed means the **progress bar UI is decoupled from the actual work being done**. Two suspect components:

1. **`useCurationProgress` / `curation_progress` Realtime row** — drives the top-of-page "Curation in Progress" tracker. If `useWaveExecutor` is invoking the edge function but never calling `useUpdateCurationProgress` to bump `sections_reviewed` / `current_wave`, the realtime row stays at its initial values → 0%.
2. **`WaveProgressPanel` (right rail)** — derives wave % from the local execution record. The console shows a `forwardRef` warning on `WaveProgressPanel` and `AIReviewSummaryCard`, which is unrelated to progress but signals these components are being touched. Need to check whether wave progress reads from the per-section store (which IS being updated, since cards are rendering) or from a counter that isn't being incremented.

### Plan to diagnose & fix

I need to read code to confirm the root cause before fixing — three files in parallel:

1. **`src/hooks/cogniblend/useWaveExecutor.ts`** (or wherever wave execution lives) — does it call `useUpdateCurationProgress` after each section completes? Does it set `current_wave` at the start?
2. **`src/components/cogniblend/curation/WaveProgressPanel.tsx`** — what does it use to compute the percentage? Section store, execution record, or `curation_progress` row?
3. **`src/services/cogniblend/waveExecutionHistory.ts`** — already shown above; updates `lastCompletedWave` only on `updateWaveComplete`. If wave 1 isn't "complete" until ALL its sections finish, the wave-level percentage stays at 0 until the last section lands — even though 5/N sections are done.

### Likely root cause (hypothesis to confirm)

`WaveProgressPanel` reads `wave.status` from the execution record. The record only flips `running → completed` in `updateWaveComplete` after the FULL wave finishes. Per-section progress within a running wave is not exposed. The "0%" is therefore literally correct from the record's perspective — but misleading to the user, because individual sections inside Wave 1 (`organization_context`, `problem_statement`, `scope`, `expected_outcomes`, `context_and_background`) are clearly progressing one by one.

### Fix direction (pending code confirmation)

- **Bug A (most likely):** `WaveProgressPanel` should derive wave-progress as `sectionsCompletedInWave / totalSectionsInWave` by reading per-section status from the section store (same pattern Bug 8 used for diagnostics counts), instead of reading only the wave-level `status` field.
- **Bug B (also likely):** `useWaveExecutor` is not pushing per-section progress into `curation_progress.sections_reviewed`, so the top-of-page tracker also reads 0. Fix: call `useUpdateCurationProgress` after each successful `useWaveReviewSection` invocation with incremented `sections_reviewed` + `current_wave`.
- **Bug C (low priority — separate from progress):** `forwardRef` warning on `WaveProgressPanel` and `AIReviewSummaryCard` (Radix/shadcn passes a ref via `asChild` somewhere). Wrap both in `React.forwardRef`.

### Phases

| Phase | Files touched | Risk |
|---|---|---|
| **0 — Read & confirm** (read-only, this approval covers it) | `useWaveExecutor.ts`, `WaveProgressPanel.tsx`, `RightRailCards.tsx` | none |
| **1 — Live wave % from store** | `WaveProgressPanel.tsx` (~15 lines) | low — display only |
| **2 — Push per-section progress to `curation_progress`** | `useWaveExecutor.ts` or `useWaveReviewSection.ts` (~10 lines) | low — non-blocking upsert |
| **3 — Fix `forwardRef` warnings** | `WaveProgressPanel.tsx`, `RightRailCards.tsx` (~4 lines each) | none |

Each file stays well under 250 lines. No schema changes. No edge-function changes. Pass 1 itself is working — only the visualisation needs wiring.

### Questions before I proceed

None — the diagnosis is concrete and the fix is local. Approving this plan switches me to default mode where I'll read the three files, confirm the hypothesis, and apply Phases 1–3.

