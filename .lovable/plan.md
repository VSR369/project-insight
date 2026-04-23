
Implementation status review against the approved 9-phase FC escrow fix plan:

## Overall verdict
The approved fix is implemented in code for the core problem areas. The only items I cannot fully certify from read-only inspection are runtime outcomes that require executing the app/DB flow.

## Confirmed implemented

### Phase 1 — Audit-trail RPC hardening
Confirmed in:
- `supabase/migrations/20260423135648_2ffbde82-bfab-4b47-bba4-d8d11c3c6904.sql`

Verified functions now write valid audit methods:
- `complete_curator_compliance` → `HUMAN`
- `complete_legal_review` → `HUMAN`
- `complete_financial_review` → `HUMAN`
- `request_creator_approval` → `HUMAN`
- `complete_phase` → `HUMAN` / `SYSTEM`

I also searched the new migration for `'rpc'/'RPC'` and found no remaining occurrences.

### Phase 2 — FUNDED kept for aggregate, locking moved to final compliance
Confirmed in:
- `src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts`
- `src/services/cogniblend/escrowInstallments/escrowInstallmentAccessService.ts`

Implemented behavior:
- `FUNDED` rows remain selectable
- funded rows can remain editable before final submit
- final lock is driven by `isFinalReadOnly`, not by funded status alone

### Phase 3 — Validation/access refactor
Confirmed in:
- `escrowInstallmentValidationService.ts`
- `escrowInstallmentAccessService.ts`

Verified helpers/rules:
- `canSelectInstallment`
- `canEditFundedInstallmentBeforeFinalSubmit`
- `isInstallmentLockedForEditing`
- `canCompleteEscrowPath`
- role mapping remains:
  - STRUCTURED → `CU`
  - CONTROLLED → `FC`

Access state now includes:
- `selectableInstallments`
- `editableInstallments`
- `pendingInstallments`
- `fundedInstallments`
- `canSubmitPath`
- `isFinalReadOnly`

### Phase 4 — Mutation supports corrections + proof cleanup
Confirmed in:
- `src/hooks/cogniblend/useEscrowInstallmentFunding.ts`

Verified:
- old proof is deleted before replacement:
  - `supabase.storage.from('escrow-proofs').remove([oldPath])`
- replacement upload then updates:
  - `proof_document_url`
  - `proof_file_name`
  - `proof_uploaded_at`
- `.eq('status', 'PENDING')` restriction is removed
- updates target only `.eq('id', args.installment.id)`

This means funded rows can be corrected pre-lock.

### Phase 5 — Installment detail visibility
Confirmed created:
- `src/components/cogniblend/escrow/EscrowInstallmentDetailsCard.tsx`

Confirmed wired in:
- `src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx`

Visible detail fields include:
- label / trigger / amount
- bank name / branch / address
- masked account
- IFSC / SWIFT
- deposit date / reference
- proof file
- notes
- funded by / funded at

### Phase 6 — Table selection + action labels
Confirmed in:
- `src/components/cogniblend/escrow/EscrowInstallmentTable.tsx`

Verified labels:
- pending → `Enter details`
- funded editable → `View / Edit`
- funded locked → `View`

Rows remain selectable beyond `PENDING`.

### Phase 7 — FC workspace no longer locks on aggregate funded
Confirmed in:
- `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
- `src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx`

Verified:
- editability is based on `fcComplianceComplete` / `fcDone`
- funded aggregate enables submit but does not itself lock the form
- workspace passes `isReadOnly={fcDone}`

### Phase 8 — Duplicate prevention preserved
Confirmed by current mutation pattern:
- updates existing installment by row id
- does not insert duplicate funded rows
- corrections are updates to the same installment

### Phase 9 — Verification checklist coverage in code
Code supports these outcomes:
- submit path gated by aggregate funded state
- funded installments can be corrected before final submit
- final lock occurs after FC completion
- storage replacement cleanup exists
- legacy fallback logic still exists in the workspace via `isLegacyEscrowOnly`

## Confirmed but worth noting

### `useFcFinanceSubmit.ts`
This file was not materially changed, but that is acceptable.
Reason:
- it was already correctly calling `supabase.rpc('complete_financial_review', ...)`
- the actual bug was in the RPC audit method, which was fixed in the migration

### `EscrowFundingForm.tsx`
This file remains focused on edit input, which matches the approved plan.
The details display responsibility now sits in `EscrowInstallmentDetailsCard.tsx`.

## What I cannot fully certify in read-only mode
These require runtime or DB execution, so I can only say the code appears correct:

1. `complete_financial_review` now succeeds end-to-end in the live DB
2. `complete_curator_compliance`, `complete_legal_review`, `request_creator_approval`, and `complete_phase` all execute successfully after the migration
3. old proof files are actually removed in storage under real user flows
4. no regression exists in downstream screens beyond the files inspected

## Final confirmation
Yes — the approved fix plan appears implemented in code for the items you listed, including Claude’s two corrections:
1. audit-method hardening was widened across the relevant workflow RPCs
2. proof replacement now explicitly deletes the old file before upload

The remaining uncertainty is only runtime verification, not missing implementation.
