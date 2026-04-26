
# Phase 9 v4 — Legal Module Final Hardening (Claude review folded in, with corrections)

## Verification done before redrafting

I verified Claude's claims against the actual codebase. Three of the "real gaps" are already implemented; one was a partial truth; the rest are valid. The plan below accepts only the valid ones.

### Already implemented — Claude was wrong
- **Gap 1 (Solver re-acceptance UX)**: `src/components/cogniblend/solver/WithdrawalBanner.tsx`, `LegalReAcceptModal.tsx`, `useSolverAmendmentStatus.ts`, `useWithdrawSolution.ts`, `useLegalReacceptance.ts`, plus the `amendment_records` table with `withdrawal_deadline`, `scope_of_change`, `version_before`/`version_after`, and the `trg_amendment_records_validate` trigger all exist. The withdrawal window, the modal, the banner, the legal re-accept mutation, the per-solution status query — all built. Spec gap, not implementation gap.
- **Gap 4 (Withdrawal of acceptance)**: `useWithdrawSolution.ts` exists. `legal_acceptance_log` is append-only by design (RLS confirms — INSERT-only for owner). Append-only + withdrawal-as-event is the architecture, not a missing feature.
- **Risk (table name discrepancy)**: Both tables exist and have **different roles**:
  - `legal_acceptance_log` (5 rows in DB) — forensic role-grant acceptance ledger; scoped per `template_id` + `document_code` + `trigger_event` + `action`. This is what Phase 9 backfill SQL targets. Correct.
  - `legal_acceptance_ledger` (0 rows in DB) — challenge-scoped CPA acceptance ledger; scoped per `challenge_id` + `phase_triggered` + `tier`. Used by `useSolverAmendmentStatus`, `useSolutionSubmission`, `useLegalReacceptance`.
  - The Phase 9 backfill correctly checks `legal_acceptance_log` because `RA_R2` is a role-grant doc, not a per-challenge doc. **Not a bug.** Spec must call out that the two tables coexist by design, with different scopes.

### Valid gaps — accepted into the plan
- Amendment matrix bugs (LC re-signs on FINANCIAL changes, FC on LEGAL — both CONTROLLED-only).
- LC/FC columns must be CONTROLLED-scoped header note.
- `amendment_scope` should be human-selected (audit deliverable to verify).
- GOVERNANCE_CHANGE row missing — and it should be **escalation-only** (STRUCTURED→CONTROLLED), not arbitrary.
- DRAFT→ACTIVE-only trigger transition for `RA_R2` backfill.
- Effective-window predicate (`effective_date <= now() AND (expires_at IS NULL OR expires_at > now())`) for the health check.
- Newly-invoked vs re-sign wording on GOVERNANCE_CHANGE row.
- `MissingPlatformCpaTemplateError` needs a UI catch.
- **Gap 2 (notification fan-out)** — confirmed missing. `notificationRoutingService.ts` has zero amendment references. Real gap.
- **Gap 3 (concurrent amendment policy)** — `amendment_records` table allows multiple rows per challenge but has no DB-level mutex. Real gap; serialize.
- **Hole 1 (rollback runbook)** — needs to be explicit in the plan.
- **Hole 2 (test discipline)** — done-criteria per prompt should require a passing test.

---

## Locked decisions
- Creator override remains QUICK-only by design.
- Both `legal_acceptance_log` and `legal_acceptance_ledger` stay — different scopes. Spec documents the split.
- Post-publish governance change permitted **only** STRUCTURED→CONTROLLED (escalation), Curator only.
- Concurrent amendments **forbidden** — one in-flight at a time per challenge.
- Existing solver amendment UX (`WithdrawalBanner`, `LegalReAcceptModal`) is the surface; we wire notifications and SLA to it, not rebuild it.

---

## Prompt 1 — RA_R2 + uniform array + correct table targeting

### Migration
- Insert `RA_R2` template into `legal_doc_templates` (version 1, `version_status='DRAFT'`).
- Insert `legal_doc_trigger_config` row: `trigger_event='USER_ROLE_GRANT'`, `role_code='R2'`, `document_code='RA_R2'`. (Verify the existing wildcard literal — `'ALL'` vs `null` — by reading `resolveActiveLegalTemplate` source first.)
- Backfill SQL targets `legal_acceptance_log` (correct table — RA_R2 is a role-grant doc):

