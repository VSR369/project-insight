

## Validation of Claude's Review

I verified each claim against the actual code:
<lov-tool-use id="toolu_vrtx_01BzPpn6YGr97wGd2sDq7edd" name="code--search_files" integration-id="code" data="{\"query\": \"DISCOVERY_WAVE_NUMBER\\\\s*=|QA_WAVE_NUMBER\\\\s*=\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SKKesZAgtab1RZkmZ486nW" name="code--search_files" integration-id="code" data="{\"query\": \"DISCOVERY_WAVE_NUMBER\\\\s*=|QA_WAVE_NUMBER\\\\s*=\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0197GWnEpwM8VWfJi5mg9Ab2" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/cogniblend/waveConfig.ts\", \"lines\": \"115-220\"}">
</lov-tool-use>
Claude's reviewer is wrong about the facts. The 9-wave restructure IS already shipped (`DISCOVERY_WAVE_NUMBER = 10`, `QA_WAVE_NUMBER = 11`). But the QA-during-Pass-2 redundancy point is a genuine catch worth validating.
<lov-tool-use id="toolu_vrtx_019zi1nrxGHWAPriRdf7FN2i" name="code--search_files" integration-id="code" data="{\"query\": \"consistency_check|invokeQaWave|wave_action.*consistency\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PxSMoUSYcFAurDHg5NFjkY" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useWaveExecutor.ts\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01H32dE28iqwY9xiiiYuTsQa" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useWaveExecutor.ts\", \"lines\": \"100-260\"}">
</lov-tool-use>
Now I have all the facts. Let me check what `createInitialWaveProgress` looks like (to confirm QA wave is part of *both* Pass 1 and Pass 2 progress, which is the basis of the redundancy claim):
<lov-tool-use id="toolu_vrtx_01CPkaPGMQJo14RWuPTSMsqo" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/cogniblend/waveConfig.ts\", \"lines\": \"240-292\"}">
</lov-tool-use>
I have everything needed. Reviewer's facts check:

1. **Issue 1 (numbering):** Reviewer is **WRONG about the facts**. Code already has `DISCOVERY_WAVE_NUMBER = 10`, `QA_WAVE_NUMBER = 11`. The 9-wave restructure shipped 2 turns ago. No PR1 prerequisite needed — we can proceed directly to harmonization. My original "no renumbering" plan is correct.

2. **Issue 2 (cluster sections) & Issue 3 (validation):** My plan already incorporates both — confirmed adopted.

3. **Reviewer's NEW catch (QA-during-Pass-2 redundancy):** **Valid and worth adopting.** Confirmed by code: `executeWaves` iterates `EXECUTION_WAVES` which always includes QA wave, regardless of `pass1Only` / `skipAnalysis`. Pass 2 today re-runs `invokeQaWave` → `consistency_check` against `ai_section_reviews` (Pass 1's data, unchanged during Pass 2). 60s saved.

<lov-plan>

## Pass 2 Suggestion Harmonization — Final Plan (v2)

### Reviewer fact-check

| Reviewer claim | Verdict |
|---|---|
| "Actual code has DISCOVERY=7, QA=8, restructure not implemented" | **WRONG.** `waveConfig.ts:128-129` shows `DISCOVERY_WAVE_NUMBER = 10`, `QA_WAVE_NUMBER = 11`. 9-wave restructure shipped. No PR1 prerequisite. |
| "Send only ~12 cluster sections" | **CORRECT** — already in my v1 plan. |
| "Validate each correction before writing" | **CORRECT** — already in my v1 plan. |
| "QA during Pass 2 is redundant — skip it" | **CORRECT and new.** Verified: `executeWaves` (line 163) iterates all `EXECUTION_WAVES` regardless of `skipAnalysis`. Pass 2 re-runs `consistency_check` against `ai_section_reviews` (Pass 1 data, unchanged during Pass 2) — wastes ~60s, produces identical findings. Adopt. |

### Wave routing (no renumbering needed)

```
Pass 1 (Analyse, pass1Only=true, skipAnalysis=false):
  Waves 1-9 → Wave 10 Discovery → Wave 11 QA

Pass 2 (Generate, pass1Only=false, skipAnalysis=true):
  Waves 1-9 → [skip Wave 11 QA] → Wave 12 Harmonization (NEW)
```

