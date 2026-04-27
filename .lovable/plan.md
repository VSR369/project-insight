# Phase 9 v4b — Remediation Plan

## Verdict on Claude's audit

I verified Claude's three substantive findings against the actual code. **All three are real and material:**

| # | Finding | Status |
|---|---------|--------|
| 1 | `SIGNATORY_MATRIX` in `amendmentScopeService.ts` (lines 114–122) contradicts the spec table at `docs/Legal_Module_Feature_Matrix.md` line 125–127 | **CONFIRMED BUG** |
| 2 | `shouldRequireSolverReacceptance` (line 162) excludes FINANCIAL/ESCROW; spec marks them "yes (material)" | **CONFIRMED BUG** |
| 3 | Spec state diagram (line 107–110) shows `IN_REVIEW` for CONTROLLED, but no SQL migration emits this state. `complete_phase` sets `phase_status='ACTIVE'` regardless of governance mode | **CONFIRMED — three-way disagreement** |

The other observations Claude made (Prompts 1–3, concurrency index, governance escalation guard, scope normalizer, Prompt 4 partial) are correctly described as already shipped — those need no work.

What Claude **did not** flag, but is also worth a small note: `amendmentVersionBinding.ts` already correctly handles re-resolution of templates and writes version-pinned ledger rows for LC/FC/CR. That part of the previous remediation stands; it just operates on the wrong signatory set today because it pulls from `SIGNATORY_MATRIX` indirectly through `isLegalScope` / `isFinanceScope`.

---

## Decisions to make before coding

### Decision A — IN_REVIEW state: real or fictional?

The spec promises a state machine with `IN_REVIEW`. The code uses **flag-based gating** (`lc_review_required`, `fc_review_required` columns) instead of state-based gating. Two ways to reconcile:

- **Option A1 — Implement IN_REVIEW (state-based gating)**: Add `IN_REVIEW` to the allowed `master_status` set, patch `complete_phase` to transition CONTROLLED challenges to `IN_REVIEW` after curator approval, patch `complete_legal_review` to transition `IN_REVIEW → ACTIVE` once both LC and FC have approved. Higher blast radius (touches dashboards, queue filters, badges, status pills, sidebar visibility logic, RLS that filters on master_status).
- **Option A2 — Remove IN_REVIEW from spec (accept flag-based gating)**: Update `docs/Legal_Module_Feature_Matrix.md` to describe the actual mechanism (curator approval flips status to `ACTIVE` but `lc_review_required=TRUE`/`fc_review_required=TRUE` flags gate downstream actions until cleared). Lower blast radius. Honest documentation.

**Recommendation: A2.** The flag-based mechanism already works, is already audited (Prompt 2 made the columns nullable so the meaning is unambiguous), and matches what every dashboard query already expects. State-based gating would be cleaner architecturally but requires touching every consumer of `master_status` and risks regressing live CONTROLLED challenges. We can capture A1 as a deferred enhancement in `docs/qa`.

I'll proceed with A2 unless you direct otherwise.

### Decision B — `OTHER` and `EDITORIAL` rows in the corrected matrix

Claude's recommended matrix is an "all-yes" expansion. The spec table actually has nuance:
- `EDITORIAL`: no for everyone (informational only) — keep as-is.
- `OTHER`: spec says "conservative: no" for LC/FC, "yes" for CR, "conservative: no" for SP — keep code conservative.
- `GOVERNANCE_CHANGE`: spec says "yes (newly enqueued, initial)" for LC/FC, "yes" for SP — code currently omits SP, will be added.

So the corrected matrix is **not** "add LC/FC/SP to every row". It is targeted edits to LEGAL, FINANCIAL, ESCROW, and GOVERNANCE_CHANGE only.

---

## Scope of changes

### 1. Fix `SIGNATORY_MATRIX` to match the spec

File: `src/services/legal/amendmentScopeService.ts`

```text
LEGAL:             ['LC','CR','SP']     →  ['LC','FC','CR','SP']
FINANCIAL:         ['FC','CR']          →  ['LC','FC','CR','SP']
ESCROW:            ['FC','CR']          →  ['LC','FC','CR','SP']
SCOPE_CHANGE:      ['CR','SP']          →  unchanged
GOVERNANCE_CHANGE: ['LC','FC','CR']     →  ['LC','FC','CR','SP']
EDITORIAL:         []                   →  unchanged
OTHER:             ['CR']               →  unchanged
```

Update the matrix-rationale comment block (lines 105–113) to reflect the new mapping and reference §5 of the feature matrix as the canonical source.

### 2. Fix `shouldRequireSolverReacceptance` to include material financial/escrow/governance changes

File: `src/services/legal/amendmentScopeService.ts` (line 159–163)

```ts
return scopes.includes('LEGAL')
  || scopes.includes('SCOPE_CHANGE')
  || scopes.includes('FINANCIAL')
  || scopes.includes('ESCROW')
  || scopes.includes('GOVERNANCE_CHANGE');
```