```sql
INSERT INTO pending_role_legal_acceptance (user_id, role_code, doc_code, org_id, source)
SELECT DISTINCT ra.user_id, 'R2', 'RA_R2', ra.org_id, 'phase9_backfill'
FROM role_assignments ra
WHERE ra.role_code = 'R2' AND ra.status = 'active' AND ra.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM legal_doc_templates t
    WHERE t.document_code = 'RA_R2'
      AND t.version_status = 'ACTIVE'
      AND (t.effective_date IS NULL OR t.effective_date <= now())
  )
  AND NOT EXISTS (
    SELECT 1 FROM legal_acceptance_log la
    WHERE la.user_id = ra.user_id AND la.document_code = 'RA_R2' AND la.action = 'ACCEPTED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pending_role_legal_acceptance p
    WHERE p.user_id = ra.user_id AND p.doc_code = 'RA_R2' AND p.resolved_at IS NULL
  );
```

- One-shot trigger fires the same backfill **only on DRAFT→ACTIVE transition** of `RA_R2`:

```sql
CREATE OR REPLACE FUNCTION public.enqueue_ra_r2_backfill_on_activation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.document_code = 'RA_R2'
     AND OLD.version_status = 'DRAFT'
     AND NEW.version_status = 'ACTIVE'
  THEN
    INSERT INTO pending_role_legal_acceptance (...) SELECT ... ;  -- same NOT EXISTS clauses
  END IF;
  RETURN NEW;
END $$;
```

### Code
- `src/services/legal/roleToDocumentMap.ts` — return `RoleDocMapping[]` for all roles (length-1 except R2 which is length-2: `SKPA` + `RA_R2`). Eliminates `Array.isArray()` runtime check in `deriveRequiredSignatures`. PRIORITY array becomes `['SPA', 'SKPA', 'RA_R2', 'PWA']`.
- `src/types/legal.types.ts` — `DocumentCode` adds `'RA_R2'`. `DOCUMENT_CODE_LABELS` adds `RA_R2: 'Seeker Org Admin Role Agreement'`. (No active i18n catalogs in this codebase — confirmed via grep — so no translation extension needed.)

### Done-criteria (Hole 2 fix)
A test under `src/services/legal/__tests__/roleToDocumentMap.test.ts` asserting:
- `getRoleDocMapping('R2')` returns 2 entries (SKPA, RA_R2).
- `deriveRequiredSignatures(['R2'])` returns `[SKPA, RA_R2]` in priority order.
- `deriveRequiredSignatures(['R2', 'CR'])` deduplicates to 3 entries (SKPA, RA_R2, PWA).

### Rollback (Hole 1 fix)
If RA_R2 misbehaves post-deploy:
1. `UPDATE legal_doc_templates SET version_status='ARCHIVED' WHERE document_code='RA_R2';` (single statement, hot-reversible).
2. `UPDATE pending_role_legal_acceptance SET resolved_at=now(), resolved_reason='phase9_rollback' WHERE doc_code='RA_R2' AND resolved_at IS NULL;` to clear stuck gates.
3. Trigger `enqueue_ra_r2_backfill_on_activation` is harmless when template is ARCHIVED — its DRAFT→ACTIVE guard suppresses re-firing. Drop only if trigger itself is the bug.

---

## Prompt 2 — Governance flags + safe BIU trigger ✅ SHIPPED 2026-04-26

### Migration (applied)
- `ALTER TABLE challenges ADD COLUMN fc_review_required boolean;` (nullable — NULL means "derive from mode").
- `ALTER TABLE challenges ALTER COLUMN lc_review_required DROP NOT NULL, DROP DEFAULT;` so the trigger can distinguish "unset" from "explicitly false".
- BIU trigger uses effective mode `COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')` (the real column names — there is no `governance_mode` column on challenges). Defaults only when value is NULL — never overwrites a manual override, even when mode flips.
- Backfill: existing `fc_review_required` populated from current effective mode (11 rows, 0 nulls remaining).

```sql
CREATE OR REPLACE FUNCTION public.set_challenge_review_flags_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_effective_mode text;
BEGIN
  v_effective_mode := UPPER(COALESCE(NEW.governance_mode_override, NEW.governance_profile, 'STRUCTURED'));
  IF TG_OP = 'INSERT' THEN
    IF NEW.lc_review_required IS NULL THEN NEW.lc_review_required := (v_effective_mode = 'CONTROLLED'); END IF;
    IF NEW.fc_review_required IS NULL THEN NEW.fc_review_required := (v_effective_mode = 'CONTROLLED'); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.lc_review_required := COALESCE(NEW.lc_review_required, OLD.lc_review_required, (v_effective_mode = 'CONTROLLED'));
    NEW.fc_review_required := COALESCE(NEW.fc_review_required, OLD.fc_review_required, (v_effective_mode = 'CONTROLLED'));
  END IF;
  RETURN NEW;
END $$;
```

