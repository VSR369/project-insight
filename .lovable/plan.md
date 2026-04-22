
## Final implementation plan — Governance-aware installment escrow, aligned to current Cogniblend + Lovable architecture

## Decision summary
This direction is correct and should proceed, with the 3 additional safeguards now explicitly locked into scope:

1. **STRUCTURED completion flagging**
   - In STRUCTURED mode, Curator owns escrow.
   - `complete_curator_compliance` must also satisfy the financial-compliance gate used by phase advancement.
   - Implement **Option A**: when governance is STRUCTURED, `complete_curator_compliance` also sets `fc_compliance_complete = true`.

2. **Governance-aware funding validation**
   - Role membership alone is not enough.
   - `funded_by_role` must be enforced against governance mode in the **service layer**, not only via RLS.
   - Rule:
     - STRUCTURED → only `funded_by_role = 'CU'`
     - CONTROLLED → only `funded_by_role = 'FC'`

3. **Shared workspace mode prop**
   - Shared installment UI must receive `fundingRole: 'CU' | 'FC'`.
   - This controls:
     - who is writing the installment funding record
     - labels/copy
     - which completion action is wired

---

## What is confirmed in the current system

### Current gaps in code
- `RecommendedEscrowCard` currently reads mostly from `extended_brief` plus reward totals, not the authored milestone schedule.
- `FcFinanceWorkspacePage` excludes STRUCTURED entirely and still works from a single `escrow_records` row.
- `StructuredFieldsSectionRenderer` is still a toggle/read-only view and does not support installment funding.
- `SectionPanelItem` hardcodes `escrow_funding` coordinator role to `FC`.
- `useCompleteCuratorCompliance` calls the existing RPC, but current completion semantics do not explicitly guarantee the finance-complete flag for STRUCTURED.
- `useEscrowDeposit` and related FC hooks are still based on a single challenge-level escrow record.

So the requirement is real and the architecture change must happen at the domain level, not as a display patch.

---

## Core architecture rule set

```text
QUICK       = no escrow flow
STRUCTURED  = Curator funds installments
CONTROLLED  = FC funds installments

Schedule source      = challenges.reward_structure.payment_milestones
Context notes        = creator_escrow_comments + extended_brief escrow notes
Funding unit         = escrow_installments row
Aggregate header     = escrow_records row
Only pending rows    = actionable
Funded rows          = immutable
Header status        = derived from installment states
Legacy single-row escrow remains supported
```

---

## Phase 1 — Add additive installment schema

Create new table: `public.escrow_installments`

Required fields:
- `id`
- `challenge_id`
- `escrow_record_id`
- `installment_number`
- `schedule_label`
- `trigger_event`
- `scheduled_pct`
- `scheduled_amount`
- `currency`
- `status` (`PENDING`, `FUNDED`, `RELEASED`, `CANCELLED`)
- `funded_by_role` (`CU`, `FC`)
- `bank_name`
- `bank_branch`
- `bank_address`
- `account_number_masked`
- `ifsc_swift_code`
- `deposit_amount`
- `deposit_date`
- `deposit_reference`
- `proof_document_url`
- `proof_file_name`
- `proof_uploaded_at`
- `fc_notes`
- `funded_at`
- `funded_by`
- `created_at`, `updated_at`, `created_by`, `updated_by`

Required constraints:
- unique `(challenge_id, installment_number)`
- numeric non-negative validations
- `funded_by_role` limited to `CU` / `FC`

Do not remove or replace `escrow_records`. It remains the aggregate header for compatibility.

---

## Phase 2 — RLS and access alignment

### RLS scope
`escrow_installments` gets challenge-role-based RLS consistent with existing challenge access patterns:
- SELECT for active `CR`, `CU`, `FC` on that challenge
- INSERT/UPDATE for active `CU`/`FC` users on that challenge

### Governance enforcement location
Do **not** rely on RLS alone to determine whether CU or FC is the valid funding actor.
Enforce governance-path correctness in the service validation layer:

- STRUCTURED:
  - only Curator path allowed
  - reject writes where `funded_by_role !== 'CU'`
- CONTROLLED:
  - only FC path allowed
  - reject writes where `funded_by_role !== 'FC'`

This protects cases where a user may hold both roles.

---

## Phase 3 — Normalize authored schedule into installment model

Add service-layer normalization from `reward_structure.payment_milestones`.

### Authoritative source
Use:
- `reward_structure.payment_mode`
- `reward_structure.payment_milestones`

Do **not** seed schedule from `extended_brief`.