This aligns SP re-accept with `isMaterialAmendment`'s superset (which already includes FINANCIAL and GOVERNANCE_CHANGE) plus ESCROW. Net effect: every material amendment now triggers SP re-accept, which is what the spec promises.

### 3. Update tests to assert the corrected matrix

File: `src/services/legal/__tests__/amendmentScopeService.test.ts`
- Lines 45–51: update LEGAL, FINANCIAL, ESCROW expectations.
- Add an explicit GOVERNANCE_CHANGE assertion including SP.
- Update `shouldRequireSolverReacceptance` block (lines ~98–105) to assert `true` for FINANCIAL, ESCROW, GOVERNANCE_CHANGE.

File: `src/services/legal/__tests__/amendmentMatrix.test.ts`
- Update the `MATRIX` array (currently lines ~58–117) for FINANCIAL, ESCROW, GOVERNANCE_CHANGE rows. The governance-mode mask logic stays unchanged — still drops LC/FC for STRUCTURED, drops everyone except SP for QUICK.
- Update the `LEGAL + FINANCIAL` combined expectations.

Expected post-fix counts: ~17 tests in `amendmentScopeService.test.ts`, ~37 tests in `amendmentMatrix.test.ts`. Both should remain green.

### 4. Refresh `docs/Legal_Module_Feature_Matrix.md`

- §5 state machine: replace the CONTROLLED `IN_REVIEW` diagram with the flag-based reality (per Decision A2). Add a sentence: *"CONTROLLED challenges move directly to ACTIVE on curator approval; downstream actions remain gated by `lc_review_required` and `fc_review_required` flags on the challenge row, cleared by `complete_legal_review`."*
- §5 amendment matrix: add an explicit "SP re-accept on FINANCIAL/ESCROW/GOVERNANCE_CHANGE" footnote. Bold the corrected cells so a reader can diff against the prior version.
- §9 Phase status: keep Phase 9 marked as in-progress until v4b lands.
- New §11 "Deferred — IN_REVIEW state-based gating" subsection capturing Decision A1 as a future enhancement, with the reasoning for not doing it now.

### 5. Add a deferred-enhancement note in QA docs

File: `docs/qa/QA-09-E2E-Workflows.md` (or a new `docs/qa/legal-state-machine-future.md`)
- Document the trade-off between flag-based and state-based gating.
- Explicitly list the call sites that would need to change if A1 is ever picked up: `complete_phase`, `update_master_status`, `complete_legal_review`, dashboard queries filtering on `master_status`, sidebar role visibility, queue badge logic.

### 6. Re-verify `amendmentVersionBinding.ts` against the corrected matrix

The version-binding service already handles LC, FC, CR ledger inserts based on whether the scope is "legal" or "finance". With the corrected `SIGNATORY_MATRIX`, the existing `isLegalScope` / `isFinanceScope` predicates (lines 63–69) need a sanity check — `GOVERNANCE_CHANGE` already triggers legal-scope behavior, which is correct. No code change expected, but a new unit test should assert that an approved `GOVERNANCE_CHANGE` amendment writes ledger rows for LC, FC, CR.

File: `src/services/legal/__tests__/amendmentVersionBinding.test.ts` — add 1 test case for GOVERNANCE_CHANGE coverage.

---

## Files touched

**Code (3 files):**
- `src/services/legal/amendmentScopeService.ts` — fix matrix + SP gate
- `src/services/legal/__tests__/amendmentScopeService.test.ts` — fix asserts
- `src/services/legal/__tests__/amendmentMatrix.test.ts` — fix asserts
- `src/services/legal/__tests__/amendmentVersionBinding.test.ts` — add 1 GOVERNANCE_CHANGE case

**Docs (2 files):**
- `docs/Legal_Module_Feature_Matrix.md` — reconcile state machine to A2, footnote SP re-accept, mark Phase 9 closed after v4b
- `docs/qa/QA-09-E2E-Workflows.md` — append deferred IN_REVIEW enhancement note

**No DB migration.** The fix is service-layer + tests + docs only. No schema change, no RLS change, no RPC change.

---

## Definition of done

- All four legal test files pass (`amendmentScopeService.test.ts`, `amendmentMatrix.test.ts`, `amendmentVersionBinding.test.ts`, `roleToDocumentMap.test.ts`).
- `npm run typecheck` clean.
- Spec doc, code, and tests agree on the matrix — no three-way disagreement.
- Phase 9 status in `docs/Legal_Module_Feature_Matrix.md` marked complete with the v4b stamp.
- IN_REVIEW removed from spec OR documented as a deferred enhancement (per Decision A2).

## What is explicitly NOT in scope

- Implementing IN_REVIEW state-based gating (Decision A1) — deferred.
- Re-running the LC/FC backfill (already covered by existing trigger).
- Touching `complete_phase` SQL — flag-based gating already works.
- Any change to existing solver UX (`WithdrawalBanner`, `LegalReAcceptModal`) — they consume `requires_solver_reacceptance` and will pick up the corrected behavior automatically.

After v4b lands, Phase 9 v4 can be marked complete with auditor-defensible accuracy.
