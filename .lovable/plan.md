

## What's leaking past data on the Diagnostics screen after Re-analyse

I traced every panel on the Diagnostics screen and the `runAnalyseFlow` cleanup path. Here's the inventory:

| Diagnostics panel | Data source | Cleared on Re-analyse today? |
|---|---|---|
| QualityScoreSummary | `consistency_findings` + `ambiguity_findings` (DB) | ✅ Edge fn deletes + reinserts per run |
| Review (Pass 1) | `wave-exec-{id}-analyse` (localStorage) | ✅ `clearAllExecutionRecords` |
| Suggestions (Pass 2) | `wave-exec-{id}-generate` (localStorage) | ✅ `clearAllExecutionRecords` |
| Acceptance (Pass 3) | `wave-accept-{id}` (localStorage) | ✅ `clearAllExecutionRecords` |
| Consistency / Ambiguity findings | DB tables (deleted server-side per Pass 1) | ✅ |
| Discovery (attachments + digest) | DB `challenge_attachments`, `challenge_context_digest` | ✅ Queries invalidated |
| **ChallengeTelemetryPanel ("Review Quality Trend")** | `challenge_quality_telemetry` (DB, **append-only history**) | ❌ **By design** — keeps every prior run for trend |
| **AICurationQualityPanel** ("AI Quality Analysis" assessment in right rail) | Local `useState` in component | ❌ **Persists until page reload** |
| **`ai_section_reviews`** JSONB on `challenges` row | Merged-by-key, never trimmed | ❌ Old keys for sections not touched in new run linger |

### Two real leaks worth fixing, one to leave alone

**Leak 1 — `AICurationQualityPanel` assessment state.** The "Run Analysis" panel keeps the old assessment object in component state. After Re-analyse, the stale numeric scores + recommendations remain visible until the curator clicks "Re-analyze" inside that panel. Curators read this as current data — it isn't.

**Leak 2 — `ai_section_reviews` JSONB array.** `useCurationStoreSync.flushSave` *merges* new review entries into the existing array by `section_key`. If section X was reviewed in run 1 but skipped in run 2, run 1's review row survives. This is what surfaces as "old reviewed/error rows" in the diagnostics Review/Suggestions panels (which read `sections` from the curation store, hydrated from this JSONB).

**Leave alone — `challenge_quality_telemetry`.** This is the historical trend chart by design (rows ordered newest-first, used to compute `findingsDelta` / `isImproving`). Wiping it would destroy the "is the AI getting better" signal. Only the *latest* row drives the headline; previous rows feed the delta.

### Plan — three minimal edits

**Edit 1 — `runAnalyseFlow` clears the right-rail AI Quality panel state**
- Add a callback prop / shared store flag so `AICurationQualityPanel` clears its `assessment` when Re-analyse fires.
- Simplest path: wire `clearAICurationQualityAssessment` into `useCurationAIActions.runAnalyseFlow` via a new optional prop on the panel, or use a session-storage signal `cogni-quality-cleared-${challengeId}` the panel watches.

**Edit 2 — `runAnalyseFlow` resets `ai_section_reviews` for the challenge**
- Before Pass 1 starts, write `ai_section_reviews: []` (or null) to the `challenges` row for `challengeId`.
- This is a single Supabase update inside `runAnalyseFlow`, immediately after the existing `clearAllExecutionRecords(challengeId)` call (line 143).
- Safe: store rehydration intentionally does **not** read from this column for content (see comment in `useCurationStoreSync.ts` lines 188-192), so wiping it cannot corrupt section data.

**Edit 3 — Pause autosave during the wipe**
- Wrap the new clear logic inside the existing `_syncPaused` guard (or set `_syncPaused = true` for the duration of `runAnalyseFlow`'s setup phase) so the debounced flush in `useCurationStoreSync` doesn't immediately re-write the old in-memory entries back into `ai_section_reviews` after we just wiped it.

### What stays unchanged
- All current localStorage clears (`wave-exec-*`, `wave-accept-*`).
- Server-side delete of consistency / ambiguity findings.
- Telemetry history (intentional trend data).
- `useWaveExecutor`'s per-section store reset (already handles in-memory state for sections about to be re-reviewed).
- Pre-flight gate, wave config, principal-grade enforcement — untouched.

### Files touched (~3 small edits, no new files, no migration)
- `src/hooks/cogniblend/useCurationAIActions.ts` — add DB wipe of `ai_section_reviews` + autosave-pause window in `runAnalyseFlow` (~10 lines).
- `src/components/cogniblend/curation/AICurationQualityPanel.tsx` — add `useEffect` watching a session-storage signal (or accept a `resetSignal` prop) to clear local `assessment` (~6 lines).
- `src/hooks/cogniblend/useCurationAIActions.ts` — set the session-storage signal at the start of `runAnalyseFlow` (~2 lines).

### Verification (after deploy)
1. Run Pass 1 → Pass 2 → accept some suggestions on a draft → confirm Diagnostics shows current data.
2. Click Re-analyse → confirm: Review/Suggestions panels start blank, AI Quality Analysis panel resets to "Run Analysis" CTA, Acceptance panel empty, Telemetry panel still shows the prior run as "previous" for delta.
3. New Pass 1 completes → confirm Diagnostics shows only the new run's data, no stale section rows.

