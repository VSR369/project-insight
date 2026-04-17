

## V3 Plan Review — Verdict & Final Action Plan

### Verdict on V3
**Approved with 4 small corrections.** V3 fixes all 4 gaps from my prior review (Wave 8 collision, is_batch_failure flag, early-return placement, reasoning_effort plumbing). It also correctly identifies the duplicate persistence at lines 1287-1290 that must be removed. Below are the residual issues I caught when verifying against the actual code, plus the final prompt sequence.

### Residual gaps in V3 (must fix before implementation)

**Residual 1 — `consistency_check` calls helpers that may not exist standalone.**
V3's Change 2 calls `callConsistencyPass(apiKey, model, existingReviews, challenge)` and `callAmbiguityPass(apiKey, model, existingReviews, challenge, challenge)`. Verified: actual signature in `index.ts:1115-1145` is `callConsistencyPass(apiKey, model, allNewSections, challengeData, reasoningEffort)` and `callAmbiguityPass(apiKey, model, allNewSections, challengeData, sectionsContext, reasoningEffort)`. **Fix:** match real signatures and pass `reasoningEffort='medium'` for the QA-only call.

**Residual 2 — Mid-batch `return` statements break new flow.**
Edge function returns 429/402 immediately on `RATE_LIMIT`/`PAYMENT_REQUIRED` (lines 1077-1088). With Pass 2's `callAIWithFallback` retry (PR2), 429 should be caught and retried; only return 429 after retries exhaust. **Fix:** move 429 handling inside `callAIWithFallback` (already in V3 PR2) and let the catch fall through to synthetic warning instead of returning.

**Residual 3 — Cancel UX semantics not wired.**
V3 Prompt E renames the button label but doesn't change the underlying `cancelReview()` logic. The current code already cancels between waves (line 152 check), so the new label is accurate. But the toast at line 162 says "cancelled after completing current wave" which is correct. **Fix:** none needed — V3 is right; just confirm during PR4.

**Residual 4 — `wave_action` for QA wave.**
V3 sends `wave_action: 'consistency_check'` from Wave 8. The edge function early-return (Change 2) handles it, but the existing `wave_action` enum in prompts (`'generate' | 'review_and_enhance' | 'review'`) doesn't include it. Since the early return short-circuits before user-prompt building, this is safe — but worth a comment in code.

### Final 4-PR Action Plan

**PR1 (atomic — Prompts A + B together)**
- **Prompt A — Edge function** (`index.ts`): apply V3 Changes 1-8 with Residual 1 fix (correct helper signatures + `reasoningEffort='medium'` for QA-only).
- **Prompt B — Wave executor + waveConfig** (`useWaveExecutor.ts`, `waveConfig.ts`): batched call per wave, Wave 8 with `sectionIds: []`, `is_batch_failure` detection, selective reasoning map, `handleError` everywhere. Keep `reReviewStale` and `useWaveReviewSection` untouched.
- Verify: 14 edge calls total (6 waves × 2 passes + Wave 8 + complexity-parallel), wall time 5-8 min, no Wave 7 collision in UI.

**PR2 — Prompt C: Resilience**
- Add 429 retry with backoff (5s/10s) to `callAIWithFallback` in `_shared/aiModelConfig.ts`.
- Migrate `aiPass1.ts`, `aiPass2.ts`, `aiConsistencyPass.ts`, `aiAmbiguityPass.ts` from raw `fetch` to `callAIWithFallback`.
- Verify: throttle test → retry succeeds, no Wave-2+ rate-limit failures.

**PR3 — Prompt D: Cost optimization (gated)**
- Reduce `TOKEN_BUDGET_CHARS` 24K → 12K in `fetchExamples.ts`.
- **Gate:** record `principal_compliance_pct` from 3 baseline runs at 24K; after switching, run same 3 challenges. Revert if compliance drops > 5%.

**PR4 — Prompt E: UX polish**
- `DiagnosticsReviewPanel.tsx`: render `errorMessage` from execution record on failed waves.
- `WaveProgressPanel.tsx`: cancel button label → "Cancel after current wave"; Wave 8 special render (no per-section rows; show consistency/ambiguity findings count summary).

### Files Touched (final)

| File | PR | Notes |
|---|---|---|
| `supabase/functions/review-challenge-sections/index.ts` | 1 | 8 changes per V3 + Residual 1 |
| `src/hooks/useWaveExecutor.ts` | 1 | Batched loop, Wave 8, no `as any`, `handleError` |
| `src/lib/cogniblend/waveConfig.ts` | 1 | Add Wave 8 entry |
| `supabase/functions/_shared/aiModelConfig.ts` | 2 | 429 retry |
| `supabase/functions/review-challenge-sections/aiPass1.ts` | 2 | callAIWithFallback |
| `supabase/functions/review-challenge-sections/aiPass2.ts` | 2 | callAIWithFallback |
| `supabase/functions/review-challenge-sections/aiConsistencyPass.ts` | 2 | callAIWithFallback |
| `supabase/functions/review-challenge-sections/aiAmbiguityPass.ts` | 2 | callAIWithFallback |
| `supabase/functions/review-challenge-sections/fetchExamples.ts` | 3 | 24K → 12K |
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | 4 | Error display |
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | 4 | Cancel label, Wave 8 render |

11 files. All under 250-line cap except `index.ts` (1339 lines, pre-existing). Zero migrations. Zero new tables.

### Quality preservation (unchanged)
14-source system prompt · per-section format/quality criteria · SECTION_DEPENDENCIES · SECTION_WAVE_CONTEXT · 4 forcing fields · self-critique · full attachment content in Pass 1 · context rebuild between waves · per-section autosave · consistency + ambiguity passes (now actually run via Wave 8).

### Expected outcome
35-50 min → **5-8 min** · 33-66 calls → **13-14** · 1.63M tokens → **~850K** · `principal_compliance_pct` same or higher.

### Risks & mitigations
- **Wave timeout (150s edge limit):** SOLO sections still fan out as parallel HTTP calls inside edge — confirmed safe via `Promise.all` pattern at line 779 (complexity already parallel). If a single wave's batch exceeds 150s, split SOLO sections into their own wave-internal sub-batches.
- **Cancel UX delay (up to 90s):** Mitigated by PR4 label change.
- **Per-section autosave:** Preserved — `setAiReview` still fires per section after batch parse, autosave debounce unchanged.

### Implementation will start with PR1 (Prompts A + B as one atomic change) once approved.

