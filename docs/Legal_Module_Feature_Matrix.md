# Legal Module — Feature Matrix & Operational Spec

> **Phase 9 v4 closing spec.** Authored 2026-04-27. This is the canonical
> reference for the legal layer (templates, role gates, challenge CPA
> assembly, governance flags, amendment lifecycle, audit, and
> notifications). Code is the source of truth; this doc is the human
> reference and review oracle.

---

## §1 — Document inventory

| Code              | Scope                  | Storage table                    | Acceptance writes to            | Acceptance scope                                                                  |
|-------------------|------------------------|----------------------------------|----------------------------------|------------------------------------------------------------------------------------|
| `PWA`             | Platform admin role    | `legal_document_templates`       | `legal_acceptance_log`           | role-grant (per `(user, role_code)` first login)                                  |
| `SPA`             | Solution Provider      | `legal_document_templates`       | `legal_acceptance_log`           | role-grant (per `(user, role='SP')`)                                               |
| `SKPA`            | Seeker Org             | `legal_document_templates`       | `legal_acceptance_log`           | role-grant (per `(org, role='R2')`)                                                |
| `RA_R2`           | Seeker Org R2 addendum | `legal_document_templates`       | `legal_acceptance_log`           | role-grant (per `(org, role='R2')`); Creator-overridable in QUICK only           |
| `CPA_QUICK`       | Challenge CPA — Quick  | `legal_document_templates` + `org_legal_document_templates` | `legal_acceptance_ledger` | challenge-bound (per `(challenge, party)`); resolver picks Org → Platform fallback |
| `CPA_STRUCTURED`  | Challenge CPA          | `legal_document_templates`       | `legal_acceptance_ledger`        | challenge-bound; assembled by `assemble_cpa`                                       |
| `CPA_CONTROLLED`  | Challenge CPA          | `legal_document_templates`       | `legal_acceptance_ledger`        | challenge-bound; LC + FC re-sign per amendment matrix                              |

**Two-ledger model — by design:**
- `legal_acceptance_log` = role-grant scope (PWA, SPA, SKPA, RA_R2). One row per `(user/org, role)` per template version.
- `legal_acceptance_ledger` = challenge CPA scope. One row per `(challenge, party, version)`. Re-signed on every amendment that touches that party (see §5).

Both tables are **append-only** (security/architecture/append-only-audit-governance memory).

---

## §2 — Role × document gating matrix

| Role on first login | Gate document(s)                                                                  | Notes                                                                  |
|---------------------|-----------------------------------------------------------------------------------|------------------------------------------------------------------------|
| Platform Admin      | `PWA`                                                                             | Single platform agreement                                              |
| Curator (CU)        | `PWA`                                                                             |                                                                        |
| Expert Reviewer (ER)| `PWA`                                                                             |                                                                        |
| Legal Counsel (LC)  | `PWA`                                                                             |                                                                        |
| Finance (FC)        | `PWA`                                                                             |                                                                        |
| Solution Provider   | `SPA`                                                                             |                                                                        |
| Seeker Org R2       | `SKPA + RA_R2`                                                                    | Both required. RA_R2 is Creator-overridable **in QUICK only**.         |

QUICK Creator override: `CreatorLegalPreview.tsx` allows the Creator to substitute the platform `RA_R2` with org-specific text **for QUICK challenges only**. STRUCTURED/CONTROLLED always use the platform RA_R2.

> **Note — R2 dual-signing asymmetry (intentional).** R2 is the **only** role that signs both an org-binding document (`SKPA`) and a personal role agreement (`RA_R2`). This is intentional: R2 is simultaneously the legal signatory for the seeking organization (org-binding) and a role-actor on the platform in their own right (role-grant). Other workforce roles (CR, CU, ER, FC, LC) inherit `SKPA` coverage transitively via R2's signature and only sign their PWA-family role agreement. SP signs only `SPA` because Solvers may be unaffiliated with any seeker organization. The dual-doc behavior is enforced deterministically by `deriveRequiredSignatures` via the priority array `['SPA','SKPA','RA_R2','PWA']` (see `src/services/legal/roleToDocumentMap.ts`).

---

## §3 — Governance × gate matrix (flag-driven)

Source of truth: `resolveGovernanceFlags()` in `src/services/legal/governanceFlagsService.ts`.

