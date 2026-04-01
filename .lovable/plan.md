# Phase 10: AI Quality Assurance System

8 prompts delivering a self-improving quality loop: post-LLM validation, curator edit tracking, quality scoring, solver feedback, example harvesting, domain/org gap detection, and full wiring.

---

## Prompt 10.1 — DB Migration: 3 Quality Tracking Tables

Create a single migration with:

**Table 1: `curation_quality_metrics`**
- Per-challenge quality score computed after Curator finishes
- Columns: `id`, `challenge_id` (UNIQUE FK), `sections_accepted_unchanged`, `sections_accepted_with_edits`, `sections_rejected_rewritten`, `total_sections` (default 27), `ai_accuracy_percent` (generated stored), `section_edit_details` (JSONB), timing columns, metadata columns (`governance_mode`, `maturity_level`, `domain_tags`), `computed_at`

**Table 2: `solver_challenge_feedback`**
- Solver rates challenge clarity after submission
- Columns: `id`, `challenge_id` (FK), `solver_id` (FK to auth.users), `overall_clarity` (1-5), `problem_clarity`, `deliverables_clarity`, `evaluation_clarity`, `missing_info` (text), `created_at`
- UNIQUE on `(challenge_id, solver_id)`

**Table 3: `section_example_library`**
- Harvested real examples from published challenges
- Columns: `id`, `section_key`, `quality_tier` (CHECK: excellent/good/poor), `content`, `source_challenge_id`, `domain_tags`, `maturity_level`, `budget_range`, `why_good_or_bad`, `is_active`, `created_at`
- Index: `idx_sel_section(section_key, quality_tier, is_active)`

**RLS:** Enable on all three. Authenticated users can SELECT. Service role manages writes. INSERT on solver_challenge_feedback for authenticated users (with `solver_id = auth.uid()` guard).

---

## Prompt 10.2 — Enhanced Post-LLM Validation (3 New Rules)

### Rule 6 — Format Validator
**New file:** `src/lib/cogniblend/validators/formatValidator.ts` (~90 lines)
- Import `SECTION_FORMAT_CONFIG` from `curationSectionFormats`
- For `table` format sections: verify valid JSON array, attempt parse from markdown fences
- For `schedule_table`: verify required fields (name, durationDays, startDate, endDate)
- For `line_items`: verify JSON array, auto-convert bullet strings to array
- For `checkbox_single`: verify value in master data options
- Returns `{ isValid, corrections[] }`

### Rule 7 — Contradiction Detector
**New file:** `src/lib/cogniblend/validators/contradictionDetector.ts` (~140 lines)
- Input: all section contents from curation store
- 6 checks: Budget vs Deliverables count, Maturity vs Deliverable type, Timeline vs Phase count, Scope vs Deliverables traceability, Multi-domain detection, Budget vs Expertise mismatch
- Returns array of `{ check, severity, message, sections_involved[] }`

### Rule 8 — AI Confidence Scorer
**New file:** `src/lib/cogniblend/validators/confidenceScorer.ts` (~110 lines)
- Scores each section 0-100 based on: Creator input (+30), reference materials (+20), context digest (+15), master data constrained (+20), rich_text unconstrained (-10), strong domain (+15), niche domain (-15)
- Returns `{ score, riskLevel: 'low'|'medium'|'high', reason }`

### Wire into existing
**Edit:** `src/lib/cogniblend/postLlmValidation.ts` — Add Rules 6, 7, 8 after existing 5 rules. Import the 3 new validators. Extend `ValidationResult` type with optional `confidenceScore` and `contradictions` fields.

---

## Prompt 10.3 — Curator Edit Tracking (Booster 1)