### Empty milestone behavior
If `payment_mode = 'escrow'` and milestones are empty:
- auto-create one normalized installment:
  - `installment_number = 1`
  - `schedule_label = 'Full Escrow Deposit'`
  - `scheduled_pct = 100`
  - `trigger_event = 'Before publication'`

### Computation
For each installment:
- `scheduled_amount = reward_total × (pct / 100)`

### Context
Also surface:
- `creator_escrow_comments`
- existing `extended_brief.escrow_notes`
as contextual notes only, not funded facts.

---

## Phase 4 — Build installment services and hooks

Add service files under `src/services/cogniblend/escrowInstallments/`:
- `escrowInstallmentTypes.ts`
- `escrowInstallmentNormalizationService.ts`
- `escrowInstallmentAggregateService.ts`
- `escrowInstallmentValidationService.ts`
- `escrowInstallmentWorkspaceService.ts`

Key logic:
- normalize milestones
- default empty schedule to 100% single installment
- derive aggregate status:
  - none funded → `PENDING`
  - some funded → `PARTIALLY_FUNDED`
  - all funded → `FUNDED`
- validate pending-only funding
- validate exact amount linkage to selected installment
- validate proof presence before confirmation
- validate governance ↔ funding-role match

Add hooks:
- `useEscrowInstallments(challengeId)`
- `useSeedEscrowInstallments(challengeId)`
- `useEscrowFundingContext(challengeId)`
- `useEscrowInstallmentFunding(...)`

Refactor:
- `useEscrowDeposit` → header + legacy compatibility role
- `useFcEscrowConfirm` → installment-based mutation or replaced by shared funding hook
- `useFcFinanceSubmit` → checks aggregate installment completion
- Curator completion hook remains separate but depends on installment aggregate state

---

## Phase 5 — Shared installment workspace components

Create reusable UI under `src/components/cogniblend/escrow/`:
- `EscrowInstallmentContextCard.tsx`
- `EscrowInstallmentTable.tsx`
- `EscrowFundingForm.tsx`
- `EscrowInstallmentWorkspace.tsx`
- `EscrowInstallmentSummary.tsx`
- `EscrowLegacySummary.tsx`

### Required shared prop
`EscrowInstallmentWorkspace` must accept:
- `fundingRole: 'CU' | 'FC'`
- governance mode
- challenge context
- installment list
- submission callbacks

This shared prop drives:
- `funded_by_role`
- role-specific copy
- role-specific submit path

### UX rules
- funded installments are read-only
- only pending installments can open the funding form
- installment number is not free-form
- amount is prefilled from schedule and not manually repurposed
- proof and bank details are captured against the selected installment only

---

## Phase 6 — CONTROLLED path in FC Finance Workspace

Update:
- `FcFinanceWorkspacePage.tsx`
- `FcEscrowReviewTab.tsx`
- `FcFinanceSubmitFooter.tsx`

Behavior:
- FC sees Creator/Curator-authored schedule as read-only context
- FC funds pending installments only
- each funding action writes `funded_by_role = 'FC'`
- submit footer enables only when aggregate escrow is complete
- existing “single deposit record” language is replaced with installment-aware copy

`RecommendedEscrowCard` should be refactored or replaced so FC sees:
- authored milestone schedule
- creator escrow comments
- optional curator/context notes
- total funded vs pending

---

## Phase 7 — STRUCTURED path in Curator Compliance Workspace

Update:
- `CuratorComplianceTab.tsx`
- `StructuredFieldsSectionRenderer.tsx`
- `renderOpsSections.tsx`

Behavior:
- Curator finance tab uses the same shared installment workspace
- Curator funds installments directly in STRUCTURED mode
- each funding action writes `funded_by_role = 'CU'`
- no FC workspace dependency in STRUCTURED

This replaces the current passive finance message in Curator Compliance.

---

## Phase 8 — Governance-aware section attribution and routing

Update governance wiring so escrow ownership is no longer hardcoded to FC.

Required updates:
- `SectionPanelItem.tsx`
  - `escrow_funding` coordinator role becomes governance-aware
  - STRUCTURED → `CU`
  - CONTROLLED → `FC`
- `curationSectionDefs.tsx`
  - `escrow_funding` fill rules and render logic become installment-aware
- any send-to-coordinator / modification routing touching `escrow_funding`
- `StructuredFieldsSectionRenderer.tsx`
  - no longer just toggle/read-only
  - acts as renderer/entry point for installment workspace in STRUCTURED

