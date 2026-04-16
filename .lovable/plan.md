

## Plan: Per-Wave Pass 1 / Pass 2 Timing Report

The user wants timing data for the most recent run on challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b` — per wave, per pass, plus totals.

### Data sources

The authoritative record is the persisted `ExecutionRecord` in `localStorage` (`wave-exec-{challengeId}-analyse` and `wave-exec-{challengeId}-generate`). Each `WaveRunRecord` carries `startedAt` and `completedAt` timestamps. That's exactly what we need.

But localStorage is browser-side — I cannot read it from this sandbox. So the practical sources are:

1. **Edge-function logs** (`supabase--analytics_query` on `function_edge_logs` + `supabase--edge_function_logs`) — every section call to `review-challenge-sections` has `started`/`completed` events with `wave`, `passType`, `sectionKey`, `duration_ms`. These give the most accurate per-section timings, which I can roll up per wave.
2. **`challenge_quality_telemetry` table** — has `review_duration_seconds` for the whole Pass 1 run, but not per-wave breakdown.

Edge-function logs are the right source — they give per-wave granularity and cover both passes.

### Approach (read-only — fits this mode)

1. Query `function_edge_logs` for `review-challenge-sections` calls in the last 2 hours, filtered to this challenge.
2. Pair each `started` event with its `completed` event by `(wave, passType, sectionKey)` to get per-section duration.
3. Aggregate per `(passType, wave)`: sum durations, count sections, capture wall-clock span (max(completedAt) − min(startedAt)) — wall-clock matters because waves run sequentially but sections within a wave may run with small gaps.
4. Render two tables (Pass 1, Pass 2) and a totals row.

### What I'll deliver

A markdown report with:

```
Pass 1 — Analyse
Wave  Name                                      Sections  Sum(s)  Wall-clock(s)
1     Foundation — Problem & Context            5         …       …
2     Analysis — Root Causes & Stakeholders     5         …       …
…
TOTAL                                           31        …       …

Pass 2 — Generate (same shape)

Grand totals: Pass 1 = X s, Pass 2 = Y s, Combined = Z s
```

If Pass 2 hasn't been run yet for this challenge in the visible log window, I'll say so explicitly rather than fabricating numbers.

### Why no code changes

This is a one-off diagnostic answer, not a feature. No file edits, no migrations. If you later want this surfaced in the UI (e.g. a "Wave timing" tab in the Diagnostics drawer), that's a separate ~30-line addition reading from the `ExecutionRecord` already in localStorage — happy to plan that as a follow-up.

### Risk

Zero — read-only log queries.

