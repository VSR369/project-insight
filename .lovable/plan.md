

# Plan: Separate Phone Fields System-Wide + Fix BR-DEL-002 Orphan Logic

## Problem

Phone numbers are stored/entered as a single combined field (`phone`, `phone_intl`) in most forms except `PrimaryContactForm` (which already has separate `phone_country_code` + `phone_number`). This is confusing for users who don't know the expected format.

Additionally, the BR-DEL-002 orphan count logic needs refinement — it currently counts all roles by an admin instead of only those whose industry tags fall outside the narrowed scope.

## Approach

**No database migrations needed.** The DB stores phone as a single string in all tables (`phone`, `phone_intl`). We will:
1. Create a reusable `PhoneInputSplit` component that renders a country code dropdown (from `countries` master data) + a phone number input side by side
2. On save, concatenate `code + number` into the single DB column
3. On load, parse the stored value back into code + number parts
4. Replace all single-phone-field UIs with this component

## Task 1: Create Reusable `PhoneInputSplit` Component

**New file:** `src/components/ui/PhoneInputSplit.tsx`

- Two-column layout: `[Country Code Dropdown (120px)] [Phone Number Input (flex)]`
- Country code dropdown populated from `useCountries()` master data, showing `phone_code_display` (e.g. "+1 (US)")
- Props: `countryCode`, `phoneNumber`, `onCountryCodeChange`, `onPhoneNumberChange`, `disabled?`
- Helper functions: `parsePhoneIntl(combined: string) → { countryCode, phoneNumber }` and `formatPhoneIntl(code, number) → string`

## Task 2: Update All Phone Forms

Six locations need updating:

| Form | File | Current Field | Change |
|------|------|--------------|--------|
| Admin Contact Profile | `AdminContactProfilePage.tsx` | `phone_intl` single input | Split into code + number, concatenate on save |
| SOA Contact Panel | `SoaContactDetailsPanel.tsx` | `phone_intl` single input | Same |
| Create Delegated Admin | `CreateDelegatedAdminPage.tsx` | `phone` single input | Same |
| SOA Own Profile | `OrgContactProfilePage.tsx` | `phone` single input | Same |
| Admin Change Request | `AdminDetailsTab.tsx` | `new_admin_phone` single input | Same |
| Pool Member Form | Wherever pool member phone is edited | `phone` single input | Same |

For each form:
- Replace the single phone `<Input>` with `<PhoneInputSplit>`
- Update the validation schema to have `phone_country_code` + `phone_number` (UI-only, not DB columns)
- Concatenate on submit: `${code} ${number}` → stored in existing DB column
- Parse on load: split stored value back into code + number for form defaults

**PrimaryContactForm** already has separate fields — no changes needed there.

## Task 3: Update Validation Schemas

- `roleAssignment.ts`: Split `phone_intl` in `adminContactSchema` and `phone` in `soaProfileSchema` into `phone_country_code` + `phone_number`
- `poolMember.ts`: Split `phone` into `phone_country_code` + `phone_number`
- `CreateDelegatedAdminPage.tsx` inline schema: Same split

## Task 4: Fix BR-DEL-002 Orphan Count (EditDelegatedAdminPage.tsx)

Lines 98-110: Currently counts all roles where `created_by === adminId`. Fix to:
- Compute `removedIndustries` from the scope diff
- Filter `roleAssignments` where `domain_tags.industry_id` is in `removedIndustries` specifically
- Only count those as orphaned (roles whose industry falls outside the new narrowed scope)

## Files Changed

| File | Action |
|------|--------|
| `src/components/ui/PhoneInputSplit.tsx` | **Create** — reusable split phone component |
| `src/lib/validations/roleAssignment.ts` | Edit — split phone fields in schemas |
| `src/lib/validations/poolMember.ts` | Edit — split phone field |
| `src/pages/admin/marketplace/AdminContactProfilePage.tsx` | Edit — use PhoneInputSplit |
| `src/components/rbac/SoaContactDetailsPanel.tsx` | Edit — use PhoneInputSplit |
| `src/pages/org/CreateDelegatedAdminPage.tsx` | Edit — use PhoneInputSplit |
| `src/pages/org/OrgContactProfilePage.tsx` | Edit — use PhoneInputSplit |
| `src/components/org-settings/AdminDetailsTab.tsx` | Edit — use PhoneInputSplit |
| `src/pages/org/EditDelegatedAdminPage.tsx` | Edit — fix orphan count logic |