| Effective mode | `lc_review_required` default | `fc_review_required` default |
|----------------|------------------------------|------------------------------|
| QUICK          | false                        | false                        |
| STRUCTURED     | false                        | false                        |
| CONTROLLED     | true                         | true                         |

**Override semantics:**
- DB-level BIU trigger (migration `20260426_governance_flags_default`) sets defaults from `COALESCE(governance_mode_override, governance_profile)` only when columns are `NULL`.
- An explicit `true`/`false` set by the Curator survives subsequent governance mode flips (verified by `governanceFlagsService.test.ts`: `STRUCTURED → QUICK → STRUCTURED` keeps an explicit `lc_review_required = true`).
- **Non-recompute on governance change.** The trigger never overwrites a non-NULL flag.

Consumers:
- `fcQueueService.ts` — FC queue filter uses `resolveGovernanceFlags(challenge).fcRequired`.
- `useEscrowDeposit.ts` — `canVerify` gates on `fcRequired && hasFcRole`.

---

## §4 — AGG-Quick CPA resolver + health check

**Resolver (`resolve_quick_cpa_template`, mirrored client-side as `quickCpaResolver.ts`)**

```
engagement_model = 'AGG' | 'AGGREGATOR'
  ─► org_legal_document_templates WHERE document_code='CPA_QUICK' AND version_status='ACTIVE'
                                    AND effective_date <= now()
                                    AND (expires_at IS NULL OR expires_at > now())
                                    LIMIT 1   → source='ORG'
  ─► fallback to legal_document_templates (same predicate)             → source='PLATFORM_FALLBACK'
  ─► no match                                                          → MissingPlatformCpaTemplateError
```

**Health check (`legal_template_health()` RPC + `LegalSystemHealthCard`)**
Probes the seven core codes (`SPA`, `SKPA`, `PWA`, `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`) with the **effective-active predicate**:

```
version_status='ACTIVE'
AND effective_date <= now()
AND (expires_at IS NULL OR expires_at > now())
```

UI surfaces:
- Admin: `LegalSystemHealthCard` mounted on `LegalDocumentListPage`.
- Challenge view: `ChallengeLegalDocsCard` badges the CPA source (`ORG` vs `PLATFORM_FALLBACK`) and renders a friendly Alert (no stack trace) on `MissingPlatformCpaTemplateError`.

---

## §5 — Amendment lifecycle, state machine & signatory matrix

### State machine (per challenge)

```text
QUICK         draft ──(creator publishes)──► ACTIVE
STRUCTURED    draft ──(creator publishes)──► DRAFT ──(curator approves)──► ACTIVE
                                                  └──(curator rejects)──► draft
CONTROLLED    draft ──(creator publishes)──► DRAFT ──(curator approves)──► IN_REVIEW
              IN_REVIEW ──(LC + FC approve)──► ACTIVE
              IN_REVIEW ──(LC rejects)──────► DRAFT
              IN_REVIEW ──(FC rejects)──────► DRAFT
```

### Amendment scope → signatory matrix

> **MANDATORY HEADER NOTE.** LC and FC re-sign columns apply **only to
> CONTROLLED governance**. In STRUCTURED, the Curator's re-approval
> substitutes for both. In QUICK, no curator/LC/FC re-sign occurs.
> Solution Provider re-accept applies across **all** governance modes
> whenever the CPA version changes.

**Why LC re-signs on FINANCIAL changes and FC on LEGAL changes (CONTROLLED only):** they signed the assembled CPA as a whole. `legal_acceptance_log` and `legal_acceptance_ledger` are version-bound. Any clause change increments CPA version; every prior signatory of that version has a stale approval. Re-acknowledgment is required for audit-trail integrity, not optional.

| Canonical scope (`amendment_scope_normalize`) | LC re-sign (CONTROLLED only) | FC re-sign (CONTROLLED only) | CR re-accept | SP re-accept (all modes) |
|-----------------------------------------------|-------------------------------|-------------------------------|--------------|---------------------------|
| `LEGAL`                                       | yes                           | **yes**                       | yes          | yes                       |
| `FINANCIAL`                                   | **yes**                       | yes                           | yes          | yes (material)            |
| `ESCROW`                                      | **yes**                       | yes                           | yes          | yes (material)            |
| `EDITORIAL`                                   | no                            | no                            | no           | no                        |
| `SCOPE_CHANGE`                                | yes                           | yes                           | yes          | yes                       |
| `GOVERNANCE_CHANGE` (escalation only)         | yes (newly enqueued, initial) | yes (newly enqueued, initial) | yes          | yes                       |
| `OTHER`                                       | conservative: no              | conservative: no              | yes          | conservative: no          |

