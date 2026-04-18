

## Wave 8 Timeout Fix — Aligned Plan

### Root cause (confirmed)
Wave 8 runs two sequential sub-batches (`submission_guidelines` regular + `reward_structure` SOLO) at HIGH reasoning. With non-deterministic AI reasoning depth, total wall-time hovers at 125–155s — sometimes tipping past the 150s edge function limit → 504 timeout → masked as generic `NETWORK` in diagnostics.

### Fix 1 — Rebalance Wave 8 / Wave 9
File: `src/lib/cogniblend/waveConfig.ts`

- **Wave 8 (after):** `sectionIds: ['reward_structure']` — 1 SOLO sub-batch, ~65–80s
  - `prerequisiteSections`: only `reward_structure`'s deps (`complexity`, `maturity_level`, `deliverables`, `phase_schedule`, `solver_expertise`)
- **Wave 9 (after):** `sectionIds: ['submission_guidelines', 'ip_model', 'hook', 'visibility']` — 4 regular, 2 sub-batches, ~95–115s
  - `prerequisiteSections`: existing + `evaluation_criteria`, `phase_schedule`, `deliverables` (for `submission_guidelines`)

**Dependency check** (from `sectionDependencies.ts`): `submission_guidelines` needs `deliverables` (Wave 4), `evaluation_criteria` (Wave 7), `phase_schedule` (Wave 7). All satisfied before Wave 9. ✅

### Fix 2 — Preserve HTTP status in error
File: `src/services/cogniblend/waveBatchInvoker.ts` (~line 134)

Replace the bare `throw new Error(error.message)` with a variant that appends the status code (`error.status` or `error.context.status`) so diagnostics shows `NETWORK [HTTP 504]` instead of just `NETWORK`. Essential for distinguishing 504 (timeout) vs 546 (memory) vs 500 (crash) in production.

### What is NOT touched
- ❌ Edge function code (Pass 1, Pass 2, harmonization, backoff)
- ❌ `SOLO_SECTIONS` set
- ❌ Wave numbering (still 9 waves)
- ❌ Reasoning effort (HIGH stays HIGH)
- ❌ Model selection
- ❌ Any UI / hook / service beyond the one error-message line
- ❌ DB schema, RLS, migrations

### Architecture compliance
- R1: Both files stay <250 lines (waveConfig is config-only; invoker change is 3 lines net)
- R2: Pure config + service-layer change — no DB/UI surface touched
- R3: Status-code extraction uses narrow `unknown`-style cast pattern already present in the file
- R6: Existing failure UI (`NETWORK` with status suffix) preserved + improved
- R9: No new client-side `console.*`; status flows into existing `handleQueryError` path
- Multi-tenancy / RLS: no security surface touched

### Verification matrix
| Test | Expected outcome |
|---|---|
| Re-run AI review on the failing challenge | Wave 8 completes in ~75s; Wave 9 completes in ~110s; both succeed |
| 5 consecutive runs on a heavy challenge | Zero `NETWORK` failures on Wave 8 |
| Force a 504 (dev override slowing AI calls) | Diagnostics shows `NETWORK [HTTP 504]` instead of bare `NETWORK` |
| Wave 9 dependency check | `submission_guidelines` receives `evaluation_criteria` + `phase_schedule` + `deliverables` content in Pass 1 context |
| Per-section Retry button (existing) | Still works for either wave |

### Files modified — total ~25 lines
1. `src/lib/cogniblend/waveConfig.ts` — rebalance Wave 8/9 `sectionIds` + `prerequisiteSections` (~20 lines)
2. `src/services/cogniblend/waveBatchInvoker.ts` — append HTTP status to error message (~5 lines)

This is the smallest, lowest-risk fix that permanently eliminates the Wave 8 timeout boundary problem and improves error observability for any future timeout class.

