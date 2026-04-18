# AI Curator — Production Test Plan (Manual Acceptance Gate)

> **Source:** Uploaded by Curation team, 2026-04. Mirrored from
> `AI_CURATOR_PRODUCTION_TEST_PLAN.md`. The 70% of items that can be
> automated have been migrated to executable tests under
> `src/lib/cogniblend/__tests__/`, `src/services/cogniblend/__tests__/`,
> `supabase/functions/_shared/`, and the `ai-review-smoke-test` edge
> function. The items below tagged `[MANUAL]` are visual / UX gates that
> require human eyes before a production push.
>
> **Single-verdict gate:** the smoke runner must return `goNoGo: 'GO'`
> for the latest fixture run before deploy.

## Manual residual checklist (visual / UX only)

| ID | Category | What to verify |
|---|---|---|
| B4 | Pass 1 | Principal compliance % renders in DiagnosticsReviewPanel header |
| C9 | Pass 2 | Suggestions render in the curation form with the correct format |
| D4 | Harmonization | Cross-section corrections appear with reason + diff in DiagnosticsAcceptancePanel |
| F1 | Diagnostics | "Clear diagnostics" action wipes prior wave history before re-run |
| F2 | Diagnostics | Live wave-tick rate during a run is ≥ once per 2s |
| F6 | Diagnostics | Per-wave timestamps update in real time |
| G1 | Accept All | Click-through writes every suggestion to the form without intervention |
| G3 | Accept All | Per-section accept buttons work after Accept-All-with-failures |
| I4 | Edge case | Cancel mid-run + immediate re-run does not corrupt store |
| I6 | Edge case | Cross-tab open does not double-fire wave persistence |
| J4 | Regression | Audit prompt diffs since last release (no quality regressions) |

## Automation index

| Test ID | Layer | File |
|---|---|---|
| A1–A5, J1–J3 | L1 Vitest | `src/lib/cogniblend/__tests__/waveConfig.test.ts` |
| C7 | L1 Vitest | `src/lib/cogniblend/__tests__/diagnosticsActionLabel.test.ts` |
| C10 | L1 Vitest | `src/lib/cogniblend/__tests__/parseSuggestion.test.ts` + `validators/__tests__/formatValidator.test.ts` |
| E2, E3 | L1 Vitest | `src/services/cogniblend/__tests__/waveBatchInvoker.test.ts` |
| G2, G4 | L1 Vitest | `src/lib/cogniblend/__tests__/bulkAcceptHelpers.test.ts` |
| B3, C5 | L2 Deno | `supabase/functions/_shared/safeJsonParse_test.ts` |
| B1, B6–B8, C1, C8, D1, D5, F1, H1–H5, I1, I3 | L3 Smoke | `supabase/functions/ai-review-smoke-test/index.ts` (admin panel: `AIReviewSmokeTestPanel.tsx`) |

## Go/No-Go criteria (smoke runner aggregate)
- Categories A, B, C, D: 100 % pass
- Category E: ≥ 80 % pass (network flakiness allowance)
- Categories F, G, J: 100 % pass
- All wave timings within `MAX_WAVE_DURATION_MS` (120 000 ms)
- Total run < 240 000 ms

The runner returns:
- `GO` — all gates met
- `WARN` — within tolerance but at least one yellow flag
- `NO_GO` — any red gate; deploy blocked
