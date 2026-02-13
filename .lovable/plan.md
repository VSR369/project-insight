

# Fix Required Field Validation on Both Forms

## Problem

Both forms can be submitted without meaningful data because:

1. **Enterprise Agreement form**: Most "required" fields have valid defaults pre-filled (fee_amount=0, agreement_type="saas_fee", currency="USD", frequencies="monthly"). The form submits successfully without the user entering anything meaningful. Additionally, `fee_amount` accepts 0, and `department_id`/`functional_area_id` are fully optional.

2. **Child Organization form**: The Zod schema requires `organization_name` (min 1 char) and `hq_country_id` (valid UUID), which should block submission. If it's still saving, the issue may be in how empty string defaults interact with Zod validation on blur vs submit. Need to verify and tighten.

## Changes

### 1. Schema Tightening (`saasAgreement.schema.ts`)

**Enterprise Agreement schema** -- add stricter required field validation:
- `fee_amount`: Change from `.min(0)` to `.positive("Fee amount must be greater than zero")` -- a zero-dollar agreement is not meaningful
- `department_id`: Make required (non-nullable) -- every agreement must be linked to a department per the architecture notes
- `functional_area_id`: Make required (non-nullable) -- same reasoning
- Add a refine for internal scope requiring `department_id`

**Child Org schema** -- no schema changes needed (already correct), but verify the form's default values align with the schema expectations.

### 2. Form Default Values

- Change `department_id` and `functional_area_id` defaults from `null` to `""` (empty string) so they fail the UUID validation when not selected
- Keep `fee_amount` default at 0 so the field displays but fails the new `positive()` check on submit

### 3. UI Updates (`SaasAgreementFormDialog.tsx`)

- Add `*` required indicator to Department and Functional Area field labels
- Add `*` required indicator to Fee Amount label (already has it)

### 4. Select Component Fix

The `__none__` sentinel value used in Department/Functional Area selects needs to be removed or adjusted -- currently when a user selects "-- None --" it sets the value to `null`, which bypasses the required UUID check. Remove the "-- None --" option for these now-required fields, or change the placeholder to prompt selection.

## Technical Details

### File: `src/pages/admin/saas/saasAgreement.schema.ts`

- `fee_amount`: `.min(0)` becomes `.positive("Fee amount must be greater than zero")`
- `department_id`: `z.string().uuid().optional().nullable()` becomes `z.string().uuid("Please select a department").or(z.literal(""))` with a refine ensuring it's provided
- `functional_area_id`: Same pattern as department_id
- Add refine: department_id must be a valid UUID (not empty) for all scopes
- Add refine: functional_area_id must be a valid UUID (not empty) for all scopes
- Update `SAAS_AGREEMENT_DEFAULTS`: `department_id: ""`, `functional_area_id: ""`

### File: `src/components/admin/SaasAgreementFormDialog.tsx`

- Add `*` to Department and Functional Area labels
- Remove "-- None --" option from Department and Functional Area selects (or change sentinel handling)
- When department/functional_area value is `""`, treat as unselected in the Select component

### File: `src/pages/admin/SaasAgreementPage.tsx`

- Update `getDefaultValues` to return `""` instead of `null` for department_id/functional_area_id when the agreement has no value set

### File: `src/components/admin/CreateChildOrgDialog.tsx`

- No changes needed -- the schema already requires `organization_name` and `hq_country_id`. If the form is still saving without them, the issue is likely in the form's interaction with empty strings, which the current default of `""` for `hq_country_id` should already trigger validation failure on submit.

## Summary of Required Fields After Fix

| Field | Enterprise Agreement | Child Organization |
|---|---|---|
| Child Organization | Required (child_org scope) | N/A |
| Department | Required (all scopes) | N/A |
| Functional Area | Required (all scopes) | N/A |
| Agreement Type | Required (pre-selected) | N/A |
| Fee Amount | Required, must be > 0 | N/A |
| Fee Currency | Required (pre-filled USD) | N/A |
| Fee Frequency | Required (pre-selected) | N/A |
| Billing Frequency | Required (pre-selected) | N/A |
| Organization Name | N/A | Required |
| Country | N/A | Required |

