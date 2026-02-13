

# Add Department/Functional Area and Inline Child Org Creation to SaaS Agreements

## Overview

Two enhancements to the SaaS Agreement form:
1. Add **Department** and **Functional Area** dropdown selectors (from existing master data) to each agreement
2. Replace the child org "select-only" dropdown with a **select-or-create** pattern, where a small inline popup captures minimal child org details

---

## 1. Database Migration

The `saas_agreements` table currently lacks `department_id` and `functional_area_id` columns. A migration will add them.

```sql
ALTER TABLE public.saas_agreements
  ADD COLUMN department_id UUID REFERENCES md_departments(id),
  ADD COLUMN functional_area_id UUID REFERENCES md_functional_areas(id);

CREATE INDEX idx_saas_agreements_department ON public.saas_agreements(department_id);
CREATE INDEX idx_saas_agreements_functional_area ON public.saas_agreements(functional_area_id);
```

No migration is needed for child org creation — child orgs are inserted into the existing `seeker_organizations` table with `tenant_id` pointing to the parent org.

---

## 2. Update Zod Schema (`saasAgreement.schema.ts`)

Add two new optional fields:
- `department_id` — UUID string, optional/nullable
- `functional_area_id` — UUID string, optional/nullable

Add a new schema for the inline child org creation popup:

```text
childOrgSchema:
  - organization_name (required, max 200)
  - legal_entity_name (optional, max 200)
  - contact_person_name (optional, max 100)
  - contact_email (optional, email validation)
  - contact_phone (optional, max 20)
  - hq_country_id (optional, UUID)
  - hq_state_province_id (optional, UUID)
  - hq_city (optional, max 100)
  - hq_postal_code (optional, max 20)
  - hq_address_line1 (optional, max 200)
```

---

## 3. New Component: `CreateChildOrgDialog.tsx`

A lightweight dialog for creating a child organization with limited fields:

```text
Dialog Title: "Add Child Organization"

Fields:
  - Organization Name * (text input)
  - Legal Entity Name (text input)
  - Contact Person Name (text input)
  - Contact Email (text input)
  - Contact Phone (text input)
  - Country (select from countries master data)
  - State/Province (select, filtered by country)
  - City (text input)
  - Postal Code (text input)
  - Address Line 1 (text input)

Buttons: Cancel | Create
```

On successful creation:
- Inserts into `seeker_organizations` with `tenant_id = selectedParentOrgId` and `is_active = true`
- Returns the new org's `id`
- Invalidates the org picker query
- Auto-selects the newly created org in the agreement form

---

## 4. New Hook: `useCreateChildOrg` (in `useSaasData.ts`)

A mutation hook that inserts a new `seeker_organizations` row with the limited fields, uses `withCreatedBy`, and invalidates `org-picker-options`.

---

## 5. Update `SaasAgreementFormDialog.tsx`

Changes to the Core Agreement section:

**Child Organization field**: Add a "+" button next to the select dropdown. Clicking it opens the `CreateChildOrgDialog`. After creation, the new org appears in the dropdown and is auto-selected.

**New fields after Child Organization**:

```text
Department (select from md_departments, optional)
Functional Area (select from md_functional_areas filtered by department_id, optional)
```

The Functional Area dropdown is filtered: if a department is selected, only show functional areas belonging to that department. If no department is selected, show all.

---

## 6. Update Query Hook (`useSaasData.ts`)

- Add `department_id`, `functional_area_id` to the `useSaasAgreements` select query
- Add `department_id`, `functional_area_id` to `CreateSaasAgreementParams` and `UpdateSaasAgreementUpdates`
- Join `md_departments(name)` and `md_functional_areas(name)` in the query for display in the table
- Add `useCreateChildOrg` mutation

---

## 7. Update `SaasAgreementPage.tsx`

- Wire `department_id` and `functional_area_id` through `getDefaultValues` and `handleSubmit`
- Pass department/functional area data to the form dialog
- Optionally add Department column to the table (keep table manageable)

---

## Files Changed

| File | Change |
|---|---|
| **Migration** | Add `department_id` and `functional_area_id` columns to `saas_agreements` |
| `src/pages/admin/saas/saasAgreement.schema.ts` | Add `department_id`, `functional_area_id` fields + `childOrgSchema` |
| `src/components/admin/CreateChildOrgDialog.tsx` | **New** — lightweight child org creation dialog |
| `src/components/admin/SaasAgreementFormDialog.tsx` | Add Department/Functional Area selects + "+" button for inline child org creation |
| `src/hooks/queries/useSaasData.ts` | Expand queries/mutations for new columns + `useCreateChildOrg` |
| `src/pages/admin/SaasAgreementPage.tsx` | Wire new fields, pass department/FA data to dialog |

## Technical Notes

- Existing hooks `useDepartments` (from `usePrimaryContactData.ts`) and `useFunctionalAreas` already fetch the master data needed for the dropdowns
- Countries and states hooks (`useCountries`, `useStatesProvinces` from `useRegistrationData.ts`) are reused in the child org creation dialog
- Child orgs are created with `tenant_id = parentOrgId`, inheriting the parent's tenant scope for RLS compliance
- The Functional Area dropdown cascades from Department selection using the `department_id` FK on `md_functional_areas`