Source of truth for the matrix: `src/services/legal/amendmentScopeService.ts`
(`resolveSignatoryMatrix`, `shouldRequireSolverReacceptance`, `isMaterialAmendment`). Signatory mapping is asserted by 17 unit tests in `__tests__/amendmentScopeService.test.ts`.

### GOVERNANCE_CHANGE post-publish — restricted

- **Permitted only:** `STRUCTURED → CONTROLLED` (escalation; adds LC + FC oversight).
- **Forbidden post-publish:** any downgrade, any QUICK transition. Enforced by trigger `trg_challenges_governance_escalation_only`.
- **Actor:** Curator only.
- **Effect:** pending rows enqueued for newly-invoked LC and FC; SP re-accept enqueued because the assurance regime materially changed.

### Concurrent amendment serialization

Partial unique index `uq_amendment_records_one_in_flight` on
`amendment_records(challenge_id) WHERE status NOT IN ('APPROVED','REJECTED','WITHDRAWN')` enforces **one in-flight amendment per challenge**.
Postgres 23505 surfaces in `useInitiateAmendment` as the friendly error: *"An amendment is already in flight on this challenge…"*

### Withdrawal window

Material amendments populate `amendment_records.withdrawal_deadline = now() + 7 days`. The existing solver UX (`WithdrawalBanner`, `LegalReAcceptModal`, `useWithdrawSolution`, `useSolverAmendmentStatus`, `useLegalReacceptance`) reads this column unchanged.

---

## §6 — Amendment workflow operations

### Notification fan-out

On `amendment_records.status = 'APPROVED'`, `useApproveAmendment`:

1. Inserts `cogni_notifications` rows for every enrolled solver (`AMENDMENT_PUBLISHED`).
2. If `requiresSolverReacceptance` (LEGAL or SCOPE_CHANGE in scope), creates `legal_reacceptance_records` rows with a 7-day `deadline_at`.
3. Dispatches routed events via `sendRoutedNotification(phase=99, eventType=…)`. Routings live in `notification_routing` (seeded by Prompt 4 migration):

| Event type                                       | Primary | CC               |
|--------------------------------------------------|---------|------------------|
| `AMENDMENT_APPROVED_LEGAL`                       | LC      | CU, CR           |
| `AMENDMENT_APPROVED_FINANCIAL`                   | FC      | LC, CU, CR       |
| `AMENDMENT_APPROVED_GOVERNANCE_ESCALATION`       | CU      | LC, FC, CR       |
| `AMENDMENT_REACCEPT_REQUIRED`                    | CU      | —                |

Phase = 99 is the platform sentinel for post-publish lifecycle events (avoids collision with phase-bound routings).

### `amendment_records.scope_of_change` is human-selected

The Creator/Curator picks scope via the `InitiateAmendmentModal` UI (radio: Legal / Financial / Escrow / Editorial / Scope change / Governance escalation). Scopes are stored as `JSON.stringify({ areas: [...], is_material })` in `scope_of_change` and normalized to the canonical bucket via `amendment_scope_normalize` (SQL) and `normalizeScopes` (TS).

### SLA on LC/FC re-approval

`complete_legal_review` already exists (CONTROLLED-only RPC). SLA enforcement reuses the existing T1/T2/T3 escalation infrastructure (`slaEscalationService.ts`). Configurable via `org_settings`:

- `IN_REVIEW > 7 days`  → notify Org Admin + Platform Admin (T1).
- `IN_REVIEW > 14 days` → escalate per existing T1/T2/T3 chain (T2/T3).

No new infra; uses the same `pg_cron` pattern as Spec 15 enrollment automation (infrastructure/architecture/scheduled-background-jobs memory).

### Ledger version-binding

Both `legal_acceptance_log` and `legal_acceptance_ledger` write the **new** template version on amendment-driven re-accept. This is enforced because:

- `legal_acceptance_ledger` rows reference `template_version_id` — `assemble_cpa` always picks the resolver's current ACTIVE version (effective-active predicate from §4).
- `legal_acceptance_log` writes the version returned by `resolve_pwa_template` / `resolve_spa_template` — same predicate.

Audit deliverable confirmed: no resolver caches a stale version reference.

