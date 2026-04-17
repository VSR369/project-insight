

## Final Implementation Plan: 9-Wave Restructure with Corrected Dependencies

The reviewer is right on both violations. Validated against `DIRECT_DEPENDENCIES` in `src/lib/cogniblend/sectionDependencies.ts`:

- `ip_model` depends on `reward_structure` → cannot share Wave 8 with it (SOLO output isn't visible to same-call regular batch since `challengeData` is snapshotted at edge-call entry).
- `solver_expertise` depends on `domain_tags` → `domain_tags` must land before Wave 6.

Both corrections accepted. Final structure below.

### Final wave structure

| Wave | Sections | Sub-batches | Worst-case @ HIGH |
|---|---|---|---|
| 1 | problem_statement, scope, context_and_background | 1 reg | ~50s |
| 2 | expected_outcomes, root_causes, affected_stakeholders | 1 reg | ~50s |
| 3 | current_deficiencies, preferred_approach, solution_type | 1 reg | ~50s |
| 4 | **deliverables (SOLO)** | 1 SOLO | ~50s |
| 5 | maturity_level, data_resources_provided, domain_tags | 1 reg | ~50s |
| 6 | complexity (parallel), success_metrics_kpis + **solver_expertise (SOLO)** | 1 reg + 1 SOLO | ~100s |
| 7 | eligibility, phase_schedule + **evaluation_criteria (SOLO)** | 1 reg + 1 SOLO | ~100s |
| 8 | submission_guidelines + **reward_structure (SOLO)** | 1 reg + 1 SOLO | ~100s |
| 9 | ip_model, hook, visibility | 1 reg | ~50s |
| 10 | Discovery (Pass 1 only, dynamic) | special | ~varies |
| 11 | QA (consistency + ambiguity) | special | ~60s |

Every wave ≤ 2 sequential sub-batches. Every sub-batch < 60s. Every dependency satisfied by a strictly earlier wave.

### Implementation — 4 files, no edge function logic changes

| File | Change |
|---|---|
| `src/lib/cogniblend/waveConfig.ts` | Replace `EXECUTION_WAVES` with the 9-content-wave structure above. Set `DISCOVERY_WAVE_NUMBER = 10`, `QA_WAVE_NUMBER = 11`. Keep `BATCH_EXCLUDE_SECTIONS`, `SOLO_SECTIONS`, `MAX_BATCH_SIZE`, `NO_DRAFT_SECTIONS`, `REASONING_HIGH` untouched. Omit excluded sections from wave membership entirely (cleaner than filtering later). Omit `approaches_not_of_interest` (NO_DRAFT, picked up by `reReviewStale` if curator fills it). |
| `supabase/functions/review-challenge-sections/contextIntelligence.ts` | Update `SECTION_WAVE_CONTEXT[*].wave` numbers to match the new wave assignments — this string grounds AI prompts; misalignment degrades reasoning quality. |
| `src/hooks/useWaveExecutor.ts` | Verify `createInitialWaveProgress` + `createInitialWaveProgressWithDiscovery` produce 9 content waves + Discovery(10) + QA(11). Adjust any hard-coded wave-count logic. |
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | Verify dynamic iteration over `progress.waves` still renders correctly; confirm Discovery + QA detection uses constants (not hard-coded numbers). |

### Explicitly NOT doing
- ❌ Splitting Pass 1 / Pass 2 (already separate via `pass1_only` / `skip_analysis`)
- ❌ Lowering `MAX_BATCH_SIZE` (creates more sub-batches)
- ❌ Parallel sub-batches via `Promise.allSettled` (re-triggers 546 WORKER_RESOURCE_LIMIT)
- ❌ Lowering reasoning effort
- ❌ Renaming `'review'`/`'generate'` actions
- ❌ Edge function logic / prompt / schema / model changes
- ❌ Background job queue (revisit only if waves still exceed budget)

### Verification
1. **Re-analyse** → all 9 content waves complete in 50–100s each. No 504. No 546.
2. **Generate Suggestions** → same 9 waves, Pass 2 only, same time profile.
3. Diagnostics drawer shows live wave-by-wave Pass 1 then Pass 2 progress (already wired via `cogni-wave-exec-changed`).
4. Wave 10 (Discovery) and Wave 11 (QA) execute correctly.
5. AI suggestions for `ip_model` reference `reward_structure`; suggestions for `solver_expertise` reference `domain_tags` — proves dependency ordering reached the prompt.
6. Telemetry trend keeps prior runs; principal-grade compliance holds.