Discovery (10) and QA (11) constants stay put. Harmonization gets `HARMONIZE_WAVE_NUMBER = 12` and runs Pass-2-only.

### Files (4, additive)

| File | Change |
|---|---|
| `src/lib/cogniblend/waveConfig.ts` | Add `HARMONIZE_WAVE_NUMBER = 12`, `HARMONIZE_CLUSTER_SECTIONS` (deliverables, evaluation_criteria, phase_schedule, success_metrics_kpis, expected_outcomes, reward_structure, complexity, scope, solver_expertise, submission_guidelines). New helper `createInitialWaveProgressForPass2()` that appends Harmonization wave. |
| `supabase/functions/review-challenge-sections/aiHarmonizationPass.ts` (NEW, ≤250 lines) | Single AI call. Input: cluster suggestions + DB original + dependency matrix excerpt. Tool-schema output `{corrections[], cross_section_score, issues_found, issues_fixed}`. Reasoning HIGH. Per-section format instructions reused from `getSuggestionFormatInstruction`. |
| `supabase/functions/review-challenge-sections/index.ts` | New early-return branch `wave_action === 'harmonize_suggestions'` mirroring `consistency_check` pattern. Loads minimal challenge fields. |
| `src/hooks/useWaveExecutor.ts` | Two changes inside the wave loop (line ~194):<br>**(a)** If `wave.waveNumber === QA_WAVE_NUMBER && skipAnalysis` → mark wave `completed`, log `"QA skipped (Pass 2 — already ran in Pass 1)"`, `continue`.<br>**(b)** New branch `wave.waveNumber === HARMONIZE_WAVE_NUMBER && !pass1Only`: collect `aiSuggestion` from `HARMONIZE_CLUSTER_SECTIONS` only, skip wave if <2 suggestions, invoke edge fn, validate each correction via `validateAIOutput`, drop invalid, write valid via `setAiReview`. |
| `src/services/cogniblend/waveBatchInvoker.ts` | Add `invokeHarmonizationWave(challengeId, suggestions, context)` mirroring `invokeQaWave` shape. |

### Token-budget guards
- Cap input at 10 cluster sections (~15-20K tokens).
- If <2 cluster sections have a suggestion, skip Harmonization wave entirely (mark complete, no AI call).
- Reasoning HIGH; expected wall-time 60-80s; comfortably under 150s.

### Validation guard
Each `corrections[i].corrected_suggestion` runs through `validateAIOutput(section_key, corrected, context)`. If invalid: drop it, log via `logWarning`, leave original `aiSuggestion` intact. Never overwrite a valid suggestion with a broken one.

### Explicitly NOT changed
- ❌ Pass 1 / Pass 2 separation
- ❌ Waves 1–9 logic, prompts, schemas, batch loop, `SOLO_SECTIONS`, `MAX_BATCH_SIZE`
- ❌ `DISCOVERY_WAVE_NUMBER`, `QA_WAVE_NUMBER` constants
- ❌ `SECTION_WAVE_CONTEXT` numbering
- ❌ Accept All — still reads `aiSuggestion`
- ❌ Diagnostics row rendering — Harmonization auto-renders as new wave row
- ❌ Pass 1 QA still runs as today

### Architecture compliance
- R1: New file ≤250 lines.
- R2: All DB/edge calls in services/hooks; no Supabase in components.
- R3: Typed `HarmonizationCorrection` interface; zero `any`.
- R9: `handleMutationError` for invoke failures; `logWarning` for dropped corrections.
- Edge function: CORS, JWT-in-code, Zod-validated input, standard `{success,data,error}` shape, correlation IDs.

### Verification
1. **Pass 1 unchanged**: Discovery 10 + QA 11 fire; Harmonization does NOT.
2. **Pass 2**: Waves 1-9 run; QA 11 marked skipped instantly with log line; Wave 12 runs in 60-90s.
3. Diagnostics shows Wave 11 = "Skipped (Pass 2)" and Wave 12 = "Harmonized N sections, M corrections, K dropped".
4. Sparse Pass 2 (<2 cluster suggestions) → Wave 12 marks complete instantly, no AI call.
5. Forced corrupt response → invalid corrections dropped, originals preserved.
6. Accept All applies harmonized suggestions via existing path — zero regression.
7. Total Pass 2 wall-time: ~9 waves × ~80s + Harmonize ~70s ≈ saved ~60s vs today.

