

## Bug Fix Implementation Plan — 4 Phases, 8 Bugs

**Audit findings vs. plan claims:**
- ✅ **Bug 8** (single source of truth) — already done in `DiagnosticsReviewPanel.tsx` (lines 71–75 use store only). Only the Pass-1 success-path label and panel title remain to fix.
- ❌ **Bug 2** (findings persistence) — NOT implemented. `index.ts` lines 1144–1194 only push to `_consistency_check`/`_ambiguity_check` pseudo-sections; no DB writes to `challenge_consistency_findings` / `challenge_ambiguity_findings`. Prior summary was incorrect — this still needs to be done.
- All other bugs verified present.

---

### Phase 1 — Edge-Function Fixes (Bugs 2, 3, 4)
*All edits server-side; lowest blast radius. Edge functions auto-deploy.*

**1.1 — Findings persistence** → `supabase/functions/review-challenge-sections/index.ts`
- Import `ConsistencyFinding` / `AmbiguityFinding` types.
- After line 1167 (consistency push): delete-then-insert into `challenge_consistency_findings`. Map `source_section→section_a`, `target_section→section_b`, truncate `inconsistency` to 100 chars for `contradiction_type`, full text → `description`, `severity`, `resolution→suggested_resolution`.
- After line 1193 (ambiguity push): delete-then-insert into `challenge_ambiguity_findings`. Map `section_key`, `ambiguous_text→snippet` (≤500 chars), `ambiguity_type→pattern_matched`, `clarified_alternative→suggested_replacement`.
- Both blocks gated by `!isPreviewMode` and wrapped in try/catch (non-blocking).
- Pseudo-section pushes left intact (telemetry).

**1.2 — Outcome acceptance criteria** → `promptConstants.ts` line 112
- Replace `expected_outcomes` instruction with a JSON-array-of-objects spec (`name`, `description`, `acceptance_criteria` all required).

**1.3 — Phase schedule names** → `promptConstants.ts` line 114
- Strengthen `phase_schedule` instruction: REQUIRED descriptive `phase_name` (examples), forbid empty/`—`. Keep all other keys.
- Also update format dispatcher line 49 (`schedule_table`) for consistency.

---

### Phase 2 — UI Display Fixes (Bugs 1, 3-UI, 6, 7)
*Component-only changes. No data-layer impact.*

**2.1 — Diagnostics labels (Bug 1)**
- `DiagnosticsReviewPanel.tsx` lines 116–118: replace generate/review label with single `'Analysed'`. Title (line 44) → `Pass 1 — Analysis`.
- `DiagnosticsSuggestionsPanel.tsx` line 155: change `'AI Content Drafted & Suggestions Generated'` → `'AI Content Generated'` and line 157 → `'AI Suggestion Ready'`. Removes the "Drafted" leakage from Pass 1 vocabulary.

**2.2 — Outcome acceptance criteria UI (Bug 3)**
- `SuggestionVersionDisplay.tsx` line 196: change `hideAcceptanceCriteria={badgePrefix === "O" || badgePrefix === "S"}` → `hideAcceptanceCriteria={badgePrefix === "S"}`.
- `renderProblemSections.tsx` line 109 (`expected_outcomes` view): remove `hideAcceptanceCriteria` so accepted outcomes display the criteria. Keep line 82 (`submission_guidelines`) untouched.
- Update `getExpectedOutcomeObjects` if it strips `acceptance_criteria` — verify in Phase 4 QA.

**2.3 — Empty placeholder cleanup (Bug 6)**
- `LineItemsSectionRenderer.tsx` view-mode block (lines 81–94): filter empties before rendering — drop nulls, blank strings, and structured items with empty `name`/`text`/`description`.
- No edit-mode change (Add Item must remain functional).
- The "+N more" truncation isn't in this renderer — defer the 5→10 expand toggle to a later polish prompt unless we find it during QA.

**2.4 — Reward tier auto-enable (Bug 7)**
- `normalizeAIContent.ts` `normalizeRewardStructure`: after the `tierRecord` build (line 67), add a sync step that ensures any tier with `amount > 0` is treated as enabled. Since the current shape is `{ tiers: { platinum: 75000, ... } }` (numeric record, not objects with `enabled`), the fix is to ensure the downstream `applyAIReviewResult` call receives the full populated record so the display component's "enabled" derivation matches the breakdown table. Add a defensive log if a previously-disabled tier has a positive amount.

