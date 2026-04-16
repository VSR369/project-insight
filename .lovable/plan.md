

## Critical Analysis of the Implementation Plan

### Strengths
- Well-scoped with explicit "what NOT to change" guardrails
- Identifies a real data flow break (Change 5: dedicated findings tables never written)
- Each change has clear file impact analysis and verification steps

### Gaps & Risks I'm Addressing
1. **No regression gate between changes** — original plan does 5 changes back-to-back without explicit verification checkpoints
2. **Change 4 affects 7 files spanning hooks/components/store** — too large for one prompt under R1 (250-line cap) discipline; needs splitting (types first, then consumers)
3. **Change 1 lacks a UI surface for the new fields** — without rendering `quantification`/`framework_applied` in the comment list, curators can't see the Principal-grade output (defeats the purpose)
4. **Change 5 mapping is fragile** — `contradiction_type: f.inconsistency.substring(0,50)` is a hack; should derive from severity or a dedicated AI field
5. **No telemetry dashboard** — `ai_principal_artifact_coverage` event is logged but never surfaced; should add a small admin readout
6. **Architecture alignment**: All DB writes from edge functions are fine (service role server-side). Frontend changes respect R2 (no Supabase in components — all reads via `useQualityFindings` hook already exist). Type-first refactor (Change 4 split) respects R3 (zero `any`).

### Execution Strategy: 7 Prompts with Regression Gates

Rather than 5 parallel changes, I'm sequencing 7 atomic prompts where each ends with a verification step the user runs before approving the next. This catches regressions early and keeps each prompt under the 250-line file rule.

```text
Prompt 1: Findings Persistence (live bug fix — highest priority)
   ↓ verify: findings appear in panels
Prompt 2: Structured Forcing Fields (backend schema)
   ↓ verify: telemetry log shows >50% coverage
Prompt 3: AiComment Type Definition (types only, isolated)
   ↓ verify: tsc --noEmit clean
Prompt 4: AiComment Consumer Migration (UI rendering)
   ↓ verify: comment list shows type badges + new fields
Prompt 5: Section Store Single Source of Truth (diagnostics)
   ↓ verify: edits reflect immediately in diagnostics
Prompt 6: Exemplar Audit & Upgrade (content/data only)
   ↓ verify: spot-check 3 rewritten exemplars
Prompt 7: Principal-Grade Telemetry Readout (admin visibility)
   ↓ verify: admin sees coverage % per challenge
```

---

## The 7 Prompts

### Prompt 1 — Persist Consistency & Ambiguity Findings to Dedicated Tables
**Goal:** Fix the live bug where `ConsistencyFindingsPanel` and `AmbiguityFindingsPanel` show zero because dedicated tables are never written.

**Scope:**
- Edit `supabase/functions/review-challenge-sections/index.ts` only
- After consistency pass: `delete().eq('challenge_id', id)` then `insert(rows)` into `challenge_consistency_findings`
- After ambiguity pass: same pattern for `challenge_ambiguity_findings`
- Field mapping helper extracted to top of file (not inline) for clarity
- Both writes wrapped in try/catch — non-blocking, logged via existing `console.error`
- Use `adminClient` (service role already initialized)

**Regression check:** Run AI review on a test challenge → query both tables → confirm rows present → open diagnostics → confirm panels render findings.

---

### Prompt 2 — Add Structured Forcing-Function Fields to Pass 1 Schema
**Goal:** Make Principal-grade output machine-verifiable.

**Scope:**
- `aiPass1.ts`: add `quantification`, `framework_applied`, `evidence_source` (enum), `cross_reference_verified` (array) to tool schema `comments.items.properties`. Keep `required` array unchanged (null-tolerant).
- Add backfill in response parsing: `c.quantification || null`, etc.
- Add `ai_principal_artifact_coverage` telemetry log after parsing
- `promptBuilders.ts`: update self-critique block to reference new fields
- `aiCalls.ts`: if `callAIBatchTwoPass` builds its own schema, mirror the additions

**Regression check:** Run AI review → check edge function logs → confirm `with_quantification > 50%` of `total_comments`.

---

### Prompt 3 — Define `AiComment` Interface (Types Only)
**Goal:** Establish the canonical type without touching consumers yet.

**Scope:**
- `src/types/sections.ts`: add `AiComment` interface (text, type, field, reasoning, confidence, evidence_basis, quantification, framework_applied, evidence_source, cross_reference_verified, source)
- Change `aiComments: string[] | null` → `aiComments: AiComment[] | null`
- `src/store/curationFormStore.ts`: update `setAiReview` parameter type from `string[]` to `AiComment[]`
- Update test fixtures in `curationFormStore.test.ts` (line 188: `['Comment']` → `[{ text: 'Comment', type: 'warning' }]`)

**Regression check:** `tsc --noEmit` must pass. Existing AI review still runs (data layer is JSONB — runtime unaffected).

---

### Prompt 4 — Migrate `aiComments` Consumers + Render New Fields
**Goal:** Update all readers to handle the object shape AND surface the new Principal-grade fields in the UI.