**New file:** `src/hooks/cogniblend/useCuratorEditTracking.ts` (~140 lines)
- Tracks per-section: `ai_action`, `curator_action` (accepted_unchanged / accepted_with_edits / rejected_rewritten), `ai_suggestion_hash`, `final_content_hash`, `edit_distance_percent`, `time_spent_seconds`, `confidence_score`, `format_fixes_needed`, `contradictions_found`
- On AI review complete: store `ai_suggestion_hash` (simple hash of AI output)
- On Curator Accept without edit: `accepted_unchanged`
- On Curator edit+save: compute edit distance. `<15%` → `accepted_with_edits`, `>=15%` → `rejected_rewritten`
- Time tracking: record focus timestamp, compute diff on save
- Accumulate in memory; flush on Submit via `computeQualityScore`

**New file:** `src/lib/cogniblend/editDistance.ts` (~50 lines)
- Word-level diff ratio: strip HTML, split words, compute match ratio
- `computeEditPercent(original, edited): number` (0 = unchanged, 100 = rewritten)

---

## Prompt 10.4 — Quality Score Computation + Admin Dashboard

### Part 1: Quality Score
**New file:** `src/lib/cogniblend/computeQualityScore.ts` (~90 lines)
- Input: accumulated SectionEditRecords from useCuratorEditTracking
- Computes: `ai_accuracy`, `ai_assist_rate`, `curator_rewrite_rate`, `avg_edit_distance`, `avg_confidence_score`, `format_fix_count`, `contradiction_count`, `total_curation_minutes`, `grade` (A/B/C/D)
- INSERTs into `curation_quality_metrics`

### Part 2: Admin Dashboard
**New file:** `src/pages/admin/AIQualityDashboardPage.tsx` (~190 lines)
- Queries `curation_quality_metrics` aggregated across challenges
- Shows: Average AI accuracy %, trend (last 30 challenges), worst-performing sections, quality grade distribution
- Section heatmap: 27 sections color-coded (green=accepted, red=rewritten)
- Filters: governance mode, domain, maturity level, time period

**New file:** `src/hooks/queries/useAIQualityMetrics.ts` (~80 lines)
- `useAIQualityMetrics(filters)` — aggregated query
- `useAIQualitySectionBreakdown()` — per-section stats

---

## Prompt 10.5 — Solver Feedback Survey (Booster 4)

### Part 1: Feedback Component
**New file:** `src/components/cogniblend/solver/ChallengeClarityFeedback.tsx` (~140 lines)
- Star ratings (1-5) for: overall clarity, problem statement, deliverables, evaluation criteria
- Optional text: "What was missing or unclear?"
- Submit + Skip buttons

### Part 2: Hook
**New file:** `src/hooks/cogniblend/useSolverFeedback.ts` (~70 lines)
- `useSubmitFeedback(challengeId)` mutation → INSERT into `solver_challenge_feedback`
- `useChallengeFeedbackSummary(challengeId)` query → aggregated ratings
- `useHasSubmittedFeedback(challengeId, solverId)` → boolean check

### Part 3: Wire into solver flow
**Edit:** `src/pages/cogniblend/SolutionSubmitPage.tsx` — After successful solution submit, show `ChallengeClarityFeedback` card. Conditional: only if solver hasn't already submitted feedback. Non-blocking (can skip).

### Part 4: Admin integration
**Edit:** `src/pages/admin/AIQualityDashboardPage.tsx` — Add solver feedback summary tab: average clarity scores, challenges with <3.0 flagged.

---

## Prompt 10.6 — Example Library Auto-Harvest + Admin UI (Booster 2)

### Part 1: Harvest Logic
**New file:** `src/lib/cogniblend/harvestExamples.ts` (~90 lines)
- Called after challenge published AND quality grade A/B AND solver clarity >= 4.0
- For unchanged sections → `excellent` example
- For fully rewritten sections → Curator version = `excellent`, AI version = `poor`
- Stores in `section_example_library` with metadata

### Part 2: Admin UI
**New file:** `src/pages/admin/ExampleLibraryManagerPage.tsx` (~190 lines)
- Table view of examples grouped by section
- Admin can: toggle is_active, edit annotations, delete
- Filters: section, quality tier, domain, maturity
- "Promote to AI Config" button: copies example to `ai_review_section_config.example_good`

