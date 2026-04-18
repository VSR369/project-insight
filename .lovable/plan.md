

## Final Aligned Test Plan v2 — 53 tests, all 8 gaps closed

### Strategy unchanged
3-layer suite (Vitest L1 + Deno L2 + Smoke runner L3) + manual residual checklist. All 8 missed scenarios slot into existing L1/L2 files — no new layer, no smoke-runner changes.

### Gap closures — exactly where each lives

| Gap | Test | Layer | File | Method |
|---|---|---|---|---|
| **A5** NO_DRAFT skip | `determineSectionAction()` returns `'skip'` for empty NO_DRAFT sections, `'analyze'` when populated | L1 | `waveConfig.test.ts` (+ may need `sectionActionResolver.test.ts` if logic lives elsewhere) | Unit test the resolver with synthetic context |
| **B5** Comment structure | Every Pass 1 comment has `type`, `confidence`, `evidence_basis`, `severity` keys and valid enum values | L2 | `passResilience_test.ts` | Mock AI gateway returning canned Pass 1 output → assert schema |
| **C4** Summary-only injection | When `digest.summary` exists, Pass 2 prompt contains summary but NOT raw content | L2 | `passResilience_test.ts` | Spy on prompt builder → assert raw absent |
| **C7** Action label "Suggest" | Pass 2 diagnostics row shows "Suggest" not "Review" | L1 | `src/components/cogniblend/diagnostics/__tests__/DiagnosticsRow.test.tsx` (new, ~40 lines) | RTL render with Pass 2 row state → assert label |
| **D2** Harmonization payload | Harmonization request body contains ONLY cluster sections, not all 22 | L2 | `passResilience_test.ts` | Spy on harmonization fetch → assert section count |
| **D3** Harmonization skip <2 | When cluster has <2 sections with suggestions, harmonization is NOT called | L2 | `passResilience_test.ts` | Spy → assert zero invocations |
| **G4** Accept All graceful | `bulkAcceptHelpers.partitionSuggestionsForBulkAccept` skips entries without `aiSuggestion` and never throws | L1 | `src/lib/cogniblend/__tests__/bulkAcceptHelpers.test.ts` (new, ~50 lines) | Feed partial suggestions → assert correct partition + no throw |
| **I5** Pass 2 without Pass 1 | Edge function rejects Pass 2 invocation when no Pass 1 comments exist for the wave | L2 | `passResilience_test.ts` | POST with empty `provided_comments` + `skip_analysis: true` → assert 400 with `VALIDATION_ERROR` |

### Final file inventory — 11 files (~880 lines total)

**L1 — Vitest (~410 lines)**
1. `src/lib/cogniblend/__tests__/waveConfig.test.ts` (~100) — A1–A5, J1–J3
2. `src/services/cogniblend/__tests__/waveBatchInvoker.test.ts` (~80) — E2, E3
3. `src/lib/cogniblend/validators/__tests__/formatValidator.test.ts` (~60) — C10, G2
4. `src/lib/cogniblend/__tests__/parseSuggestion.test.ts` (~50) — C10
5. `src/lib/cogniblend/__tests__/bulkAcceptHelpers.test.ts` (~50) — **G4 (new)**
6. `src/components/cogniblend/diagnostics/__tests__/DiagnosticsRow.test.tsx` (~40) — **C7 (new)**
7. `src/lib/cogniblend/__tests__/sectionActionResolver.test.ts` (~30, only if A5 logic isn't inside `waveConfig`) — **A5 (new)**

**L2 — Deno (~300 lines)**
8. `supabase/functions/_shared/safeJsonParse_test.ts` (~110) — B3, C5
9. `supabase/functions/review-challenge-sections/passResilience_test.ts` (~190) — B2, B5, C2, C3, C4, C6, D2, D3, E1, E5, I5

**L3 — Smoke (~210 lines)**
10. `supabase/functions/ai-review-smoke-test/index.ts` (~120) — B1, B6–B8, C1, C8, D1, D5, F1, H1–H5, I1, I3
11. `src/components/admin/diagnostics/AIReviewSmokeTestPanel.tsx` (~60) + `useAiReviewSmokeTest.ts` (~30) — admin UI + hook

### Coverage scoreboard (updated)
| Status | Before | After |
|---|---|---|
| ✅ Automated | 28 / 45 | **36 / 53** (+8 closed gaps) |
| ⚠️ Manual residual | 9 / 45 | 9 / 53 (B4, C9, D4, F1, F2, F6, G1, G3, I4, I6, J4) — visual UX only |
| ❌ Gap | 8 / 45 | **0 / 53** |

### What is NOT touched
- ❌ No new business logic
- ❌ No DB schema or RLS changes
- ❌ No prompt or model changes
- ❌ No edge function behavior changes — Pass 1, Pass 2, harmonization, backoff all unchanged
- ❌ No production traffic interception — synthetic mocks + read-only fixture only

### Architecture compliance (R1–R12)
- R1: every file <250 lines (decomposed)
- R2: panel → hook → edge fn; no DB calls in components
- R3: zero `any` — `SmokeTestResult` typed in `src/types/diagnostics.ts`
- R4: smoke result via TanStack Query mutation; no Context/Zustand
- R5: hook order respected in panel
- R6: panel has loading skeleton + empty + error w/ correlation ID + success
- R8: panel uses `lg:` breakpoint
- R9: zero `console.*`; `handleMutationError` everywhere; correlation IDs in edge fn
- R11: panel lazy-loaded under `/admin/seeker-config/ai-review/smoke-test`
- Multi-tenant: smoke fixture is platform-global; admin panel behind `AdminGuard`

### Manual checklist preserved
Uploaded `AI_CURATOR_PRODUCTION_TEST_PLAN.md` → moved to `docs/qa/ai-curator-production-test-plan.md`. The 9 `[MANUAL]` items are visual-only acceptance gates (e.g., toast appearance, live diagnostics tick rate, cross-tab behavior) — explicitly out of automation scope.

### Go/No-Go gating
Smoke runner returns `{ goNoGo: 'GO' | 'NO_GO' | 'WARN' }` per the criteria in the uploaded doc (lines 478–493). Surfaced as a coloured badge in the panel header — single deterministic verdict per run.

This plan now closes every documented failure mode (NO_DRAFT mis-skip, harmonization payload bloat, Accept-All crashes, Pass-2-without-Pass-1, action-label drift, comment-shape drift, summary-injection regression) before any reach production.