**Scope:**
- `ReviewCommentList.tsx`: render `comment.text`, type badge, and a collapsible "Evidence" footer showing `quantification` · `framework_applied` · `evidence_source`. Add legacy guard: `typeof comment === 'string' ? { text: comment, type: 'warning' } : comment`.
- `CurationRightRail.tsx`: remove `as { aiComments?: unknown[] | null }` cast; count by type (`filter(c => c.type === 'error')`) for richer badges.
- `useCurationStoreHydration.ts`: verify `currentComments` comparison is structural (length-based is fine).
- Search for any `.split`/`.includes`/`.toString` on comment entries and add guards.

**Regression check:** Open curation page → run AI review → comments show type badges and new "Evidence" footer with quantification/framework when present.

---

### Prompt 5 — Make Section Store the Single Source of Truth in Diagnostics
**Goal:** Diagnostics counts reflect curator edits in real time, not stale execution snapshots.

**Scope:**
- `DiagnosticsReviewPanel.tsx`: replace `execWave ? exec... : store...` ternary with always-store computation for `ready`/`errors`/`skipped`. Keep `executionRecord` only for timestamps and wave-level badge.
- Per-section status: drop `execSection?.status ?? entry?.reviewStatus` → use `entry?.reviewStatus ?? 'idle'` directly.
- Same pattern in `DiagnosticsSuggestionsPanel.tsx` if applicable.
- No changes to `DiagnosticsSheet.tsx`, `useDiagnosticsData.ts`, store, or sync hooks.

**Regression check:** Run AI review → open diagnostics → accept one suggestion in curation → reopen diagnostics → section shows updated status without re-running review.

---

### Prompt 6 — Audit & Upgrade 26 Section Exemplars
**Goal:** Ensure all 31 active curation exemplars meet the 5-point Principal quality bar.

**Scope:**
- New migration: UPDATE statements only on `ai_review_section_config.example_good` for sections failing 2+ tests
- Anchor narrative: GlobalTech SAP EWM logistics scenario (consistent with the 5 already-upgraded exemplars)
- Read existing 5 exemplars from migration `20260416165946` as the gold standard
- Read current 26 exemplars from migration `20260416172919` and audit each
- Skip exemplars already passing all 5 tests

**Regression check:** `SELECT section_key, LEFT(example_good, 200) FROM ai_review_section_config WHERE role_context='curation'` → spot-check 3 sections.

---

### Prompt 7 — Principal Coverage Telemetry Readout
**Goal:** Surface the `ai_principal_artifact_coverage` log as an admin-visible metric so quality is observable, not buried in logs.

**Scope:**
- New table `ai_principal_coverage_telemetry` (tenant_id, challenge_id, total_comments, with_quantification, with_framework, with_evidence_source, with_cross_ref, recorded_at) — additive, not modifying existing tables
- RLS: tenant-scoped SELECT, edge-function-only INSERT
- Edge function: write a row alongside the existing log
- New hook `useAiPrincipalCoverage(challengeId)` in `src/hooks/queries/`
- New small component `PrincipalCoverageCard` rendered inside `DiagnosticsSheet` showing latest coverage %
- All four states (loading skeleton, empty "No reviews yet", error retry, success) per R6

**Regression check:** Run AI review → open diagnostics → see coverage card with 4 percentages.

---

## Architecture Alignment Notes

| Workspace Rule | How Each Prompt Complies |
|---|---|
| R1 (≤250 lines/file) | Prompt 4 splits consumer migration; Prompt 7 introduces small component + hook, no monolith |
| R2 (layer separation) | All Supabase reads via hooks (`useQualityFindings`, new `useAiPrincipalCoverage`); edge functions own DB writes |
| R3 (no `any`) | Prompt 3 introduces `AiComment` interface; Prompt 5 removes `unknown[]` cast |
| R4 (TanStack Query) | Existing hooks reused; new Prompt 7 hook follows the standard pattern with proper invalidation |
| R6 (4 states) | Prompt 7 component implements all four; existing panels already do |
| Multi-tenancy | New telemetry table includes `tenant_id` + RLS policies |
| No `select('*')` | All new reads specify columns explicitly |

## Files Touched (Summary)

| Prompt | Files | LOC est. |
|---|---|---|
| 1 | `index.ts` | +60 |
| 2 | `aiPass1.ts`, `promptBuilders.ts`, `aiCalls.ts` | +50 |
| 3 | `sections.ts`, `curationFormStore.ts`, test | +25 |
| 4 | `ReviewCommentList.tsx`, `CurationRightRail.tsx`, `useCurationStoreHydration.ts` | ~80 |
| 5 | `DiagnosticsReviewPanel.tsx`, `DiagnosticsSuggestionsPanel.tsx` | ~30 |
| 6 | 1 new migration | ~26 UPDATEs |
| 7 | 1 migration + 1 hook + 1 component + edge function tweak | ~150 |

## Total Effort
~5–6 days as the original plan estimated, but with verification gates that catch regressions per prompt instead of at the end.