### Code (shipped)
- `src/services/legal/governanceFlagsService.ts` — pure `resolveGovernanceFlags(challenge)` returning `{ lcRequired, fcRequired, effectiveMode, source }`. Accepts both snake_case (DB row) and camelCase (mapped) shapes.
- Refactored **legal/finance gating** call sites:
  - `src/services/cogniblend/fcQueueService.ts` — FC queue filter now uses `fcRequired` (honors explicit overrides).
  - `src/hooks/cogniblend/useEscrowDeposit.ts` — `canVerify` now gated on `fcRequired`.
- **Intentionally NOT refactored** (preserved per plan — these are non-legal/finance CONTROLLED checks):
  - Creator-form schemas, AI review drawers, phase timeline UI, escrow display copy, FC tab narrative — UI/UX rules tied to mode itself, not the LC/FC review gate.
  - `escrowInstallmentValidationService.resolveExpectedFundingRole` — pure mode→role label mapper, not a gating decision.

### Done-criteria ✅
`src/services/legal/__tests__/governanceFlagsService.test.ts` — **9 tests passing**. Includes the Hole-2 scenario (explicit `lc=true` on STRUCTURED survives flip → QUICK → STRUCTURED) and the inverse (explicit `fc=false` on CONTROLLED is preserved).

### Rollback
1. Revert refactored call sites (`fcQueueService.ts`, `useEscrowDeposit.ts`) to inline `governance_mode === 'CONTROLLED'` checks.
2. `DROP TRIGGER trg_challenges_set_review_flags_biu ON challenges; DROP FUNCTION public.set_challenge_review_flags_default();`
3. `ALTER TABLE challenges ALTER COLUMN lc_review_required SET NOT NULL, SET DEFAULT false;` (after backfilling any NULLs).
4. Optional column drop: `ALTER TABLE challenges DROP COLUMN fc_review_required;`.


---

## Prompt 3 — AGG-Quick resolver + tightened health check + UI catch

### Service
- `src/services/legal/engagementModelRulesService.ts` adds `resolveQuickCpaTemplate(orgId, engagementModel)` returning `{ template, source: 'ORG' | 'PLATFORM_FALLBACK' }`. Uses React Query cache key conventions consistent with `resolveActiveLegalTemplate`.
- SQL helper `public.resolve_quick_cpa_template(org_id, engagement_model)` returns `(template_id, source)` for `assemble_cpa`.
- Throws typed `MissingPlatformCpaTemplateError` when no fallback exists.

### UI catch (Claude minor point)
- `useChallengeCpaDoc.ts` catches `MissingPlatformCpaTemplateError` and surfaces a structured error to `ChallengeLegalDocsCard.tsx`, which renders an inline alert: "Platform CPA template missing — contact Platform Admin." Never a stack trace.
- Source badge ("Org template" / "Platform default") in `ChallengeLegalDocsCard.tsx`.

