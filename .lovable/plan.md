## Critical review of Claude's feedback

I verified each claim against the actual code in `supabase/migrations/`, `src/hooks/cogniblend/useApproveAmendment.ts`, `src/hooks/cogniblend/useAmendments.ts`, `src/services/legal/quickCpaResolver.ts`, and the Phase 9 v4 migrations. Here is the disposition.

---

### Verdict by claim

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | **Caveat A — Prompt 2 trigger ambiguity** (column default + NOT NULL silently defeats trigger override) | **Already resolved** — DO NOT re-implement | Migration `20260426190219_…` does `DROP NOT NULL` + `DROP DEFAULT` on `lc_review_required` and adds `fc_review_required` as nullable. Trigger uses `IS NULL` correctly. |
| 2 | **AGG-Quick fallback resolver missing** | **Already shipped** — DO NOT re-implement | `quickCpaResolver.ts` has the three-branch contract (`ORG` / `PLATFORM_FALLBACK` / `MissingPlatformCpaTemplateError`). |
| 3 | **Concurrent-amendment serialization missing** | **Already shipped** — DO NOT re-implement | Partial unique index `uq_amendment_records_one_in_flight` + 23505 translation in `useAmendments.ts`. |
| 4 | **Governance change post-publish ambiguity** | **Already shipped** — DO NOT re-implement | Trigger `enforce_governance_escalation_only` allows STRUCTURED→CONTROLLED only after `current_phase >= 4`. |
| 5 | **Notification fan-out events for LC/FC/CU on amendment scopes missing** | **Already shipped** — DO NOT re-implement | Routing rows for `AMENDMENT_APPROVED_LEGAL/FINANCIAL/GOVERNANCE_ESCALATION/REACCEPT_REQUIRED` inserted; `useApproveAmendment` calls `sendRoutedNotification` for each. |
| 6 | **R2 dual-signing asymmetry (SKPA + RA_R2)** | **Valid but cosmetic** — DOCUMENT, do not re-architect | Already implemented with priority array. Claude's recommendation (a): document the asymmetry in the spec. Cheap, defensible, matches legal intent. |
| 7 | **Amendment scope is human-selected, not inferred** | **Already correct** — no action needed | `useAmendments.ts` line 114-117: `scopes` is taken directly from caller payload (Curator selection in `AmendmentDetailPanel`), not diff-inferred. The audit-flagged ambiguity does not exist in this codebase. |
| 8 | **`complete_phase` may stay in DRAFT instead of emitting IN_REVIEW on CONTROLLED publish** | **NEEDS AUDIT** — real risk | `complete_phase` is in `20260424150444_…` and was last patched 3 days ago. Not verified against the v4 state-machine spec. |
| 9 | **Amendment approval does not advance `challenge_legal_docs.template_version` to the new active template, nor write version-pinned LC/FC re-sign entries to `legal_acceptance_ledger`** | **CONFIRMED BUG** — must fix | `useApproveAmendment.ts` snapshots existing `template_version` into the package version (line 92) but never (a) re-resolves the active template at approval time, (b) updates `challenge_legal_docs.template_version`, or (c) creates ledger entries pinned to the new version for LC/FC. Solver re-acceptance records are created (good), but they do not store `template_version` either. This silently breaks the version-bound audit guarantee Claude flagged. |
| 10 | **Amendment scope picker UI missing** | **Already exists** — `AmendmentDetailPanel.tsx` saves human-selected `modification_points` to `scope_of_change`. No action. |
| 11 | **`withdrawal_deadline` may not always be populated** | **Already correct** — set on insert (initiate) and on approval, both gated by `isMaterial`. |
| 12 | **Template body text for RA_R2, CPA_QUICK/STRUCTURED/CONTROLLED is unauthored** | **Out of engineering scope** — Platform Admin operational task. Acknowledge in spec only. |

---

### What to actually implement (3 items)

**A. Fix the version-binding bug in amendment approval (Claim #9 — confirmed)**
The single real correctness gap. Without this, every amended challenge has stale `template_version` on `challenge_legal_docs` and no LC/FC ledger row binding the approval to the new CPA version.

Changes in `src/hooks/cogniblend/useApproveAmendment.ts`:
- After step 3 (status → APPROVED), re-resolve the active CPA template via `quickCpaResolver` (or the structured/controlled equivalent based on governance mode).
- `UPDATE challenge_legal_docs SET template_version = <new>, updated_at, updated_by` for every doc whose scope is in `canonicalScopes` (LEGAL → CPA legal sections; FINANCIAL/ESCROW → financial annexes; etc.).
- Insert `legal_acceptance_ledger` rows (status `PENDING_REACCEPT`) for each required signatory (LC if LEGAL, FC if FINANCIAL/ESCROW, CU always, plus SP fan-out via existing `legal_reacceptance_records`) with `template_version = <new>`.
- Snapshot the **new** template_version into `challenge_package_versions.snapshot.legal_docs` (currently snapshots stale value).
- Add unit test in `src/services/legal/__tests__/` asserting that approval bumps `template_version` and writes one ledger row per required signatory.

**B. Audit `complete_phase` against v4 state machine (Claim #8 — risk, not confirmed bug)**
Read-only verification, plus a patch migration only if the audit fails:
- Inspect the latest `complete_phase` body (migration `20260424150444_…`) for the CONTROLLED publish branch.
- Confirm it transitions to `IN_REVIEW` (LC + FC review pending) when `lc_review_required OR fc_review_required` is true at Phase 4 entry, vs. straight to `ACTIVE`.
- If wrong, write a patch migration `CREATE OR REPLACE FUNCTION public.complete_phase(...)` that gates the CONTROLLED Phase 3 → Phase 4 transition through `IN_REVIEW`.
- Document findings in `docs/Legal_Module_Feature_Matrix.md` §7.

**C. Document the R2 dual-signing asymmetry (Claim #6 — cosmetic)**
Add a short note to `docs/Legal_Module_Feature_Matrix.md`:
> "R2 (Seeker Admin) is the only role that signs both an org-binding document (SKPA) and a personal role agreement (RA_R2). This is intentional: R2 is simultaneously the legal signatory for the seeking organization and a role-actor on the platform. Other workforce roles inherit SKPA via R2's signature and only sign their PWA-family role agreement. SP signs only SPA because Solvers may be unaffiliated."

---

### What to explicitly NOT do

- Do not re-resolve the Prompt 2 trigger — already resolved.
- Do not add an amendment scope picker — already exists in `AmendmentDetailPanel`.
- Do not author legal template bodies (Platform Admin task).
- Do not promote SKPA-by-inheritance to a no-op signature on every workforce role (Claude's option (b)) — adds friction, no audit value.

---

### Technical notes

- Item A is the only one with material audit-trail risk. It should be the priority.
- Item B is read-only audit first; only patch if `complete_phase` deviates from spec.
- Item C is a docs-only edit.
- All changes preserve the green test suite (60+28 = 88 tests). Item A adds ~4-6 new tests.

### Files affected

- `src/hooks/cogniblend/useApproveAmendment.ts` (modified — version binding)
- `src/services/legal/__tests__/amendmentVersionBinding.test.ts` (new)
- `docs/Legal_Module_Feature_Matrix.md` (modified — R2 note + audit findings)
- Possibly `supabase/migrations/<new>.sql` (only if `complete_phase` audit fails)
