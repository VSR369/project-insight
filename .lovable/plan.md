
# Phase 10: AI Quality Assurance System — 8 Prompts

## Summary

3 new DB tables, 3 validators, 3 hooks, 5 new lib files, 6 new components/pages, and 7 modified files. All changes are additive — the existing AI pipeline, wave structure, curation store, and approval flow remain unchanged.

---

## Prompt 10.1 — DB Migration: 3 Tables

Single migration creating:

1. **`curation_quality_metrics`** — per-challenge quality score (UNIQUE on challenge_id), generated `ai_accuracy_percent` column, timing columns, metadata (governance_mode, maturity_level, domain_tags)
2. **`solver_challenge_feedback`** — solver clarity ratings (1-5) for overall, problem, deliverables, evaluation + optional `missing_info` text. UNIQUE on (challenge_id, solver_id)
3. **`section_example_library`** — harvested examples with section_key, quality_tier (excellent/good/poor), content, source metadata. Index on (section_key, quality_tier, is_active)

RLS: Authenticated SELECT on all. INSERT on solver_challenge_feedback with `solver_id = auth.uid()` guard. Service role writes for the other two.

---

## Prompt 10.2 — 3 New Post-LLM Validators

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/lib/cogniblend/validators/formatValidator.ts` | ~90 | Rule 6: Validate section output matches SECTION_FORMAT_CONFIG (table→JSON array, line_items→array, checkbox_single→master data) |
| `src/lib/cogniblend/validators/contradictionDetector.ts` | ~140 | Rule 7: 6 cross-section checks (budget/deliverables, maturity/deliverable type, timeline/phases, scope/deliverables trace, multi-domain split, budget/expertise) |
| `src/lib/cogniblend/validators/confidenceScorer.ts` | ~110 | Rule 8: Score 0-100 per section based on context availability, returns riskLevel (low/medium/high) |

**Edit:** `postLlmValidation.ts` — Import and call all three after existing 5 rules. Extend `ValidationResult` with optional `confidenceScore` and `contradictions` fields.

---

## Prompt 10.3 — Curator Edit Tracking

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/lib/cogniblend/editDistance.ts` | ~50 | Word-level diff: strip HTML, compute match ratio |
| `src/hooks/cogniblend/useCuratorEditTracking.ts` | ~140 | Track per-section: AI hash, curator action, edit distance, time spent, confidence score. Accumulate in memory, flush on Submit |

Tracking logic: AI hash stored on review complete. Accept without edit → `accepted_unchanged`. Edit+save → compute edit distance: <15% = `accepted_with_edits`, >=15% = `rejected_rewritten`. Time = focus→save delta.

---

## Prompt 10.4 — Quality Score + Admin Dashboard

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/lib/cogniblend/computeQualityScore.ts` | ~90 | Aggregate edit records → accuracy/assist/rewrite rates, grade A-D, INSERT to curation_quality_metrics |
| `src/hooks/queries/useAIQualityMetrics.ts` | ~80 | React Query hooks for aggregated metrics + section breakdown |
| `src/pages/admin/AIQualityDashboardPage.tsx` | ~190 | Avg accuracy, trend, worst sections, grade distribution, section heatmap, filters |

---

## Prompt 10.5 — Solver Feedback Survey

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/components/cogniblend/solver/ChallengeClarityFeedback.tsx` | ~140 | Star ratings (4 dimensions) + optional text + Submit/Skip |
| `src/hooks/cogniblend/useSolverFeedback.ts` | ~70 | Submit mutation, summary query, has-submitted check |

**Edit:** `SolutionSubmitPage.tsx` — After successful submit, show feedback card (conditional, skippable, once per solver per challenge).
**Edit:** `AIQualityDashboardPage.tsx` — Add solver feedback summary tab.

---

## Prompt 10.6 — Example Library Harvest + Admin UI

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/lib/cogniblend/harvestExamples.ts` | ~90 | Auto-harvest on publish if grade A/B + solver clarity >= 4.0. Unchanged sections → excellent, rewritten → Curator=excellent + AI=poor |
| `src/pages/admin/ExampleLibraryManagerPage.tsx` | ~190 | Table view, filters, toggle active, edit annotations, "Promote to AI Config" button |

**Edit:** `assemblePrompt.ts` (after line ~302) — Inject up to 2 dynamic examples from `section_example_library` matched by domain + maturity, after existing static examples.

---

## Prompt 10.7 — Domain Gap + Org Context Scoring

| File | Lines | Purpose |
|------|:-----:|---------|
| `src/lib/cogniblend/domainCoverageScorer.ts` | ~90 | Well-covered vs thin domain sets, returns coverage level + recommendation |
| `src/lib/cogniblend/orgContextScorer.ts` | ~70 | Scores org profile 0-100 based on 9 fields, returns missing list + recommendation |

**Edit:** `preFlightCheck.ts` — Add domain coverage as RECOMMENDED warning. Add org context score.
**Edit:** CurationReviewPage OrgContextPanel — Show org context score badge.

---

## Prompt 10.8 — Wire Into Existing Flow

| File | Change |
|------|--------|
| **New:** `AIConfidenceSummary.tsx` (~90 lines) | Right-rail card showing per-section confidence badges, high-risk sections first |
| **New:** `SectionQualityBadge.tsx` (~70 lines) | Per-section badge (green/yellow/red) + contradiction/format warnings |
| **Edit:** `CurationReviewPage.tsx` | Add AIConfidenceSummary card + SectionQualityBadge per section |
| **Edit:** `CurationActions.tsx` | On Submit, call computeQualityScore (non-blocking) |
| **Edit:** `AdminSidebar.tsx` | Add "AI Quality" link under new group |
| **Edit:** `App.tsx` | Add routes: `/admin/ai-quality`, `/admin/ai-quality/examples` |

---

## Unchanged Systems

AI pipeline, wave executor, two-pass architecture, section renderers, curation Zustand store, approval flow, governance model, Context Intelligence, legal/escrow gates.
