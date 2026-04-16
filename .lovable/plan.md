

## Plan: Per-wave timing in the Diagnostics drawer

### What to add

A small **"Wave Timing"** subsection inside `DiagnosticsReviewPanel` (Pass 1) and `DiagnosticsSuggestionsPanel` (Pass 2) showing one row per wave with duration, plus a totals row.

The data is already there — `WaveRunRecord` in `waveExecutionHistory.ts` carries `startedAt` and `completedAt` for every wave. No backend, no schema, no edge-function changes needed.

### Where it renders

```
Pass 1 — AI Review (Analyse)
  [existing summary chips]
  [existing per-section list]
  ─── Wave Timing ───
  Wave 1  Foundation — Problem & Context        5/5 sections    32s
  Wave 2  Analysis — Root Causes                5/5 sections    1m 14s
  Wave 3  …                                                     …
  ─────────────────────────────────────────────
  Total                                         31 sections     6m 42s
```

Same shape inside the Pass 2 panel using the `generate` execution record.

### Files

| Phase | File | Change | Lines |
|---|---|---|---|
| 1 | `src/lib/cogniblend/waveTimingFormat.ts` (new) | `formatDuration(ms)` + `computeWaveDurations(record)` helpers — pure functions, fully unit-testable | ~40 |
| 2 | `src/components/cogniblend/diagnostics/WaveTimingTable.tsx` (new) | Presentational table component, props = `{ record: ExecutionRecord \| null }` | ~70 |
| 3 | `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | Render `<WaveTimingTable record={executionRecord} />` below existing content | +2 |
| 4 | `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | Same — render `<WaveTimingTable record={executionRecord} />` | +2 |

All four files stay well under the 250-line cap.

### Edge cases

- **Wave still running** → show "running…" with elapsed time from `startedAt` to `now`.
- **Wave pending** → show em-dash.
- **Wave errored / cancelled** → show duration up to `completedAt` if present, else `—`, with status badge.
- **No record** (`null`) → render nothing (panel already shows fallback copy elsewhere).
- **Sub-second waves** → format as `Xs` (e.g. `0.4s`); ≥60s → `Xm Ys`; ≥1h → `Xh Ym`.

### Why no DB / edge-function work

The `ExecutionRecord` is already persisted to localStorage by `useWaveExecutor` and read by both panels. The hard work was done in the previous progress-bar fix when wave start/complete timestamps got wired in. This is purely a display addition.

### Risk

Zero. Read-only display from data already in the panel's props. No new queries, no new state, no new effects.

