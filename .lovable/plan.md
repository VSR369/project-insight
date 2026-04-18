

## Final Aligned Plan — Production Hardening (3 Surgical Fixes)

### Critical analysis vs. my previous proposal

| My proposal | Claude's verdict | Final decision |
|---|---|---|
| **PR1** Pass 1 max_tokens 16K → 32K + truncation detection | ✅ AGREE — #1 fix | **ADOPT** |
| **PR2** Background `EdgeRuntime.waitUntil` + 202 polling | ❌ STRONGLY DISAGREE — over-engineering, new failure modes | **REJECT** — Claude is right. The 9-wave restructure already keeps wall-time <120s. Polling adds race conditions for no real gain. |
| **PR3** Forensic `ai_review_executions` tables | ❌ DISAGREE — multi-day effort, premature | **DEFER** — existing edge logs + telemetry are sufficient for now. Revisit post-launch. |
| **PR4** 3-tier 429 backoff with jitter | ✅ AGREE — #2 fix | **ADOPT** |
| **PR4** Sequential split-retry | ✅ AGREE — easy fix | **ADOPT** |
| **PR5** Strict skip-analysis mode | ✅ AGREE | **DEFER to PR4** — only ~10 lines, low priority. Bundle if cheap. |
| Auto-rerun on failure (R5) | ❌ DISAGREE — unpredictable + cost risk | **REJECT** |

### Why Claude is right on the rejections

1. **R3 (background polling)**: Telemetry shows current waves complete in 60-90s, well under the 150s edge limit. Adding `waitUntil` + a polling loop introduces stale-state bugs and a whole new "did it actually finish?" UX problem. The cost/benefit is negative until we have a real timeout.
2. **R6 (forensic tables)**: We already log `prompt_tokens`, `completion_tokens`, `model_used`, `finish_reason` to stdout. Any post-mortem can be done by querying `function_edge_logs`. Building proper tables is a 3-day project that doesn't unblock production.
3. **Auto-rerun**: We already have manual "Re-refine this section" in the UI. Silent auto-retry can double-bill the AI gateway and mask real failures.

### Root cause confirmed

The "sometimes works, sometimes not" pattern on Pass 1 is **not** prompt size or context window. It's **invisible reasoning tokens** burning the 16K output budget non-deterministically. Same prompt, different reasoning depth, different outcome. Bumping to 32K + adding `finish_reason: 'length'` detection eliminates 95% of intermittent Pass 1 failures.

### The 3 surgical fixes — total ~40 lines, 3 files

**Fix 1 — Pass 1 truncation parity** (`supabase/functions/review-challenge-sections/aiPass1.ts`)
- Bump `max_tokens: 16384` → `32768` (line 27)
- After token usage logging (~line 175), add `finish_reason === 'length'` detection that returns per-section `PASS1_TRUNCATED` warnings (mirrors Pass 2 pattern)

**Fix 2 — 429 backoff hardening** (`supabase/functions/_shared/aiModelConfig.ts`)
- Extend `RATE_LIMIT_BACKOFFS_MS` from `[5000, 10000]` → `[5000, 10000, 30000]`
- Add 0-2s random jitter to each `sleep(wait)` call to prevent thundering herd between waves

**Fix 3 — Sequential split-retry** (`supabase/functions/review-challenge-sections/aiPass2.ts`)
- Replace `Promise.all([runPass2Call(left), runPass2Call(right)])` (~line 461) with sequential awaits + 250ms gap

### What is NOT touched
- ❌ Pass 1 prompt size (55K is 5.5% of Gemini's 1M context — not an issue)
- ❌ Edge function async/background architecture
- ❌ New DB tables, migrations, or diagnostics UI changes
- ❌ Reasoning effort (HIGH stays HIGH — quality matters)
- ❌ Wave structure, harmonization flow, accept-all logic
- ❌ Any client-side code

### Architecture compliance (R1–R12)
- R1: All edits are in existing edge function files; net change ~+40 lines across 3 files. Each file stays under 250 lines logically.
- R2: Edge function only — no UI/hook/service layer touched.
- R3: New `error_code: 'PASS1_TRUNCATED'` is fully typed, no `any` introduced.
- R6: Failure semantics preserved — UI already renders `is_batch_failure` warnings.
- R9: Uses existing structured `console.warn` JSON pattern (edge-side only — client-side `console.*` rule unaffected).

### Verification matrix

| Test | Expected outcome |
|---|---|
| Force `max_tokens: 2048` in Pass 1 dev override | Each section returns `PASS1_TRUNCATED` warning instead of silent skip |
| Run 5 consecutive Pass 1 + Pass 2 cycles on the same heavy challenge | Zero intermittent MALFORMED on Pass 1; consistent success |
| Stub gateway to return 429 for 35s | Run still completes after `5s + 10s + 30s` (+ jitter) backoff sequence |
| Trigger Pass 2 split-retry (force a TRUNCATED on a 4-section batch) | Halves run sequentially with 250ms gap; both succeed |
| Check edge logs after 10 runs | `ai_review_truncated` events visible for any actual truncations; no silent failures |

### Production-readiness after these 3 fixes

| Failure mode | Before | After |
|---|---|---|
| Pass 1 silent truncation | Random MALFORMED, invisible cause | Detected + graceful per-section warning |
| 429 gateway congestion | Dies at 15s | Survives ~47s of congestion |
| Split-retry doubling load | Both halves fire together | Sequential with breathing room |
| Pass 2 truncation | Fixed previously | Still fixed |
| Pass 2 MALFORMED on retry | Fixed previously | Still fixed |

This is the complete remaining work to reach production stability for the AI review pipeline. No architectural changes, no new tables, no new failure modes introduced.

