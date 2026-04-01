
# Gap Analysis: FINAL-MASTER-PLAN vs. Implementation

All 34 prompts across 8 phases have been implemented. However, line-by-line comparison reveals **8 gaps** — 5 functional, 3 structural.

---

## Gap 1 (FUNCTIONAL): Feature flag `use_context_intelligence` missing

**Plan says (Prompt 7.1 item 2):** Add `use_context_intelligence BOOLEAN DEFAULT false` to `ai_review_global_config`. Prompt 7.9 says all context intelligence changes are **behind this flag** — when OFF, zero changes to code paths.

**Reality:** Column does not exist in DB. Edge function runs context intelligence unconditionally (no flag check). No rollback mechanism.

**Fix:**
1. DB migration: add `use_context_intelligence BOOLEAN DEFAULT false` to `ai_review_global_config`
2. Edge function: fetch flag at start, gate digest fetch, enhanced attachment format, and grounding rule behind it
3. Admin UI: add toggle in AI Review Config global settings

---

## Gap 2 (FUNCTIONAL): Tiered attachment injection in Pass 2 not implemented

**Plan says (Prompt 7.9 FIX D):** Pass 2 uses tiered injection:
- TIER 2 (always): summary + keyData only (~350 tokens/attachment)
- TIER 3 (conditional): fullContent only when solo batch, ≤2 attachments, or no summary available
- Dynamic budget: truncate Tier 3 content if >30K tokens total

**Reality (line 690-703):** Pass 2 always sends full content for every attachment — no tiering.

**Fix:** Update Pass 2 attachment block construction with tier logic: send summary+keyData by default, conditionally include full content.

---

## Gap 3 (FUNCTIONAL): Pre-flight maturity-budget alignment check missing

**Plan says (Prompt 8.1 Part 1):** Add alignment validation:
- Blueprint: $5K–$75K acceptable
- POC: $5K–$200K acceptable  
- Pilot: $25K+ acceptable
- Below minimum → ERROR (blocks AI)
- Above range for Blueprint → WARNING

**Reality:** `preFlightCheck.ts` only checks marketplace budget > 0. No maturity-budget range validation.

**Fix:** Add `checkMaturityBudgetAlignment()` to preFlightCheck that cross-references maturity_level with budget_max and returns errors/warnings per the ranges above.

---

## Gap 4 (FUNCTIONAL): Pre-flight quality prediction missing

**Plan says (Prompt 8.1 Part 1):** Show quality prediction based on recommended section presence:
- Both scope + outcomes → 95% quality, ~2-3 sections to edit
- Outcomes only → 85%, ~5-7 sections
- Scope only → 80%, ~5-7 sections
- Neither → 65%, ~10-15 sections

Plus quick-action buttons ("Add Expected Outcomes" / "Add Scope") that scroll to those sections.

**Reality:** PreFlightResult has no quality prediction fields. PreFlightGateDialog shows no prediction or quick-action buttons.

**Fix:**
1. Add `qualityPrediction` to `PreFlightResult` interface
2. Compute prediction in `preFlightCheck()` based on scope/outcomes presence
3. Update `PreFlightGateDialog.tsx` to display prediction and render quick-action scroll buttons

---

## Gap 5 (FUNCTIONAL): Edge function fail-safes not implemented

**Plan says (Prompt 7.9):** Three fail-safes:
1. Token overflow → strip attachments, digest-only fallback
2. Timeout → 60s regular, 90s solo, retry with reduced context
3. Output truncation → detect `finish_reason: 'length'`, split batch and retry

**Reality:** No token estimation, no timeout differentiation, no finish_reason detection.

**Fix:** Add token estimation before AI call, timeout configuration per batch type, and finish_reason check with retry logic.

---

## Gap 6 (STRUCTURAL): ContextLibraryDrawer is 512 lines (monolith)

**Plan says (Prompt 7.7):** Decompose into 5 components:
1. `ContextLibraryDrawer.tsx` (<120 lines) — Sheet orchestrator
2. `ContextSourceList.tsx` (<250 lines) — left panel, grouped sources, filters
3. `ContextSourceDetail.tsx` (<200 lines) — right panel, tabs, metadata
4. `ContextDigestPanel.tsx` (<100 lines) — bottom collapsible digest
5. `ContextSuggestionCard.tsx` (<80 lines) — single AI suggestion card

**Reality:** Single 512-line file.

**Fix:** Extract into 5 files under `src/components/cogniblend/curation/context-library/`.

---

## Gap 7 (STRUCTURAL): SectionApprovalCard/List not extracted

**Plan says (Prompt 4.5):** Build 3 standalone components:
- `SectionApprovalCard.tsx` (<150 lines)
- `SectionApprovalList.tsx` (<200 lines)
- `useSectionApprovals.ts` (<100 lines)

**Reality:** `useSectionApprovals.ts` exists (extracted). But `SectionApprovalCard` and `SectionApprovalList` do not — approval UI is still inline in `CurationReviewPage.tsx`.

**Fix:** Extract approval card rendering and list with progress bar into dedicated components.

---

## Gap 8 (STRUCTURAL): Pass 1 sends per-section attachments (should be digest-only)

**Plan says (Prompt 7.9 FIX B):** "Pass 1 gets Context Digest in system prompt only — no per-section attachments."

**Reality (line 1728-1763):** Pass 1 still includes batch-filtered per-section attachments with full content.

**Fix:** When feature flag is ON, remove per-section attachment injection from Pass 1. Keep only the digest in system prompt. Attachments are reserved for Pass 2 with tiered injection.

---

## Implementation Plan (4 Implementation Rounds)

### Round 1: DB + Feature Flag + Pre-flight (Gaps 1, 3, 4)

| File | Action |
|------|--------|
| New migration | Add `use_context_intelligence` to `ai_review_global_config` |
| `src/lib/cogniblend/preFlightCheck.ts` | Add maturity-budget alignment + quality prediction |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | Show prediction + quick-action scroll buttons |

### Round 2: Edge Function Fixes (Gaps 2, 5, 8)

| File | Action |
|------|--------|
| `supabase/functions/review-challenge-sections/index.ts` | Feature flag gate, tiered Pass 2 attachments, Pass 1 digest-only, fail-safes (token estimation, timeout config, finish_reason retry) |

### Round 3: Component Decomposition — Context Library (Gap 6)

| File | Action |
|------|--------|
| `context-library/ContextLibraryDrawer.tsx` | NEW — orchestrator (<120 lines) |
| `context-library/ContextSourceList.tsx` | NEW — left panel (<250 lines) |
| `context-library/ContextSourceDetail.tsx` | NEW — right panel (<200 lines) |
| `context-library/ContextDigestPanel.tsx` | NEW — digest section (<100 lines) |
| `context-library/ContextSuggestionCard.tsx` | NEW — suggestion card (<80 lines) |
| Old `ContextLibraryDrawer.tsx` | Delete after extraction |

### Round 4: Component Decomposition — Approvals (Gap 7)

| File | Action |
|------|--------|
| `approval/SectionApprovalCard.tsx` | NEW — extract from CurationReviewPage |
| `approval/SectionApprovalList.tsx` | NEW — extract from CurationReviewPage |
| `CurationReviewPage.tsx` | Import new approval components |

---

## Risk Assessment

- **Rounds 1-2:** Feature-flagged changes. Flag defaults to OFF, so zero impact on existing behavior.
- **Rounds 3-4:** Pure structural refactors — no functional change.
- **Total files changed:** ~12
- **Breaking changes:** 0
