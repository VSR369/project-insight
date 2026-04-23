
## Revised fix plan — suppress redundant funded-installment form for single-installment escrow, with Claude’s proposal aligned to Lovable architecture

## Decision
Claude’s diagnosis is directionally correct: the immediate cause is in `EscrowInstallmentWorkspace.tsx`, where any editable funded row auto-renders `EscrowFundingForm`. An explicit edit-intent toggle is appropriate.

However, the “only one file needs to change” conclusion is too narrow for Lovable architecture. To avoid misleading UX and keep responsibilities clean, the final fix should be:

- primarily implemented in `EscrowInstallmentWorkspace.tsx`
- optionally refined in `EscrowFundingForm.tsx` for correct “Confirm” vs “Edit” copy
- no business-rule changes in services unless a real schedule-level “Add installment” CTA exists elsewhere

This keeps the existing validated access model intact and applies the fix at the presentation layer, which is the right layer for this issue.

## What the current code confirms
- `EscrowInstallmentWorkspace.tsx` always shows `EscrowFundingForm` whenever `canEditSelectedInstallment` is true.
- `escrowInstallmentAccessService.ts` is correctly allowing funded rows to remain editable before final submit.
- `EscrowInstallmentDetailsCard.tsx` already provides the read-only funded-details view.
- `EscrowFundingForm.tsx` still uses first-entry copy:
  - heading: `Confirm installment {n}`
  - submit CTA: `Confirm installment funding`
- `EscrowInstallmentTable.tsx` already supports the needed selection model with:
  - `Enter details`
  - `View / Edit`
  - `View`

So the main problem is not access control; it is missing UI edit-mode state.

## Final implementation approach

### Phase 1 — Add explicit edit-mode state in the workspace
Update `src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx`.

Add local UI state:
- `editingFundedId: string | null`

Purpose:
- pending installment: form shows immediately
- funded installment: details show by default
- funded installment form only appears after explicit user action

This is a component-level interaction concern, so it belongs in the workspace component, not the service layer.

### Phase 2 — Replace the current auto-show form rule
Change form rendering logic in `EscrowInstallmentWorkspace.tsx` from:
- “editable installment => always show form”

to:
- selected pending installment + editable => show form immediately
- selected funded installment + editable => show details first, and only show form when `editingFundedId === selectedInstallment.id`
- selected funded installment + not editing => show an explicit `Edit funding details` action instead of the form
- final read-only => no edit action

This solves the single-installment case and also improves multi-installment behavior without changing the underlying mutation or access logic.

### Phase 3 — Reset edit mode predictably
Still in `EscrowInstallmentWorkspace.tsx`, reset local edit state when:
- selected installment changes
- funding mutation succeeds
- selection becomes invalid/empty

Also clear `proofFile` when edit mode closes after save/cancel so replacement-proof behavior remains predictable.

### Phase 4 — Keep details-first UX for funded rows
Retain `EscrowInstallmentDetailsCard.tsx` as the primary funded-row view.

Desired behavior:
- one funded installment only:
  - show details card
  - do not auto-show the entry form
  - show `Edit funding details` only if still editable
- multiple installments:
  - selected funded row also shows details first
  - edit remains an explicit action, not an automatic expanded form

This is better than a single-installment-only conditional because it gives a cleaner, consistent UX across all funded rows.

### Phase 5 — Update funding-form copy for edit mode
Update `src/components/cogniblend/escrow/EscrowFundingForm.tsx` so it can distinguish:
- first-time entry for pending installment
- correction of funded installment

Add a small presentation prop such as:
- `mode: 'confirm' | 'edit'`

Then update copy:
- confirm mode:
  - heading: `Confirm installment {n}`
  - CTA: `Confirm installment funding`
- edit mode:
  - heading: `Edit installment {n}`
  - CTA: `Save changes`

This correction is appropriate and improves clarity. It also avoids the false impression that a second installment is being created.

### Phase 6 — Add cancel/edit controls in the workspace
In `EscrowInstallmentWorkspace.tsx`:
- when funded row is not in edit mode:
  - show `Edit funding details` button
- when funded row is in edit mode:
  - show form plus `Cancel edit`

Keep these controls in the workspace rather than moving them into the details card, so the details card remains a pure read-only display component.

### Phase 7 — Review “Add installment” affordance only if it actually exists
Claude’s note that no other files need to change is mostly right for the visible bug, but the user also raised the “Add New installment Escrow” concern.

From the files reviewed, there is no add-installment CTA in the current shared installment workspace. The schedule comes from seeded rows and the table only selects existing installments.

Therefore:
- do not add unnecessary service changes for add/installment rules
- do a targeted search for any FC-only CTA or wrapper component that says “Add New Installment Escrow”
- if found, hide/disable it when `context.installments.length <= 1`
- if not found, no extra architecture change is needed

This keeps the fix scoped and avoids speculative refactors.

## Files to update
```text
src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx
src/components/cogniblend/escrow/EscrowFundingForm.tsx
```

## Files to inspect before implementation
```text
src/components/cogniblend/fc/FcEscrowReviewTab.tsx
src/components/cogniblend/escrow/EscrowInstallmentTable.tsx
```

## Explicit non-changes
Do not modify:
- `escrowInstallmentAccessService.ts`
- `escrowInstallmentValidationService.ts`
- mutation/storage logic in `useEscrowInstallmentFunding.ts`

Reason:
- those layers are already correct for the earlier funded-before-final-submit behavior
- this issue is a presentation-state problem, not an access-rule defect

## Expected outcome
After the fix:
- a funded single-installment schedule shows one clean details view by default
- users no longer see a redundant “Confirm installment 1” form immediately after entering details
- corrections remain possible before final submit, but only after explicit edit intent
- pending installments still open directly into the entry form
- the existing installment model, correction update flow, and audit-safe behavior remain unchanged

## Verification checklist
- single installment, pending:
  - form shows immediately
- single installment, funded, pre-final-submit:
  - details show by default
  - no auto-rendered confirm form
  - `Edit funding details` reveals the form
  - cancel hides the form again
- funded single installment after successful save:
  - edit mode closes
  - details remain visible
- multi-installment schedule:
  - pending rows still open entry flow
  - funded rows show details first, edit only on demand
- final read-only:
  - no edit action shown
- if any FC-specific “Add New Installment Escrow” CTA exists:
  - hidden or disabled when only one seeded installment exists
