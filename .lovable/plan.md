
## Updated fix plan — FC finance submit failure + escrow detail visibility/editability, with Claude’s corrections folded in

## Decision
Claude’s two corrections are appropriate and align with the current Lovable architecture:

1. **Audit-method fix must be widened to all active audit-writing RPCs**, not just `complete_financial_review`.
2. **Proof replacement must explicitly delete the old storage object first**, following the existing legal-flow deletion pattern.

Both corrections should be added to the existing 9-phase fix plan.

## What the current code confirms
- `useFcFinanceSubmit.ts` is correctly calling `supabase.rpc('complete_financial_review', ...)`; the submit-button failure is not a button-wiring bug.
- The latest installment migration still writes `method = 'rpc'` inside escrow/compliance RPCs, including:
  - `complete_financial_review`
  - `complete_curator_compliance`
- The broader workflow also includes audit-writing RPCs that must be checked in the same pass:
  - `complete_legal_review`
  - `complete_phase`
  - `request_creator_approval`
- `useEscrowInstallmentFunding.ts` still:
  - uploads replacement proof without deleting the old file
  - blocks updates to funded rows with `.eq('status', 'PENDING')`
- Current UI/access rules still treat funded rows as locked too early:
  - `escrowInstallmentValidationService.ts`
  - `escrowInstallmentAccessService.ts`
  - `EscrowInstallmentTable.tsx`
  - `EscrowInstallmentWorkspace.tsx`
  - `fcFinanceWorkspaceViewService.ts`

## Final revised fix plan

### Phase 1 — Audit-trail RPC hardening in one migration
Create a single migration that scans and fixes **all currently active functions that insert into `audit_trail`**.

#### Required rule
Replace every active occurrence of:
- `method = 'rpc'`
- `method = 'RPC'`

with:
- `method = 'HUMAN'`

#### Minimum functions to verify/fix explicitly
- `complete_financial_review`
- `complete_curator_compliance`
- `complete_legal_review`
- `complete_phase`
- `request_creator_approval`

#### Notes
- `sync_escrow_record_from_installments` does not need this change if it does not write to `audit_trail`.
- Do not widen trigger/constraint rules on `audit_trail`; fix callers instead.
- This is the correct Lovable architecture approach because it preserves append-only audit governance and avoids introducing system-wide method drift.

### Phase 2 — Keep “FUNDED” for aggregate math, but move edit-locking to final compliance state
Preserve current aggregate semantics:
- `PENDING` = not yet captured
- `FUNDED` = captured and counted toward aggregate funded state

Change editability semantics:
- funded installments remain editable **until** final review is submitted
- final immutability begins only when the path is complete:
  - FC path: `fc_compliance_complete = true`
  - Curator STRUCTURED path: equivalent final completion state from the challenge context / workspace read-only flag

This avoids schema redesign and keeps rollups/RPC logic intact.

### Phase 3 — Refactor service-layer validation/access rules
Update:
- `src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts`
- `src/services/cogniblend/escrowInstallments/escrowInstallmentAccessService.ts`

#### Validation changes
Add pure helpers such as:
- `isInstallmentLockedForEditing`
- `canEditFundedInstallmentBeforeFinalSubmit`
- `canSelectInstallment`
- `canSubmitEscrowPath`

#### Rules to enforce
- governance ownership remains unchanged:
  - STRUCTURED → `CU`
  - CONTROLLED → `FC`
- funded rows are **not** automatically immutable
- funded rows are editable only while the challenge path remains open
- proof is required for first confirmation
- deposit amount must still match selected installment exactly
- existing proof may satisfy proof requirement when editing a funded row without replacing the file

#### Access-state changes
Replace the current “pending-only actionable” model with:
- `selectableInstallments`
- `editableInstallments`
- `pendingInstallments`
- `fundedInstallments`
- `canSubmitPath`
- `isFinalReadOnly`

### Phase 4 — Make the installment mutation support correction updates + explicit proof cleanup
Update:
- `src/hooks/cogniblend/useEscrowInstallmentFunding.ts`

#### Correction from Claude — mandatory
Implement a **delete-before-replace** storage pattern matching the legal workflow (`useDeleteSourceDoc`):

1. If a new proof file is being uploaded and the selected installment already has `proof_document_url`:
   - call  
     `supabase.storage.from('escrow-proofs').remove([oldProofPath])`
2. Upload the new file
3. Update the row with:
   - `proof_document_url`
   - `proof_file_name`
   - `proof_uploaded_at`

#### Mutation behavior changes
- remove the strict `.eq('status', 'PENDING')` gate
- allow updates to the selected installment while the path is not finally locked
- first confirm:
  - set `status = 'FUNDED'`
  - populate funding metadata