---

### Phase 3 — Acceptance Failure Visibility (Bug 5)
*Cross-component wiring; needs state lift.*

**3.1 — Lift `diagnosticsOpen` state**
- Move `useState` from `CurationRightRail.tsx` line 86 up to `useCurationPageOrchestrator` (return both setter and value via the orchestrator's existing return).
- `CurationReviewPage` passes the state into `CurationRightRail` as a prop.

**3.2 — Auto-open diagnostics on Accept-All failure**
- `useCurationPageOrchestrator.ts` line 328: when `totalFailed > 0`, call the lifted `setDiagnosticsOpen(true)` and update toast text to "…Opening diagnostics for details" (5s duration).
- Skip `navigate()` to preview when there are failures — the curator stays on the review page so the auto-opened diagnostics remains visible.

**3.3 — Per-row Retry button**
- `DiagnosticsAcceptancePanel.tsx`: add optional `onReReviewSection?: (sectionId: string) => void` prop. For rows where `s.status === 'failed'`, render a small ghost "Retry" button.
- Wire from `DiagnosticsSheet` → `useCurationAIActions` (existing single-section review path).
- Files stay <250 lines (current sizes: 111 / 408 / 192 — Phase 3 keeps orchestrator under limit since net add is ~6 lines).

---

### Phase 4 — Verification & QA

| Bug | Verification |
|----|----|
| 1 | Diagnostics shows "Analysed" / "AI Content Generated" / "AI Suggestion Ready" |
| 2 | `select count(*) from challenge_consistency_findings/challenge_ambiguity_findings where challenge_id=…` > 0; QualityScoreSummary shows non-zero |
| 3 | Re-run review → outcome cards show acceptance_criteria |
| 4 | Re-run review → phase_schedule has descriptive names, never `—` |
| 5 | Force-fail one section → diagnostics auto-opens, Retry button works |
| 6 | View challenge with empty trailing `current_deficiencies` item → not rendered |
| 7 | Reward suggestion with all 3 tiers → all show "Enabled" |
| 8 | Already verified — counts derive from store; accept one suggestion → diagnostics count updates |

---

## Files Touched (Summary)

| File | Phase | Lines Changed |
|---|---|---|
| `supabase/functions/review-challenge-sections/index.ts` | 1.1 | +~50 |
| `supabase/functions/review-challenge-sections/promptConstants.ts` | 1.2, 1.3 | ~6 |
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | 2.1 | ~6 |
| `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | 2.1 | ~3 |
| `src/components/cogniblend/curation/ai-review/SuggestionVersionDisplay.tsx` | 2.2 | 1 |
| `src/components/cogniblend/curation/renderers/renderProblemSections.tsx` | 2.2 | 1 |
| `src/components/cogniblend/curation/renderers/LineItemsSectionRenderer.tsx` | 2.3 | ~12 |
| `src/lib/cogniblend/normalizeAIContent.ts` | 2.4 | ~10 |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | 3.1, 3.2 | ~10 |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | 3.1 | ~3 |
| `src/pages/cogniblend/CurationReviewPage.tsx` | 3.1 | ~2 prop wires |
| `src/components/cogniblend/diagnostics/DiagnosticsAcceptancePanel.tsx` | 3.3 | ~10 |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | 3.3 | ~4 |

**Constraints honored:** No new files, no schema changes, no architecture changes, every touched component remains <250 lines (largest is `useCurationPageOrchestrator` at 408 — already a hook, not a component, exempt from R1's component limit but kept compact).

**Ripple-effect notes:** 
1. Bug 3 prompt change produces structured outcome objects — `getExpectedOutcomeObjects` in `curationHelpers.ts` already handles object form (used by deliverables) so existing UI is forward-compatible, but Phase 4 includes explicit verification of the parser.
2. Bug 1 label changes are pure text — no logic depends on the old strings.
3. Bug 5 state lift slightly grows the orchestrator return shape; only `CurationReviewPage` consumes it.
4. Findings DB writes (Bug 2) use admin client (already in scope) and are non-blocking — no impact on existing review pipeline.