### Part 3: Wire into AI prompts
**Edit:** `src/lib/cogniblend/assemblePrompt.ts` (lines ~285-302) — After existing example injection, add dynamic examples from `section_example_library` matched by domain + maturity. Limit to 2 most relevant. Requires a new helper `fetchRelevantExamples()` in a small utility file.

---

## Prompt 10.7 — Domain Gap Detector + Org Context Enrichment (Risk 1 + Risk 2)

### Part 1: Domain Coverage Scorer
**New file:** `src/lib/cogniblend/domainCoverageScorer.ts` (~90 lines)
- `WELL_COVERED_DOMAINS` set (11 domains)
- `THIN_DOMAINS` set (8 niche domains)
- `scoreDomainCoverage(domainTags): { coverage, message, recommendation }`
- Wire into `preFlightCheck.ts` as a new RECOMMENDED warning item

### Part 2: Org Context Scorer
**New file:** `src/lib/cogniblend/orgContextScorer.ts` (~70 lines)
- Scores org profile completeness 0-100 based on: name, website, industry, country, description length, employee count, revenue, LinkedIn, functional areas
- Returns `{ score, missing[], recommendation }`
- Wire into pre-flight check panel
- Add score badge to existing OrgContextPanel on CurationReviewPage

---

## Prompt 10.8 — Wire Everything Into Existing Curator Flow

### 1. AI Confidence Summary Card
**New file:** `src/components/cogniblend/curation/AIConfidenceSummary.tsx` (~90 lines)
- Shows per-section confidence badges from confidenceScorer
- High Risk sections listed first with warning text
- Placed in CurationReviewPage right rail after AI Quality card

### 2. Per-Section Quality Badge
**New file:** `src/components/cogniblend/curation/SectionQualityBadge.tsx` (~70 lines)
- Confidence badge (green/yellow/red circle)
- Contradiction warnings
- Format fix indicator
- Placed after AI review result in CuratorSectionPanel

### 3. CurationActions Submit Integration
**Edit:** `src/components/cogniblend/curation/CurationActions.tsx` — On Submit, call `computeQualityScore` with accumulated edit records. INSERT into `curation_quality_metrics`. Non-blocking — submit proceeds even if quality save fails.

### 4. Admin Navigation
**Edit:** `src/components/admin/AdminSidebar.tsx` — Add "AI Quality" link to sidebar under a new "AI Quality" group, pointing to `/admin/ai-quality`
**Edit:** `src/App.tsx` — Add route: `<Route path="ai-quality" element={<PermissionGuard permissionKey="supervisor.configure_system"><AIQualityDashboardPage /></PermissionGuard>} />`
Also add route for Example Library: `<Route path="ai-quality/examples" element={...}>`

---

## Files Summary

| Type | Count | Files |
|------|:-----:|-------|
| DB Migration | 1 | 3 tables + RLS + indexes |
| New validators | 3 | formatValidator, contradictionDetector, confidenceScorer |
| New hooks | 3 | useCuratorEditTracking, useSolverFeedback, useAIQualityMetrics |
| New lib files | 4 | editDistance, computeQualityScore, domainCoverageScorer, orgContextScorer, harvestExamples |
| New components | 4 | AIConfidenceSummary, SectionQualityBadge, ChallengeClarityFeedback, (admin pages) |
| New pages | 2 | AIQualityDashboardPage, ExampleLibraryManagerPage |
| Modified files | 7 | postLlmValidation, preFlightCheck, CurationReviewPage, CurationActions, assemblePrompt, SolutionSubmitPage, AdminSidebar + App.tsx |

## What Does NOT Change

AI pipeline, wave structure, two-pass architecture, section renderers, curation store, approval flow, governance model, Context Intelligence System — all remain unchanged.