

## SaaS Agreement Admin Page -- Compliance Overhaul

### Current State (Problems Found)

The existing `SaasAgreementPage.tsx` has **14 violations** against the project's Enterprise Architecture standards:

| # | Issue | Standard Violated |
|---|-------|-------------------|
| 1 | Raw UUID text input for child org | UX / usability |
| 2 | No Zod validation schema | Section 8.1 (mandatory Zod + RHF) |
| 3 | No React Hook Form usage | Section 8.1 |
| 4 | No `withCreatedBy` / `withUpdatedBy` audit fields | Section 24.1 |
| 5 | Hardcoded `DEMO_PARENT_ORG_ID` / `DEMO_TENANT_ID` | Should use auth context |
| 6 | Manual `useState` for form state | Section 6.2 (forms must use RHF) |
| 7 | No inline validation or error messages | Section 8.1 |
| 8 | No loading/empty/error states on dialog | Section 7.2 |
| 9 | Missing table overflow wrapper | Section 9.3 |
| 10 | No edit dialog -- only create | Section 7.4 (CRUD incomplete) |
| 11 | Missing `starts_at` / `ends_at` date fields in form | Schema columns exist but are unused |
| 12 | Missing `auto_renew` toggle | Schema column exists but is hardcoded to `true` |
| 13 | `useSaasData.ts` hook uses `select('*')` pattern | Section 16.2 (no `SELECT *`) |
| 14 | Multiple additional schema columns ignored (MSA ref, custom fees, etc.) | Incomplete feature coverage |

---

### Implementation Plan

#### Task 1: Create Zod Validation Schema

Create a new file `src/pages/admin/saas/saasAgreement.schema.ts`:

- `saasAgreementSchema` with all form fields validated:
  - `child_organization_id` -- required UUID
  - `agreement_type` -- enum: `saas_fee | shadow_billing | cost_sharing`
  - `fee_amount` -- coerced number, min 0
  - `fee_currency` -- 3-char uppercase string
  - `fee_frequency` -- enum: `monthly | quarterly | annually`
  - `shadow_charge_rate` -- optional number, 0-100
  - `starts_at` -- optional date string
  - `ends_at` -- optional date string, must be after `starts_at` via `.refine()`
  - `auto_renew` -- boolean, default `true`
  - `notes` -- optional string, max 500 chars
- Export `SaasAgreementFormValues` type inferred from schema

#### Task 2: Create Org Picker Hook

Create `src/hooks/queries/useOrgPicker.ts`:

- `useOrgPickerOptions(tenantId)` -- fetches `seeker_organizations` with explicit columns: `id, organization_name, legal_entity_name`
- Returns `{ value: id, label: organization_name }` array for use in select dropdowns
- Filters to active orgs only
- Used for both parent and child org selection

#### Task 3: Fix `useSaasData.ts` Hook -- Remove `select('*')`

Update `useSaasAgreements`:
- Replace the existing select with explicit columns: `id, agreement_type, lifecycle_status, fee_amount, fee_currency, fee_frequency, shadow_charge_rate, starts_at, ends_at, auto_renew, notes, created_at, child_organization_id, parent_organization_id`
- Keep the join: `seeker_organizations!saas_agreements_child_organization_id_fkey(id, organization_name)`

Update `useCreateSaasAgreement`:
- Add `withCreatedBy()` call before insert
- Expand accepted params to include `starts_at, ends_at, auto_renew`

Update `useUpdateSaasAgreement`:
- Add `withUpdatedBy()` call before update

#### Task 4: Rewrite `SaasAgreementPage.tsx`

Complete rewrite following project standards:

**Form Dialog (Create + Edit)**:
- Use `MasterDataForm` pattern (React Hook Form + Zod resolver)
- Replace raw UUID input with a searchable `Select` dropdown populated by `useOrgPickerOptions`
- Add `starts_at` and `ends_at` date inputs
- Add `auto_renew` switch toggle
- Disable submit during mutation, show spinner
- Inline validation error messages under each field

**Data Table**:
- Wrap table in `<div className="relative w-full overflow-auto">`
- Add edit button per row (opens dialog pre-filled with row data)
- Show `starts_at` / `ends_at` columns
- Show `auto_renew` as a badge

**Page Structure**:
- Replace hardcoded `DEMO_PARENT_ORG_ID` with a parent org selector at top of page (using `useOrgPickerOptions`)
- Loading skeleton while data fetches
- Empty state with icon and CTA
- Error state with retry

**Hook Order Compliance** (Section 23):
1. `useState` (dialog open, selected agreement)
2. Custom hooks (`useOrgPickerOptions`)
3. Form hook (`useForm`)
4. Query/Mutation hooks
5. `useEffect` (if needed)
6. Conditional returns (loading/error)
7. Handlers
8. Render

#### Task 5: Responsive Design Compliance

- Dialog: `max-w-lg max-h-[90vh] flex flex-col overflow-hidden`
- Grid for fee amount + currency: `grid grid-cols-1 lg:grid-cols-2 gap-3`
- Button text: icon-only on mobile, label visible at `lg:`
- Table wrapped with overflow-auto

---

### Files Changed

| File | Action |
|------|--------|
| `src/pages/admin/saas/saasAgreement.schema.ts` | **New** -- Zod schema |
| `src/hooks/queries/useOrgPicker.ts` | **New** -- Org picker dropdown hook |
| `src/hooks/queries/useSaasData.ts` | **Edit** -- Explicit columns, audit fields |
| `src/pages/admin/SaasAgreementPage.tsx` | **Rewrite** -- Full compliance overhaul |

