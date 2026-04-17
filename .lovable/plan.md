

## Diagnostic Truthfulness — Final Plan

### Validation against actual code

I verified the four claims:

1. **`waveBatchInvoker.ts`** does emit `errorCode`: `MISSING` / `BATCH_ERROR` / `MALFORMED` per section, plus `errorMessage`. Confirmed these already exist on the execution record but are not surfaced in the UI.
2. **`DiagnosticsReviewPanel.tsx`** does override `entry.reviewStatus` with `execStatus === 'error'`. This is the line that makes backfilled `warning` rows display as `Error`.
3. **Action label** `'generate'` is set by `determineSectionAction` purely on emptiness — it has nothing to do with Pass 2 having run. Misleading word, real bug.
4. **`DiagnosticsSheet`** uses `useSyncExternalStore` against an event-driven snapshot. On Re-analyse the store clears synchronously but the sheet's snapshot can lag a tick when the sheet is already open.

All four fixes are valid and aligned with the existing architecture. Adding two safety items below.

### Files to change (4, additive only)

| File | Change |
|---|---|
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | (a) Stop overriding store status with execution-record `error` — store is the single source of truth for section state. (b) Rename Action labels: `generate` → `Empty → Draft`, `skip` → `Skipped`, `review` → `Review`. (c) Render per-section `errorCode` + `errorMessage` chip when present. |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | Listen to a new `cogni-diagnostics-reset` window event and force `refreshKey++` + clear memoized snapshots. Keeps `useSyncExternalStore` correct even when sheet is already open during Re-analyse. |
| `src/hooks/cogniblend/useCurationAIActions.ts` | Inside `runAnalyseFlow` (and `runGenerateFlow`), immediately after clearing execution records and before any await, dispatch `window.dispatchEvent(new CustomEvent('cogni-diagnostics-reset'))`. Synchronous — no race. |
| `src/services/cogniblend/waveBatchInvoker.ts` | (Tiny) — make sure the error object written to the execution record always carries `{ errorCode, errorMessage }` for every failure path (`MISSING`, `BATCH_ERROR`, `MALFORMED`, future `TIMEOUT`). It already does for most; verify `MISSING` path includes a human-readable message. |

### Two extra safeguards (not in user's plan but needed)

1. **Wave header count = current config, not execution record.** The "5 of 5 failed" header comes from counting execution-record entries, which can be stale across wave-config changes. Update the header math in `DiagnosticsReviewPanel` (and the wave-progress widget) to use `EXECUTION_WAVES[waveNumber].sections.length` as the denominator and intersect execution-record statuses by *current* section keys only. Stale section keys are ignored, not counted.
2. **Action label "Empty → Draft" must not be shown after Pass 2 has populated the section.** Re-derive `sectionAction` from current store data, not from a stale execution-record snapshot. Already largely correct — just confirm the panel reads `entry.data` freshly.

### What is NOT changed

- ❌ Pass 1 / Pass 2 separation
- ❌ Wave structure, wave numbering, SOLO_SECTIONS, MAX_BATCH_SIZE
- ❌ Edge functions (`aiPass1.ts`, `aiPass2.ts`, `index.ts`) — this PR is diagnostics-only
- ❌ `executeWaves`, harmonization wave, QA wave skip
- ❌ Store reducers / Zustand contracts
- ❌ Accept All path

### Architecture compliance

- R1: each touched file stays under 250 lines.
- R2: no DB calls added in components; event dispatch is UI-layer only.
- R3: typed `DiagnosticsResetEvent`, no `any`.
- R9: errors surfaced via existing `errorCode/errorMessage` fields; no new `console.*`.
- R6: error chip ensures failure state is communicated, not hidden.

### Verification

1. Click **Re-analyse** with diagnostics drawer open → all wave rows blank instantly, no stale "X of Y failed" header.
2. Pass 1 finishes → Action column shows `Empty → Draft` / `Review` / `Skipped` (never the word `Generate`).
3. A SOLO section (e.g. `evaluation_criteria`) failure → row shows `Error` AND the precise `errorCode` chip (`BATCH_ERROR` / `MISSING` / `MALFORMED`) with the message tooltip.
4. A backfilled `warning` row (where Pass 1 completed but produced no comments for that section) no longer shows `Error` — shows `Reviewed` (warning).
5. Wave 5 header shows `0/3` not `5/5`. Stale 6-wave keys are ignored.
6. Pass 2 panel remains untouched while Pass 1 runs.
7. No regressions in Accept All, Wave 12 harmonization, or Pass 1 wave execution.

