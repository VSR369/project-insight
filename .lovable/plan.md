

# Complete SaaS Agreement Form — All DB Fields + Validation

## Overview

The `saas_agreements` table has 10 fields that exist in the database but are not exposed in the form, query hooks, or schema. This plan adds every missing field, organizes them into logical collapsible sections, adds agreement-type-specific contextual help, and implements shadow billing cross-validation.

## Current State vs Target

| DB Column | Currently in Form? | Action |
|---|---|---|
| `base_platform_fee` | No | Add to Advanced Fees section |
| `per_department_fee` | No | Add to Advanced Fees section |
| `support_tier_fee` | No | Add to Advanced Fees section |
| `custom_fee_1_label` | No | Add to Custom Fees section |
| `custom_fee_1_amount` | No | Add to Custom Fees section |
| `custom_fee_2_label` | No | Add to Custom Fees section |
| `custom_fee_2_amount` | No | Add to Custom Fees section |
| `msa_reference_number` | No | Add to Contract Details section |
| `msa_document_url` | No | Add to Contract Details section |
| `billing_frequency` | No | Add to Contract Details section |
| Shadow % validation | No | Add cross-agreement sum check |

## Implementation Steps

### 1. Update Zod Schema (`saasAgreement.schema.ts`)

Add all missing fields to the schema:

- `base_platform_fee` — coerce number, min 0, optional/nullable, default 0
- `per_department_fee` — coerce number, min 0, optional/nullable, default 0
- `support_tier_fee` — coerce number, min 0, optional/nullable, default 0
- `custom_fee_1_label` — string, max 100, optional/nullable
- `custom_fee_1_amount` — coerce number, min 0, optional/nullable, default 0
- `custom_fee_2_label` — string, max 100, optional/nullable
- `custom_fee_2_amount` — coerce number, min 0, optional/nullable, default 0
- `msa_reference_number` — string, max 100, optional/nullable
- `msa_document_url` — string, url validation, max 500, optional/nullable
- `billing_frequency` — enum `["monthly", "quarterly", "annually"]`, default "monthly"

Add a `BILLING_FREQUENCIES` constant (separate from `FEE_FREQUENCIES` for clarity, or reuse if identical).

Update `SAAS_AGREEMENT_DEFAULTS` with all new field defaults.

### 2. Refactor Page to Custom Form (`SaasAgreementPage.tsx`)

The generic `MasterDataForm` dialog does not support collapsible sections or conditional field visibility. Replace it with a dedicated `SaasAgreementFormDialog` component that:

- Uses `react-hook-form` + `zodResolver` directly (same pattern as `MasterDataForm` but with layout control)
- Organizes fields into collapsible sections using `Collapsible` from Radix

**Form Layout:**

```text
Section: Core Agreement (always visible)
  - Child Organization (select)
  - Agreement Type (select) + contextual help text
  - Fee Amount + Currency + Fee Frequency (row)
  - Shadow Charge Rate (shown only for shadow_billing / cost_sharing)
  - Billing Frequency (select)

Section: Advanced Fees (collapsible, default collapsed)
  - Base Platform Fee
  - Per Department Fee
  - Support Tier Fee

Section: Custom Fees (collapsible, default collapsed)
  - Custom Fee 1: Label + Amount (row)
  - Custom Fee 2: Label + Amount (row)

Section: Contract Details (collapsible, default collapsed)
  - MSA Reference Number
  - MSA Document URL
  - Start Date + End Date (row)
  - Auto Renew (switch)

Section: Notes (always visible)
  - Notes (textarea)
```

**Agreement Type Help Text:**
- `saas_fee`: "Parent pays a negotiated flat fee to the platform. No internal shadow tracking."
- `shadow_billing`: "Parent pays the platform. Internal department costs are tracked using shadow pricing rates for budgeting (no real money between parent/child)."
- `cost_sharing`: "Parent pays the platform. Child departments transfer their allocated share to the parent externally. The fee amount here defines the child's internal allocation."

**Conditional Visibility:**
- `shadow_charge_rate` field: visible only when `agreement_type` is `shadow_billing` or `cost_sharing`

### 3. Shadow Billing Cross-Validation

When `agreement_type` is `shadow_billing`, validate on submit that the total `shadow_charge_rate` across all existing agreements for the same parent org (plus the current form value) does not exceed 100%.

Implementation:
- Pass existing agreements data to the form dialog as a prop
- On submit, if type is `shadow_billing`, sum all sibling agreements' `shadow_charge_rate` values (excluding the current agreement if editing) + the new value
- If sum > 100, show a toast error and prevent submission
- Display the remaining available percentage as helper text under the `shadow_charge_rate` field

### 4. Update Query Hook (`useSaasData.ts`)

Update `useSaasAgreements` query to select all fields:

```
base_platform_fee, per_department_fee, support_tier_fee,
custom_fee_1_label, custom_fee_1_amount,
custom_fee_2_label, custom_fee_2_amount,
msa_reference_number, msa_document_url, billing_frequency
```

Update `useCreateSaasAgreement` mutation params type to include all new fields.

Update `useUpdateSaasAgreement` mutation params type to include all new fields.

### 5. Update Table Display (`SaasAgreementPage.tsx`)

Add a few key new columns to the agreements table:
- `Billing Freq.` column (the billing_frequency, distinct from fee_frequency)
- `MSA Ref` column showing the msa_reference_number if present

Keep the table manageable; the full details are visible via the Edit dialog.

### 6. Wire Up Submit Handlers

Update `handleSubmit` and `getDefaultValues` in `SaasAgreementPage.tsx` to pass through all new fields to the create/update mutations.

## Files Changed

| File | Change |
|---|---|
| `src/pages/admin/saas/saasAgreement.schema.ts` | Add 10 new fields, update defaults |
| `src/pages/admin/SaasAgreementPage.tsx` | Replace `MasterDataForm` with custom dialog, add table columns, wire new fields, shadow validation |
| `src/hooks/queries/useSaasData.ts` | Expand select, create, update types to include all fields |
| `src/components/admin/SaasAgreementFormDialog.tsx` | **New file** — dedicated form dialog with collapsible sections |

## Technical Notes

- The `MasterDataForm` generic component remains unchanged for use by other admin pages
- The new `SaasAgreementFormDialog` uses `Collapsible` (already installed via `@radix-ui/react-collapsible`)
- Shadow % validation is client-side only (sufficient since RLS + DB constraints handle server-side safety)
- No database migrations needed — all columns already exist
- The `billing_frequency` field is independent from `fee_frequency` (billing_frequency = how often the platform invoices; fee_frequency = the contractual fee period)