### Admin health check
- New `LegalSystemHealthCard.tsx` (or extend `CurationDiagnosticsPage`) probing per code: `SPA`, `SKPA`, `PWA`, `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`. Effective-active definition (Claude's tightened predicate):
  ```
  version_status='ACTIVE'
    AND (effective_date IS NULL OR effective_date <= now())
    AND (expires_at IS NULL OR expires_at > now())
  ```
- Red state with deep link to `/admin/legal-documents` when missing.

### Done-criteria
Test asserting three-way fallback: ORG template present → ORG; ORG missing + PLATFORM present → PLATFORM_FALLBACK; both missing → throws `MissingPlatformCpaTemplateError`.

### Rollback
Resolver returns the platform default already by design; if the resolver misbehaves, revert the call site in `useChallengeCpaDoc.ts` to `resolveActiveLegalTemplate(orgId, 'CPA_QUICK', null)` (existing behavior). One-line code revert.

### Sequencing
**Sequential after Prompt 2** — both touch `useChallengeCpaDoc.ts`.

---

## Prompt 4 — State machine + corrected amendment matrix + concurrent-amendment serialization + audit

### Target state machine (audit oracle)

```text
QUICK         draft ──(creator publishes)──► ACTIVE
STRUCTURED    draft ──(creator publishes)──► DRAFT ──(curator approves)──► ACTIVE
                                                  └──(curator rejects)───► draft
CONTROLLED    draft ──(creator publishes)──► DRAFT ──(curator approves)──► IN_REVIEW
              IN_REVIEW ──(LC + FC approve)──► ACTIVE
              IN_REVIEW ──(LC rejects)───────► DRAFT
              IN_REVIEW ──(FC rejects)───────► DRAFT
```

### Corrected amendment scope → re-sign matrix

**Mandatory header note (in code comments AND spec):**
> LC and FC re-sign columns apply **only to CONTROLLED governance**. In STRUCTURED, the Curator's re-approval substitutes for both. In QUICK, no curator/LC/FC re-sign occurs. Solution Provider re-accept applies across all governance modes whenever the CPA version changes.

**Why LC re-signs on FINANCIAL changes and FC on LEGAL changes (CONTROLLED only):** they signed the assembled CPA as a whole. `legal_acceptance_log` and `legal_acceptance_ledger` are version-bound. Any clause change increments CPA version; every prior signatory of that version has a stale approval. Re-acknowledgment is required for audit-trail integrity, not optional.

| `scope_of_change`            | LC re-sign (CONTROLLED only) | FC re-sign (CONTROLLED only) | SP re-accept (all modes) |
|------------------------------|-------------------------------|-------------------------------|---------------------------|
| `LEGAL`                      | yes                           | **yes**                       | yes                       |
| `FINANCIAL` or `ESCROW`      | **yes**                       | yes                           | yes                       |
| `LEGAL` + `FINANCIAL/ESCROW` | yes                           | yes                           | yes                       |
| `EDITORIAL` only             | no                            | no                            | no                        |
| `SCOPE_CHANGE` (material)    | yes                           | yes                           | yes                       |
| `GOVERNANCE_CHANGE` (escalation only) | yes (newly enqueued, initial sign) | yes (newly enqueued, initial sign) | yes |

### GOVERNANCE_CHANGE post-publish — restricted
- Permitted **only**: STRUCTURED → CONTROLLED (escalation; adds LC+FC oversight).
- Forbidden post-publish: any downgrade, any QUICK transition.
- Actor: Curator only.
- Effect: pending rows enqueued for newly-invoked LC and FC; SP re-accept enqueued because the assurance regime materially changed.

### Concurrent amendment serialization (Gap 3)
Add migration: partial unique index on `amendment_records` to enforce one in-flight amendment per challenge:

```sql
CREATE UNIQUE INDEX uq_amendment_records_one_in_flight
  ON amendment_records (challenge_id)
  WHERE status NOT IN ('APPROVED', 'REJECTED', 'WITHDRAWN');
```

`useAmendments` mutation handler catches the `23505` unique violation and surfaces "An amendment is already in flight on this challenge — wait for it to be approved or rejected before starting another."

### `amendment_scope` is human-selected (Claude ambiguity fix)
Audit deliverable: confirm `amendment_records.scope_of_change` is set by the human-initiating UI (Creator or Curator picks via radio: Editorial / Legal / Financial / Escrow / Scope change / Governance escalation), not inferred from a content diff. If currently inferred, file a follow-up — do not silently accept inference.

### Notification fan-out (Gap 2)
Audit + extend `notificationRoutingService.ts`:
- On `amendment_records.status` → `APPROVED`, fan out:
  - In-app + email to all SPs with active enrollments on the challenge → "Challenge amended — review and re-accept within {withdrawal_window} days." Deep link to challenge detail (which already shows `WithdrawalBanner` + `LegalReAcceptModal`).
  - In-app + email to LC/FC for CONTROLLED challenges where new pending rows were enqueued.
- Notification template content lives in `notification_templates`. No hardcoded strings.

### SLA on LC/FC re-approval (Gap 2)
- `complete_legal_review` already exists. Add a scheduled `pg_cron` job invoking a new edge function `enforce-amendment-sla`:
  - For amendments in `IN_REVIEW > 7 days` → notify Org Admin + Platform Admin.
  - For amendments in `IN_REVIEW > 14 days` → escalate per existing T1/T2/T3 SLA infrastructure (`slaEscalationService.ts`).
  - SLA values configurable via existing `org_settings` keys (no new infra).

### Ledger version-binding verification
Audit deliverable: confirm `legal_acceptance_log` (role-grant) and `legal_acceptance_ledger` (challenge CPA) both write the **new** template version on amendment-driven re-accept. Common gap if a resolver caches the old version reference.

### Audit deliverables (consolidated)
1. Read `complete_phase` RPC; verify CONTROLLED publish reaches `IN_REVIEW`.
2. Read amendment fan-out in `complete_legal_review` and any trigger function. Patch missing branches per matrix above.
3. Verify `scope_of_change` is human-selected.
4. Verify ledger writes new version.
5. Verify GOVERNANCE_CHANGE handling — currently absent.
6. Confirm `amendment_records.withdrawal_deadline` is populated for every APPROVED material amendment (the existing solver UX depends on it).
7. Output: code patches OR documented findings.

### Done-criteria
Regression test per amendment scope asserting expected pending rows in `pending_role_legal_acceptance` for a (CONTROLLED, STRUCTURED, QUICK) × (LEGAL, FINANCIAL, EDITORIAL, SCOPE_CHANGE, GOVERNANCE_CHANGE) matrix.

### Rollback
- Drop `uq_amendment_records_one_in_flight` if it blocks legitimate operations.
- Revert notification fan-out via feature flag in `notificationRoutingService` (existing pattern).
- Disable `enforce-amendment-sla` cron job (`SELECT cron.unschedule(...)`) — no data impact.

### Sequencing
After Prompts 1, 2, 3.

---

## Prompt 5 — Spec rewrite (`Legal_Module_Feature_Matrix.md`)

- §1 add `RA_R2`. Document `legal_acceptance_log` (role-grant scope) vs `legal_acceptance_ledger` (challenge CPA scope) — they coexist by design.
- §2 R2 row → `SKPA + RA_R2`. Creator override clarified: QUICK only.
- §3 governance × gate matrix corrected; flag-driven via `resolveGovernanceFlags`. Document non-recompute on governance change.
- §4 AGG-Quick fallback + source badge + tightened health predicate.
- §5 reconciled per Prompt 4: state-machine diagram + corrected amendment matrix verbatim including header note + GOVERNANCE_CHANGE row.
- §6 NEW: amendment workflow operations — concurrent serialization rule, notification fan-out, SLA matrix, withdrawal window behavior (links to existing `WithdrawalBanner`/`LegalReAcceptModal`).
- §7 NEW: rollback runbook for each Phase 9 component.
- §9 — Phase 9 marked complete only after Prompt 4 lands findings.

---

## Execution order

```text
Prompt 1 (RA_R2 + uniform array) ──┐
                                    ├──► Prompt 4 (audit + matrix + serialization + notif + SLA) ──► Prompt 5 (spec)
Prompt 2 (governance flags) ──► Prompt 3 (AGG-Quick resolver, sequential — same file)
```

1 and 2 parallel. 3 sequential after 2. 4 after 1+2+3. 5 after 4.

---

## Regression contract
- Each prompt's done-criteria includes a passing test (Hole 2).
- Each prompt has a documented rollback (Hole 1).
- QUICK Creator override (`CreatorLegalPreview.tsx`) untouched.
- R2 SKPA flow untouched (RA_R2 additive).
- PWA gates for CR/CU/ER/FC/LC at first login untouched.
- SP SPA gate untouched.
- Existing solver amendment UX (`WithdrawalBanner`, `LegalReAcceptModal`, `useWithdrawSolution`, `useSolverAmendmentStatus`, `useLegalReacceptance`) untouched — Phase 9 only wires notifications + SLA into it.
- Both `legal_acceptance_log` and `legal_acceptance_ledger` append-only behavior untouched.
- `assemble_cpa` works for challenges with no override.
- AuthGuard sessionStorage cache behavior untouched.
- RLS policies on org-scoped legal tables untouched.
- No schema renames or removals — additions only.
- No deletes from `legal_doc_templates` — new versions only.
- Concurrent amendments forbidden via partial unique index.
- Post-publish governance changes restricted to STRUCTURED→CONTROLLED escalation by Curator only.

## Out of scope
- Generalizing Creator override to STRUCTURED/CONTROLLED (by design).
- New `challenges.legal_template_source` / `legal_bespoke_content` columns.
- Renaming `CreatorLegalPreview`.
- Authoring template body text (Platform Admin operational task).
- Withdrawal-of-acceptance as a deletable event (append-only by design — withdrawal already exists as a separate `useWithdrawSolution` event; ledger entries are never destructively modified).
- Building an amendment-scope picker UI if Prompt 4 finds it's currently inferred — that's a separate phase.
- Rebuilding the solver re-acceptance UX surface (it exists).