This avoids breaking the current review system’s coordinator mapping.

---

## Phase 9 — Completion RPC and compliance flag alignment

### CONTROLLED
`complete_financial_review`
- validate aggregate installment completion
- preserve existing FC-owned handoff model

### STRUCTURED
`complete_curator_compliance`
- validate aggregate installment completion
- when governance is STRUCTURED, also set:
  - `fc_compliance_complete = true`
  - `curator_compliance_complete = true` (or existing curator completion state)
- keep downstream creator approval / publication behavior intact

This is the safest path because the lifecycle engine already expects both legal and finance gates.

No extra RPC is needed in this iteration unless implementation reveals an unavoidable separation concern.

---

## Phase 10 — Read-only surfaces and preview updates

Update:
- `RecommendedEscrowCard.tsx`
- `EscrowStatusCard.tsx`
- `PreviewEscrowSection.tsx`
- `usePreviewData`
- any readiness or preview surfaces relying only on `escrow_records`

Read-only surfaces should show:
- schedule summary
- funded count / pending count
- total funded
- who funded each installment (`CU`/`FC`) where appropriate
- creator comments/context notes
- legacy summary fallback if no installments exist

---

## Phase 11 — Legacy compatibility and migration safety

Do not break existing challenges already using one-row escrow.

Compatibility rules:
- if `escrow_records` exists and `escrow_installments` does not:
  - render legacy summary
  - keep existing funded state visible
- new installment workflow applies when schedule/installment data exists
- optional backfill can come later, not required for first release

---

## Files to update

### Database / RPC / migrations
- new migration for `escrow_installments`
- update `complete_curator_compliance`
- update `complete_financial_review` if needed for aggregate validation
- RLS policies for `escrow_installments`

### Services / hooks
- `src/hooks/cogniblend/useEscrowDeposit.ts`
- `src/hooks/cogniblend/useFcEscrowConfirm.ts`
- `src/hooks/cogniblend/useFcFinanceSubmit.ts`
- new escrow installment services/hooks

### FC path
- `src/pages/cogniblend/FcFinanceWorkspacePage.tsx`
- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
- `src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx`
- `src/components/cogniblend/fc/RecommendedEscrowCard.tsx`

### Curator path
- `src/components/cogniblend/curation/CuratorComplianceTab.tsx`
- `src/components/cogniblend/curation/renderers/StructuredFieldsSectionRenderer.tsx`
- `src/components/cogniblend/curation/renderers/renderOpsSections.tsx`
- `src/components/cogniblend/curation/SectionPanelItem.tsx`
- `src/lib/cogniblend/curationSectionDefs.tsx`

### Preview / summary
- `src/components/cogniblend/curation/EscrowStatusCard.tsx`
- `src/components/cogniblend/preview/PreviewEscrowSection.tsx`
- `src/components/cogniblend/preview/usePreviewData.ts`

---

## Verification checklist

1. **CONTROLLED**
   - FC sees schedule derived from `payment_milestones`
   - FC can fund only pending installments
   - funded installment becomes immutable
   - submit footer enables only after all required installments are funded

2. **STRUCTURED**
   - Curator sees same installment model inside Curator Compliance
   - Curator funds installments directly
   - completing curator compliance also satisfies finance-complete flag expectations

3. **Empty milestones**
   - system creates one 100% installment automatically
   - no blocking error

4. **Governance enforcement**
   - STRUCTURED rejects `funded_by_role = 'FC'`
   - CONTROLLED rejects `funded_by_role = 'CU'`

5. **Duplicate prevention**
   - same installment cannot be captured twice
   - both DB constraint and service validation protect it

6. **Context visibility**
   - creator-authored schedule is visible downstream
   - `creator_escrow_comments` and escrow notes appear as context
   - notes do not become funded bank details automatically

7. **Legacy safety**
   - existing one-row funded escrow challenges still render correctly

8. **Architecture compliance**
   - no DB access in components
   - business rules in services, not UI
   - hooks remain query/mutation wrappers
   - files stay under 250 lines
   - no `any`
   - all loading/error/empty/success states preserved

---

## Final implementation decision
Proceed with the 11-phase plan as revised above.

The only mandatory additions to lock before execution are:
- STRUCTURED completion also sets finance-complete semantics through `complete_curator_compliance`
- governance-path enforcement lives in service validation
- shared installment workspace receives `fundingRole: 'CU' | 'FC'`

With those added, the plan is aligned to the current system, governance model, lifecycle engine, and Lovable architecture standards without breaking existing functionality.
