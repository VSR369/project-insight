

# Dynamic Agreement Scope: Parent-Only vs Parent-Child with Context-Aware Departments

## Problem Analysis

The current form always requires a child organization. The user needs two distinct scenarios:

| Scenario | Child Org | Dept/FA Context | Use Case |
|---|---|---|---|
| **Parent Internal** | None (skipped) | Parent org's own departments | Parent org allocating costs across its own internal departments |
| **Parent to Child** | Required | Child org's departments | Parent org defining agreements with subsidiary/child orgs |

### Key Constraint

`child_organization_id` is currently `NOT NULL` in the database. A migration is needed to make it nullable.

---

## UX Design

### Agreement Scope Toggle

A radio group at the top of the Core Agreement section determines the mode:

```text
Agreement Scope:
  ( ) Internal Department — Assign fees to a department within the parent organization
  ( ) Child Organization  — Create an agreement with a child/subsidiary organization
```

### Behavior by Mode

**Internal Department mode:**
- Child Organization field: hidden
- Department label: "Department"
- Functional Area label: "Functional Area"
- Section header hint: "Allocate fees to an internal department of [Parent Org Name]"

**Child Organization mode:**
- Child Organization field: visible (with "+" create button)
- Department label: "Department (Child Org)"
- Functional Area label: "Functional Area (Child Org)"
- Section header hint: "Define fee terms with a child organization"

### Visual Flow

```text
+-----------------------------------------------+
| Agreement Scope                                |
|  (o) Internal Department                       |
|  ( ) Child Organization                        |
|                                                |
| "Allocate fees to an internal department       |
|  of Acme Corp"                                 |
|                                                |
| [Department v]  [Functional Area v]            |
| [Agreement Type v]  (help text)                |
| ...remaining fields...                         |
+-----------------------------------------------+
```

vs.

```text
+-----------------------------------------------+
| Agreement Scope                                |
|  ( ) Internal Department                       |
|  (o) Child Organization                        |
|                                                |
| [Child Organization v] [+]                     |
|                                                |
| [Dept (Child Org) v]  [FA (Child Org) v]       |
| [Agreement Type v]  (help text)                |
| ...remaining fields...                         |
+-----------------------------------------------+
```

---

## Implementation Steps

### 1. Database Migration

Make `child_organization_id` nullable:

```sql
ALTER TABLE public.saas_agreements
  ALTER COLUMN child_organization_id DROP NOT NULL;
```

### 2. Update Zod Schema (`saasAgreement.schema.ts`)

- Add `agreement_scope` field: `z.enum(["internal", "child_org"])`, default `"child_org"`
- Change `child_organization_id` from required UUID to optional/nullable UUID
- Add a `.refine()`: if `agreement_scope === "child_org"` then `child_organization_id` is required
- Add `AGREEMENT_SCOPES` constant for the radio options
- Update `SAAS_AGREEMENT_DEFAULTS` with `agreement_scope: "child_org"`

### 3. Update Form Dialog (`SaasAgreementFormDialog.tsx`)

- Add `RadioGroup` for agreement scope at the top of Core Agreement
- Show contextual hint text below the radio based on selected scope (include parent org name)
- Conditionally show/hide the Child Organization selector based on scope
- Update Department and Functional Area labels dynamically based on scope
- Accept `parentOrgName` as a new prop for contextual hint text
- When scope changes from "child_org" to "internal", clear `child_organization_id` to null
- When scope changes from "internal" to "child_org", clear `department_id` and `functional_area_id` (different context)

### 4. Update Query Hook (`useSaasData.ts`)

- Make `child_organization_id` optional in `CreateSaasAgreementParams`
- Handle null `child_organization_id` in query results gracefully

### 5. Update Page (`SaasAgreementPage.tsx`)

- Pass `parentOrgName` to the form dialog (resolve from `orgOptions` using `selectedParentOrgId`)
- Update `getDefaultValues` to derive `agreement_scope` from whether `child_organization_id` is present
- Update table: show "Internal" badge when `child_organization_id` is null instead of org name

### 6. Update Types (`useSaasData.ts`)

- `child_organization_id` becomes optional in `CreateSaasAgreementParams`
- Handle nullable child org in table rendering

---

## Files Changed

| File | Change |
|---|---|
| **Migration** | `ALTER COLUMN child_organization_id DROP NOT NULL` |
| `src/pages/admin/saas/saasAgreement.schema.ts` | Add `agreement_scope`, make `child_organization_id` optional, add conditional refinement |
| `src/components/admin/SaasAgreementFormDialog.tsx` | Add scope radio, conditional child org visibility, dynamic labels, accept `parentOrgName` prop |
| `src/hooks/queries/useSaasData.ts` | Make `child_organization_id` optional in create params |
| `src/pages/admin/SaasAgreementPage.tsx` | Pass `parentOrgName`, derive `agreement_scope` in defaults, update table display |

## Technical Notes

- `agreement_scope` is a UI-only field (not stored in DB) — it is derived from `child_organization_id` being null or not
- The `RadioGroup` component from `@radix-ui/react-radio-group` is already installed
- Department and Functional Area master data is shared (not org-specific), so the same `useDepartments` and `useFunctionalAreas` hooks work for both scenarios
- Clearing fields on scope change prevents stale cross-context references

