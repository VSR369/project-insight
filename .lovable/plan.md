

# Implementation Plan: 8 Gaps from FINAL-MASTER-PLAN

## Summary

Line-by-line audit found **8 gaps** (5 functional, 3 structural) between the FINAL-MASTER-PLAN and current code. All other 34 prompts across 8 phases are correctly implemented.

---

## Gap 1 — Feature flag `use_context_intelligence` missing

The plan requires a `use_context_intelligence BOOLEAN DEFAULT false` on `ai_review_global_config` to gate all Phase 7 context intelligence features. Currently missing from DB and code — context intelligence runs unconditionally with no rollback mechanism.

**Fix:** DB migration to add the column. Edge function fetches flag and gates digest/grounding/enhanced attachments behind it. Admin toggle added.

## Gap 2 — Pass 2 tiered attachment injection not implemented

Plan requires: Tier 2 (summary + keyData always), Tier 3 (full content only for solo batches, ≤2 attachments, or missing summary). Dynamic budget: truncate if >30K tokens. Currently sends full content unconditionally.

**Fix:** Update Pass 2 attachment block with tier logic gated behind feature flag.

## Gap 3 — Pre-flight maturity-budget alignment missing

Plan requires cross-validation: Blueprint $5K–$75K, POC $5K–$200K, Pilot $25K+. Below minimum blocks AI; above range for Blueprint warns.

**Fix:** Add `checkMaturityBudgetAlignment()` to `preFlightCheck.ts`.

## Gap 4 — Pre-flight quality prediction missing

Plan requires showing prediction (95%/85%/80%/65%) based on scope+outcomes presence, plus "Add Expected Outcomes" / "Add Scope" quick-action scroll buttons.

**Fix:** Add prediction fields to `PreFlightResult`, compute in `preFlightCheck()`, display in `PreFlightGateDialog.tsx`.

## Gap 5 — Edge function fail-safes missing

Plan requires: token overflow → strip attachments fallback; timeout differentiation (60s regular, 90s solo); `finish_reason: 'length'` detection with batch split retry.

**Fix:** Add token estimation, configurable timeout, and finish_reason retry logic to `index.ts`.

## Gap 6 — ContextLibraryDrawer is 512-line monolith

Plan requires 5 components: Drawer (<120), SourceList (<250), SourceDetail (<200), DigestPanel (<100), SuggestionCard (<80).

**Fix:** Extract into `context-library/` subfolder.

## Gap 7 — SectionApprovalCard/List not extracted

`useSectionApprovals.ts` exists but the two UI components are still inline in CurationReviewPage.

**Fix:** Extract `SectionApprovalCard.tsx` and `SectionApprovalList.tsx`.

## Gap 8 — Pass 1 sends per-section attachments (should be digest-only)

Plan says Pass 1 gets digest in system prompt only. Currently sends batch-filtered attachments. Fix gated behind feature flag.

---

## Implementation Rounds

### Round 1: DB + Pre-flight Enhancements (Gaps 1, 3, 4)

| File | Change |
|------|--------|
| New migration | `ALTER TABLE ai_review_global_config ADD COLUMN use_context_intelligence BOOLEAN DEFAULT false` |
| `preFlightCheck.ts` | Add maturity-budget alignment ranges + quality prediction computation |
| `PreFlightGateDialog.tsx` | Display prediction bar + quick-action scroll buttons |

### Round 2: Edge Function Fixes (Gaps 2, 5, 8)

| File | Change |
|------|--------|
| `review-challenge-sections/index.ts` | Fetch `use_context_intelligence` flag; gate digest/grounding/attachments behind it; Pass 1 digest-only when flag ON; Pass 2 tiered attachments; token estimation + timeout config + finish_reason retry |

### Round 3: Context Library Decomposition (Gap 6)

| File | Change |
|------|--------|
| 5 new files in `context-library/` | Extract from 512-line ContextLibraryDrawer into orchestrator + 4 sub-components |
| `ContextLibraryDrawer.tsx` | Replace with thin orchestrator importing sub-components |

### Round 4: Approval Component Decomposition (Gap 7)

| File | Change |
|------|--------|
| `approval/SectionApprovalCard.tsx` | NEW — single section approval card |
| `approval/SectionApprovalList.tsx` | NEW — list with progress bar |
| `CurationReviewPage.tsx` | Import and use new components |

---

## Risk

- Rounds 1-2: Feature-flagged (default OFF). Zero impact on existing behavior.
- Rounds 3-4: Pure refactors. No functional change.
- Total files: ~14 changed/created
- Breaking changes: 0

