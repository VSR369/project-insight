
## Fix plan — preserve existing installment data during edit, including document continuity and editable bank/account fields

## Problem to fix
When FC clicks `Edit funding details` on a funded installment, previously entered values appear lost:

- bank/account fields do not fully repopulate
- the uploaded proof looks missing because the upload zone resets to empty
- FC cannot confidently modify an existing funded installment and replace the proof document

Two distinct causes are visible from the current implementation:

1. `EscrowFundingForm` resets from installment data, but `accountNumber` is always set to `''` because only `account_number_masked` is stored on the installment row.
2. The proof uploader only supports a new local `File`; it does not render the already-uploaded proof as an existing attachment with keep/replace semantics.

## Decision
A UI-only patch is not enough if FC must truly be able to modify all previously entered data. The current schema only preserves the masked account number, so the original full account number cannot be restored into edit mode.

The correct Lovable-aligned fix is:

- add an explicit persisted editable account-number field in the data model
- keep the existing masked field for display
- update the form/workspace so funded edits load existing values
- show the existing uploaded proof as the current document until FC replaces it

## Implementation approach

### Phase 1 — Add persisted editable account-number support in the database
Create a new additive migration for `escrow_installments` and legacy `escrow_records` so edit mode can restore previously entered bank/account data.

Recommended schema addition:
- `account_number_raw text null`

Rules:
- keep existing `account_number_masked` for display surfaces
- on save/update:
  - persist `account_number_raw`
  - derive and persist `account_number_masked`
- do not remove or rename current masked fields

Why this is required:
- without storing a restorable value, edit mode cannot repopulate the account-number input
- the current behavior is not a UI bug alone; the raw value is not available anywhere

### Phase 2 — Update the installment funding mutation to preserve and overwrite correctly
Update `src/hooks/cogniblend/useEscrowInstallmentFunding.ts`.

Required behavior:
- when user enters a new account number:
  - save `account_number_raw`
  - regenerate `account_number_masked`
- when editing a funded installment and FC does not change the account number:
  - preserve the existing stored raw value
  - preserve the masked display value
- keep current delete-before-replace proof behavior
- keep update-on-same-row behavior for corrections

This ensures FC can modify any subset of fields without unintentionally clearing data.

### Phase 3 — Prefill funded edit forms from persisted values
Update `src/components/cogniblend/escrow/EscrowFundingForm.tsx`.

Change `buildDefaults()` so funded edits restore all editable fields from the selected installment, including:
- bank name
- branch
- bank address
- account number from new `account_number_raw`
- IFSC / SWIFT
- deposit date
- deposit reference
- notes
- deposit amount

Behavior:
- pending installment → same first-entry behavior as today
- funded installment in edit mode → full previously entered values preloaded

### Phase 4 — Model proof document as “existing file + optional replacement”
Refine proof handling in `EscrowFundingForm.tsx` and `EscrowInstallmentWorkspace.tsx`.

Current issue:
- `proofFile` is only local replacement state
- the uploader looks empty even when a proof already exists

Required UX:
- show the current proof as an existing attachment block:
  - filename
  - uploaded/already attached state
  - optional open/download action if existing storage URL helper is available
- keep the current document unless FC selects a replacement file
- once a replacement file is picked, clearly show that it will replace the existing proof on save
- allow canceling replacement before submit

This preserves document continuity and makes replacement explicit instead of making the document seem lost.

### Phase 5 — Extend types and context queries for the new editable field
Update the escrow installment typing/query surface so the form can receive the persisted raw account number.

Files to update:
- `src/services/cogniblend/escrowInstallments/escrowInstallmentTypes.ts`
- `src/hooks/cogniblend/useEscrowFundingContext.ts`
- `src/hooks/cogniblend/useEscrowInstallments.ts`
- any preview/read hook that selects installment escrow fields

Additive field:
- `account_number_raw: string | null`

Do not change existing masked-field consumers that are meant for read-only summaries.

### Phase 6 — Keep details card masked, not raw
Update `src/components/cogniblend/escrow/EscrowInstallmentDetailsCard.tsx` only if needed to ensure:
- details view continues to show `account_number_masked`
- raw account number is never displayed in the summary card

This preserves the current safe read-only presentation while still allowing editing.

### Phase 7 — Validation and edit semantics
Update `src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts` so edit-mode behavior is correct.

Rules:
- proof remains required for first confirmation
- existing proof satisfies proof requirement during edit if no replacement file is selected
- account number is valid if either:
  - a new account number is entered, or
  - an existing persisted raw/masked account value already exists for that installment
- funded installments remain editable before final compliance lock

### Phase 8 — Optional document access improvement
If the current app already has a storage URL helper pattern, reuse it so FC can open/download the existing proof directly from the edit panel or details view.

If not already present, add a small hook/service for generating a viewable storage URL for `proof_document_url` in `escrow-proofs`, while keeping DB/storage access out of components.

This is optional for correctness, but recommended for trust and usability.

## Files to update
```text
supabase/migrations/<new_migration>.sql

src/hooks/cogniblend/useEscrowInstallmentFunding.ts
src/hooks/cogniblend/useEscrowFundingContext.ts
src/hooks/cogniblend/useEscrowInstallments.ts

src/services/cogniblend/escrowInstallments/escrowInstallmentTypes.ts
src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts

src/components/cogniblend/escrow/EscrowFundingForm.tsx
src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx
src/components/cogniblend/escrow/EscrowInstallmentDetailsCard.tsx
```

## Explicit non-changes
Do not change:
- installment locking model
- funded aggregate semantics
- one-row-per-installment model
- proof replacement cleanup logic already added in the funding hook

Those parts are already aligned with the earlier approved fix.

## Expected outcome
After this fix:

- clicking `Edit funding details` keeps previously entered bank/deposit data visible
- FC can edit any existing field instead of re-entering from scratch
- the existing uploaded proof remains visibly attached until replaced
- FC can replace the uploaded document without the current proof seeming lost
- read-only details still show masked account information only
- no duplicate installment rows are created

## Verification checklist
- funded installment edit opens with existing bank name, branch, address, IFSC, date, reference, notes
- funded installment edit restores previously entered account number from persisted editable field
- saving without changing account number preserves the prior account details
- existing proof is visible before replacement
- selecting a new proof marks it as replacement, not as a second attachment
- canceling edit does not clear saved installment data
- after save, updated details render correctly in the details card
- final read-only still blocks edits after FC completion
