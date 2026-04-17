

## Pass 2 Streamlining — Closing Plan for F3c → F5b

### Why these 4 sub-fixes were not done in the previous turn
The previous turn completed the **edge function layer** (F1, F2, F3a, F3b) — `max_tokens`, split-and-retry, failure markers, BATCH_EXCLUDE reasons. It then ran out of turn before reaching the **client layer** (invoker consumption + UI + Wave 12 telemetry). The data is already flowing from the edge function — the client just isn't reading it yet.

### Current state vs target state

```text
Edge fn ──[is_pass2_failure, pass2_error_code, pass2_error_message]──▶ aiCalls.ts ──▶ ❌ STOPS HERE
                                                                                      │
                                                                          (waveBatchInvoker doesn't read it)
                                                                                      │
                                                                                      ▼
                                                                          DiagnosticsSuggestionsPanel
                                                                          shows "AI Suggestion Ready" + "—"
```

After this plan: invoker reads → execution record stores → panel renders Reason + Wave 11/12 explainers.

### The 4 surgical edits

| # | File | Change |
|---|---|---|
| **F3c** | `src/services/cogniblend/waveBatchInvoker.ts` | In the success branch, after parsing the section result, read `result.is_pass2_failure`, `result.pass2_error_code`, `result.pass2_error_message`. If `parsedSuggestion == null` AND `is_pass2_failure === true`, push `BatchSectionOutcome` with `status: 'success'` (Pass 1 still succeeded), `isPass2Failure: true`, `errorCode: pass2_error_code`, `errorMessage: pass2_error_message`. |
| **F4** | `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | (a) Replace raw `sectionAction` render (line 173) with: `{sectionStatus === 'skipped' ? 'Skipped' : 'Suggest'}`. (b) Add `<TableHead>Reason</TableHead>` column + `<TableCell>` rendering `errorCode` Badge + `errorMessage` text + `skippedReason` fallback. (c) Special-case Wave 11 (`QA_WAVE_NUMBER`): render info chip "Skipped — QA already done in Pass 1; Wave 12 handles cross-suggestion consistency", suppress section table. (d) Special-case Wave 12 (`HARMONIZE_WAVE_NUMBER`): read `execWave?.harmonizeMetrics` and render badges for `crossSectionScore`, `issuesFound`, `appliedCount`, `droppedCount`. |
| **F5a** | `src/hooks/useWaveExecutor.ts` (Wave 12 block, ~lines 308–319) | Before the `suggestionCount < HARMONIZE_MIN_SUGGESTIONS` check, count cluster sections in the current `execRecord` where `isPass2Failure === true`. If count > 0, fire `toast.warning("Wave 12 running with N/M cluster suggestions (X failed in Pass 2 — re-run those sections first)")`. Do NOT block — just warn. |
| **F5b** | `src/hooks/useWaveExecutor.ts` (Wave 12 block, ~lines 396–398) | After harmonization succeeds, replace the standalone `toast.success` with: `execRecord = updateHarmonizeMetrics(execRecord, { crossSectionScore, issuesFound, appliedCount, droppedCount }); saveExecutionRecord(execRecord);` then fire toast. Also propagate `isPass2Failure` from outcomes into `historyResults` (~lines 272–278) so the panel can read it from the record. |

### Files touched (4 total — all ≤250 lines after edits)
- `src/services/cogniblend/waveBatchInvoker.ts` (+~12 lines)
- `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` (+~35 lines — adds 1 column, 2 special-case branches)
- `src/hooks/useWaveExecutor.ts` (+~10 lines — pre-flight warning + persist metrics)
- (Confirm `WaveSectionResult.isPass2Failure?` and `HarmonizeWaveMetrics` already exist in `waveExecutionHistory.ts` from previous turn; add if missing)

### Architecture compliance
- R1: every file stays under 250 lines (panel grows from ~190 → ~225)
- R2: no DB calls added in components — data flows via execution-record snapshot already in scope
- R3: typed extensions only (`isPass2Failure?: boolean`, `HarmonizeWaveMetrics`) — no `any`
- R6: every Pass 2 blank now shows a Reason cell or a Wave-level explainer chip
- R9: `toast.warning` for cluster pre-flight; no new `console.*`

### Verification (after these 4 edits)
1. Force a Pass 2 truncation on a single section → row shows action **"Suggest"** + Reason chip `TRUNCATED` + message tooltip.
2. `creator_references` (BATCH_EXCLUDE) shows Reason `"Excluded — no DB column"` instead of blank.
3. Wave 11 row renders the explicit skip chip — no empty section table beneath it.
4. Wave 12 row shows badges: `Score: 87 / Issues: 3 / Applied: 2 / Dropped: 1`.
5. If any cluster section's Pass 2 failed, a warning toast fires before Wave 12 starts.
6. After Wave 12, refreshing diagnostics shows the same metrics (proves they're persisted, not just toasted).
7. No regression in Pass 1 diagnostics, Accept All, or Wave 12 application logic.