- pre-submit correction:
  - keep `status = 'FUNDED'`
  - overwrite editable fields on the same row
- after final compliance:
  - reject edits in service validation before mutation executes

#### Additional safeguard
If storage delete fails, treat it as a mutation error instead of silently orphaning files.

### Phase 5 — Add explicit detail visibility for entered bank/deposit/proof data
Create:
- `src/components/cogniblend/escrow/EscrowInstallmentDetailsCard.tsx`

Update:
- `EscrowInstallmentWorkspace.tsx`
- keep `EscrowFundingForm.tsx` focused on edit input only

#### Detail card contents
For the selected installment, show:
- installment number / label / trigger / amount
- bank name
- branch
- bank address
- masked account number
- IFSC/SWIFT
- deposit date
- deposit reference
- proof file name
- notes
- funded by role
- funded at timestamp

#### State rules
- pending row selected:
  - show editable form
- funded row selected and path still open:
  - show details + editable form
- funded row selected and path finally complete:
  - show read-only details only

### Phase 6 — Fix table selection and action labels
Update:
- `src/components/cogniblend/escrow/EscrowInstallmentTable.tsx`

#### New behavior
Rows should remain selectable beyond `PENDING`.

#### Labels
- pending + editable → `Enter details`
- funded + editable → `View / Edit`
- funded + final-locked → `View`

#### Interaction rules
- remove the current “funded = Locked” behavior
- selection should work for funded rows so users can review entered details
- editing enablement must come from service-layer access state, not inline table heuristics

### Phase 7 — Align FC workspace lock semantics with final submit, not aggregate funded
Update:
- `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
- `src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx`

#### Required change
Do not treat aggregate funded state as read-only.

#### New state model
- aggregate funded:
  - enables `Submit Financial Review`
  - does **not** lock edits
- final financial review submitted:
  - locks edits
- workspace should pass explicit final-read-only state into the shared escrow UI

### Phase 8 — Preserve duplicate prevention while allowing corrections
No new rows should be created for a funded installment.

#### Rule
- one row per `(challenge_id, installment_number)` remains the authoritative model
- corrections are always `UPDATE`s to the same installment row
- no duplicate “recapture” flow

This preserves the existing uniqueness model and avoids breaking aggregate calculations.

### Phase 9 — Verification / regression checklist
Verify all of the following after implementation:

#### A. Audit/RPC coverage
- `complete_financial_review` succeeds without `Invalid method: rpc`
- `complete_curator_compliance` still succeeds
- `complete_legal_review` still succeeds
- `request_creator_approval` still succeeds
- `complete_phase` continues to work where it writes audit rows

#### B. FC installment UX
- selecting a pending installment shows editable funding form
- confirming a pending installment marks it funded
- selecting a funded installment shows entered details
- funded installment can be corrected before final submit
- replacing proof deletes the old storage object before uploading the new one
- no orphan proof files accumulate from replacement flow

#### C. Final lock behavior
- once `fc_compliance_complete = true`, funded installment edits are blocked
- `Submit Financial Review` remains disabled until aggregate installment status is fully funded
- funded aggregate alone does not lock the form

#### D. Legacy and governance safety
- legacy `escrow_records` fallback still renders safely
- STRUCTURED remains Curator-owned
- CONTROLLED remains FC-owned
- no component performs direct Supabase storage/DB work outside hooks

## Files to update
```text
supabase/migrations/<new_migration>.sql

src/hooks/cogniblend/useFcFinanceSubmit.ts
src/hooks/cogniblend/useEscrowInstallmentFunding.ts

src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts
src/services/cogniblend/escrowInstallments/escrowInstallmentAccessService.ts
src/services/cogniblend/fcFinanceWorkspaceViewService.ts

src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx
src/components/cogniblend/escrow/EscrowInstallmentTable.tsx
src/components/cogniblend/escrow/EscrowFundingForm.tsx
src/components/cogniblend/fc/FcEscrowReviewTab.tsx
```

## File to create
```text
src/components/cogniblend/escrow/EscrowInstallmentDetailsCard.tsx
```

## Final execution directive
Proceed with the existing 9-phase fix plan, but lock in these two required corrections:

1. **Migration must scan/fix every active `audit_trail` insert using `rpc/RPC` across relevant workflow RPCs, not just `complete_financial_review`.**
2. **`useEscrowInstallmentFunding.ts` must implement explicit delete-before-replace cleanup for proof files in `escrow-proofs`, matching the legal workflow deletion pattern.**

With those additions, the plan is aligned to Lovable architecture, preserves the current installment model, avoids storage leaks, and fixes the FC workflow without tampering with existing lifecycle or governance behavior.
