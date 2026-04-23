
## Status review — not fully fixed yet

## Overall verdict
Most of the approved fix is implemented in code, but I cannot confirm that **all** problems are fully fixed in every real case.

The main remaining gap is:

- **historical already-funded installments created before the new migration will still not repopulate the raw account number**
  - the migration only adds `account_number_raw`
  - it does **not** backfill old funded rows
  - `EscrowFundingForm` now reads `installment.account_number_raw`
  - if that column is null for older rows, the account-number field will still appear blank in edit mode

So the fix is complete for **newly saved / resaved installments after this change**, but not fully complete for **existing pre-migration funded data**.

## Confirmed implemented

### 1) Persisted editable account number
Confirmed:
- migration adds `account_number_raw` to:
  - `public.escrow_installments`
  - `public.escrow_records`
- `EscrowInstallmentRecord` now includes `account_number_raw`
- query hooks now select `account_number_raw`:
  - `useEscrowFundingContext.ts`
  - `useEscrowInstallments.ts`
  - `usePreviewData.ts`

### 2) Funding mutation preserves and updates account fields
Confirmed in `useEscrowInstallmentFunding.ts`:
- trims submitted account number
- saves `account_number_raw`
- regenerates `account_number_masked` when a new number is entered
- preserves prior raw/masked values if the field is left unchanged during edit

### 3) Funded edit form now preloads saved values
Confirmed in `EscrowFundingForm.tsx`:
- defaults now read:
  - bank name
  - branch
  - address
  - `account_number_raw`
  - IFSC / SWIFT
  - deposit date
  - deposit reference
  - notes
- so for rows that actually have `account_number_raw`, the edit form will repopulate correctly

### 4) Existing proof is shown and replacement is supported
Confirmed in `EscrowFundingForm.tsx` + `EscrowInstallmentWorkspace.tsx`:
- existing proof filename is shown when no replacement file is selected
- UI states that the current proof will be kept unless replaced
- “View current proof” is wired through `useSignedUrl`
- if a new file is chosen, the UI explicitly says it will replace the current proof
- “Keep current proof” clears the replacement selection

### 5) Existing proof satisfies edit validation
Confirmed in `escrowInstallmentValidationService.ts`:
- proof is only required if there is neither:
  - a new uploaded file
  - nor an existing stored proof filename

### 6) Details view remains masked
Confirmed in `EscrowInstallmentDetailsCard.tsx`:
- read-only summary still shows `account_number_masked`
- raw account number is not displayed there

### 7) Proof replacement cleanup remains in place
Confirmed in `useEscrowInstallmentFunding.ts`:
- existing storage object is deleted before a replacement upload
- new file is then uploaded and stored on the same installment row

## Remaining issue

### Historical funded rows are not backfilled
The migration shown is only:

```sql
ALTER TABLE public.escrow_installments
ADD COLUMN IF NOT EXISTS account_number_raw text;

ALTER TABLE public.escrow_records
ADD COLUMN IF NOT EXISTS account_number_raw text;
```

That means:
- older funded installments keep `account_number_raw = null`
- edit mode will still show blank account number for those rows
- this does not fully satisfy the requirement that “already entered data” must appear during edit for existing legacy funded data

Because masked values cannot be reversed into the original account number, this cannot be solved by UI alone.

## Final confirmation
So the correct answer is:

- **No, not fully for all existing cases**
- **Yes, mostly fixed in code for new and future saves**
- **But not fully fixed for pre-migration funded installments unless those rows are backfilled from a trusted source or manually re-entered once**

## Final follow-up fix needed
To fully close the problem, add one of these:
1. a one-time backfill from any trusted raw source if one exists, or
2. an explicit fallback UX for legacy funded rows:
   - show a notice that the original raw account number is unavailable for this older record
   - require FC to re-enter it once
   - then save it into `account_number_raw` for future edits

Without that last step, the “previously entered values appear lost” problem is still partially unresolved for older funded installments.