---

## §7 — Rollback runbook

| Component                                         | Rollback                                                                                                  |
|---------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Concurrent-amendment serialization                | `DROP INDEX IF EXISTS public.uq_amendment_records_one_in_flight;`                                          |
| Governance escalation guard                       | `DROP TRIGGER IF EXISTS trg_challenges_governance_escalation_only ON public.challenges;`                   |
| Amendment scope normalizer                        | Function is pure; safe to leave in place. Drop with `DROP FUNCTION public.amendment_scope_normalize(text);` |
| Routed amendment notifications                    | `UPDATE notification_routing SET is_active=false WHERE phase=99 AND event_type LIKE 'AMENDMENT_APPROVED%';`|
| Governance flags BIU trigger                      | `DROP TRIGGER IF EXISTS set_challenge_review_flags_default ON public.challenges;`                          |
| AGG-Quick resolver health card                    | Unmount `LegalSystemHealthCard` from `LegalDocumentListPage`. Resolver remains for runtime resilience.    |
| RA_R2 row addition                                | Mark template `version_status='SUPERSEDED'` (do not delete; templates are append-only).                   |
| Amendment SLA cron job (if shipped)               | `SELECT cron.unschedule('enforce-amendment-sla');` — no data impact.                                       |

---

## §8 — Untouched contracts (regression guarantees)

These behaviors are **frozen** by Phase 9 v4 and verified by the regression contract:

- QUICK Creator RA_R2 override (`CreatorLegalPreview.tsx`).
- R2 SKPA flow (RA_R2 is additive).
- PWA gates for CR / CU / ER / FC / LC at first login.
- SP SPA gate.
- Existing solver amendment UX (`WithdrawalBanner`, `LegalReAcceptModal`, `useWithdrawSolution`, `useSolverAmendmentStatus`, `useLegalReacceptance`).
- Append-only behavior of `legal_acceptance_log` and `legal_acceptance_ledger`.
- `assemble_cpa` works for challenges with no override.
- AuthGuard sessionStorage cache behavior.
- RLS policies on org-scoped legal tables.
- No schema renames or removals — additions only.
- No deletes from `legal_doc_templates` — new versions only.

---

## §9 — Phase 9 v4 status

| Prompt | Title                                                        | Status                |
|--------|--------------------------------------------------------------|-----------------------|
| 1      | RA_R2 + uniform legal arrays                                 | ✅ Shipped 2026-04-26 |
| 2      | Governance flags BIU + resolver                              | ✅ Shipped 2026-04-26 |
| 3      | AGG-Quick CPA resolver + health check + UI catch             | ✅ Shipped 2026-04-26 |
| 4      | State machine + amendment matrix + serialization + audit     | ✅ Shipped 2026-04-27 |
| 5      | Spec rewrite (this document)                                 | ✅ Shipped 2026-04-27 |
| 4.1    | Amendment version binding (LC/FC/CR ledger + template bump)  | ✅ Shipped 2026-04-27 |

**Phase 9 v4 — closed.**

### Post-v4 follow-ups (audit-driven, deferred)

| ID    | Finding                                                                                          | Disposition                     |
|-------|--------------------------------------------------------------------------------------------------|---------------------------------|
| A1    | `complete_phase` has no `IN_REVIEW` state. CONTROLLED Phase 3→4 sets `phase_status='PUBLISHED'` regardless of `lc_review_required` / `fc_review_required`. State-machine diagram in §5 documents the **intended** behavior; runtime currently transitions straight to ACTIVE. | **Deferred** — high-blast-radius RPC change requires its own migration cycle. Track in next phase. |
| A2    | Template body text for `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED` not authored.   | **Out of engineering scope** — Platform Admin operational task. |

Test coverage:
- `governanceFlagsService.test.ts` — 9 tests (default derivation + override survival).
- `quickCpaResolver.test.ts` — 6 tests (fallback + RPC errors).
- `amendmentScopeService.test.ts` — 17 tests (normalization + signatory matrix + routed events + reaccept gate + materiality).
- `amendmentMatrix.test.ts` — 37 tests (cross-mode governance × scope regression matrix).
- `roleToDocumentMap.test.ts` — 28 tests (R2 dual-mapping + signature priority + dedupe).
- `amendmentVersionBinding.test.ts` — 5 tests (template bump + ledger fan-out + scope routing).

**Total: 102 passing tests across 6 suites.**
