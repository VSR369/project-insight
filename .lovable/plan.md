

# Phase 5 Gap Analysis — Wave-Based Execution + Budget Shortfall

## Overall Status: Functionally Complete (2 minor gaps)

All core infrastructure is implemented and wired into `CurationReviewPage.tsx`.

---

## Verification Checklist

| Item | Status |
|------|--------|
| Pre-flight blocks when Problem Statement empty | Done |
| Pre-flight blocks when Scope empty | Done |
| Pre-flight warns when Context/Outcomes/Deliverables empty | Done |
| "Go to [section]" buttons navigate correctly | Done |
| Wave progress UI shows 6 waves with section counts | Done |
| Waves execute sequentially (Wave 2 after Wave 1) | Done |
| Empty sections → ACTION: generate, filled → review | Done |
| Locked sections (Legal, Escrow) → ACTION: skip | Done |
| Generated content in Wave 1 used as context in Wave 2 | Done (context refreshed between waves) |
| Phase Schedule dates validated as future | Done (post-LLM validation) |
| Reward in Wave 5 respects rate card floor | Done (post-LLM validation) |
| Domain Tags in Wave 6 from master data | Done (post-LLM validation) |
| Re-review stale sections processes only stale in wave order | Done |
| Staleness clears after re-review | Done |
| Budget shortfall detected when seekerBudget < minimumReward | Done |
| Budget revision panel shows gap, strategy, actions | Done |
| Cancel button stops after current wave | Done |
| **"Accept & Send to AM" actually persists revisions + creates notification** | **Gap — toast only, no DB write** |
| **AI-generated content marked with "AI Generated" badge** | **Gap — no badge differentiation for generate vs review** |

---

## Gap 1: "Accept & Send to AM" is a stub

**Current:** `onAcceptAndSendToAM` shows a toast and clears state. No DB write.

**Fix:**
- On accept: insert a row into the `notifications` table with `type: 'budget_revision'`, the AM's `user_id`, and the revision summary in `metadata` JSONB
- Look up the AM for this challenge via the existing role/assignment data
- Apply the revised reward amount to the store's `reward_structure` section
- Mark affected sections with a "Revised — pending AM approval" flag

**Scope:** ~30 lines in `CurationReviewPage.tsx` (the `onAcceptAndSendToAM` callback) + a small Supabase insert.

## Gap 2: No "AI Generated" badge on sections that were generated (vs reviewed)

**Current:** The wave executor tracks `action: 'generate' | 'review' | 'skip'` per section but this info isn't surfaced in the section panel UI.

**Fix:**
- After wave execution, store the action type per section (e.g., in the Zustand store or a local map)
- In `CuratorSectionPanel`, when a section's action was `'generate'`, show a small "AI Generated" badge next to the section title
- Distinct from the existing "AI Reviewed" status

**Scope:** Add an `aiAction` field to `SectionStoreEntry` or a separate state map, plus a badge render in the panel header.

---

## Summary

Phase 5 is **functionally complete** — the wave engine, pre-flight gate, budget detection, and all UI components work correctly. The two gaps are:

1. **AM notification persistence** — currently a toast stub, needs a real DB insert
2. **"AI Generated" badge** — cosmetic distinction between generated and reviewed sections

Both are small, isolated fixes (~30-50 lines each). Shall I implement them?

