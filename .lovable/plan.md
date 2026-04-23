
## Final fix plan — keep selected installment in sync with refetched data so account number persists across edit → save → edit

## Root cause
The remaining bug is not in the mutation anymore. The raw account number is being saved in `useEscrowInstallmentFunding.ts`.

The problem is in `EscrowInstallmentWorkspace.tsx`:
- `selectedInstallment` is stored as a full row object in local state
- after save, queries are invalidated and fresh installment data is fetched
- but the workspace keeps the old selected object as long as the same `id` still exists
- reopening edit therefore passes stale installment data into `EscrowFundingForm`
- result: `buildDefaults()` reads the stale `account_number_raw` value, so the account number appears blank again even though the database row was updated

So the issue is a stale selected-row reference, not a missing save.

## What to change

### 1) Replace object-based selection with ID-based selection
Update `src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx`.

Change local state from:
- `selectedInstallment: EscrowInstallmentRecord | null`

to:
- `selectedInstallmentId: string | null`

Then derive the live selected row from the latest query data:
- `selectedInstallment = context.installments.find(...) ?? null`

This ensures the details card and edit form always use the newest refetched installment record, including the latest `account_number_raw`, proof metadata, and other updated fields.

### 2) Keep selection stable across refetches
Still in `EscrowInstallmentWorkspace.tsx`:
- if the selected ID still exists after refetch, keep it
- if not, fall back to the first selectable installment
- if no installments exist, clear the selected ID

This preserves current UX while fixing stale data.

### 3) Update table selection wiring
`EscrowInstallmentTable.tsx` can stay mostly unchanged, but the workspace should pass:
- `selectedInstallmentId`
- `onSelect={(installment) => setSelectedInstallmentId(installment.id)}`

No business-rule change is needed in the table itself.

### 4) Keep edit-mode reset behavior, but tie it to selected ID
In `EscrowInstallmentWorkspace.tsx`:
- continue resetting `editingFundedId` and `proofFile` when the selected installment changes
- use `selectedInstallmentId` as the effect dependency
- keep the save-success reset of edit mode and proof replacement state

This avoids regression in the existing funded-edit UX.

### 5) Ensure form defaults always come from the latest installment prop
`EscrowFundingForm.tsx` already does:
- `defaultValues: buildDefaults(installment)`
- `form.reset(buildDefaults(installment))` on installment change

That logic is correct. Once the workspace passes the fresh installment object instead of a stale cached one, the account number should repopulate correctly after edit → save → edit.

No service-layer change is needed for this specific bug.

## Files to update
```text
src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx
```

## Files to verify during implementation
```text
src/components/cogniblend/escrow/EscrowFundingForm.tsx
src/components/cogniblend/escrow/EscrowInstallmentTable.tsx
```

## Explicit non-changes
Do not modify:
- `useEscrowInstallmentFunding.ts`
- `escrowInstallmentValidationService.ts`
- database migration / schema
- proof replacement logic

Reason:
- those layers already support raw account persistence and proof continuity
- the current failure is caused by stale presentation-state selection in the workspace

## Expected outcome
After this fix:
- FC edits a funded installment and saves
- refetched installment data becomes the active selected row
- clicking Edit again shows the saved account number correctly
- proof metadata and other edited fields also reflect the latest saved values
- no duplicate rows or access-rule changes are introduced

## Verification checklist
- funded installment with newly entered raw account number:
  - save succeeds
  - closing and reopening edit shows the same account number
- other edited fields also persist across edit → save → edit
- existing proof still shows correctly after save
- replacement proof still works
- pending installment flow remains unchanged
- final read-only still blocks editing
