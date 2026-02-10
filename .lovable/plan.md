

# Add Departments Master Data Table and Dropdown

## Overview
Convert the "Department" field on the Primary Contact form from a free-text input to a dropdown populated from a new `md_departments` master data table, consistent with how Functional Areas already works.

## Changes

### 1. Database: Create `md_departments` table and seed data

Create a new master data table following the existing `md_functional_areas` pattern:

```sql
CREATE TABLE public.md_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.md_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active departments"
  ON public.md_departments FOR SELECT
  USING (is_active = true);
```

Seed with standard department names:

| Code | Name | Order |
|------|------|-------|
| ENG | Engineering | 1 |
| OPS | Operations | 2 |
| FIN | Finance & Accounting | 3 |
| HR | Human Resources | 4 |
| MKT | Marketing | 5 |
| SALES | Sales | 6 |
| IT | Information Technology | 7 |
| LEGAL | Legal & Compliance | 8 |
| RND | Research & Development | 9 |
| PM | Product Management | 10 |
| CS | Customer Success | 11 |
| SCM | Supply Chain & Logistics | 12 |
| ADMIN | Administration | 13 |
| EXEC | Executive / Leadership | 14 |
| DESIGN | Design & UX | 15 |
| QA | Quality Assurance | 16 |
| DATA | Data & Analytics | 17 |
| PROC | Procurement | 18 |
| COMMS | Communications & PR | 19 |
| OTHER | Other | 99 |

### 2. Frontend: Add `useDepartments` hook

Add a new query hook in `src/hooks/queries/usePrimaryContactData.ts` to fetch departments from the new table, following the same pattern as `useFunctionalAreas`.

### 3. Frontend: Update `PrimaryContactForm.tsx`

Replace the free-text `<Input>` for "Department" with a `<Select>` dropdown populated from `useDepartments()`, matching the Functional Area dropdown pattern.

### 4. Validation Schema Update

Update `src/lib/validations/primaryContact.ts` to change the `department` field from a free-text string to a UUID (department ID) if the DB column should reference the new table, or keep it as the department name string if the `seeker_contacts.department` column stays as `TEXT`.

Since `seeker_contacts.department` is already a `TEXT` column and changing it to a FK would require a migration affecting existing data, the simplest approach is to keep it as `TEXT` but populate it from the dropdown's selected name value.

## Technical Details

- The `md_departments` table follows the exact same structure as `md_functional_areas`
- RLS policy allows anonymous read access (needed for unauthenticated registration flow)
- The "Other" option (code `OTHER`) allows users who don't find their department in the list to still proceed
- The `seeker_contacts.department` column remains `TEXT` -- the selected department name is stored as the value
