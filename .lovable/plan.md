
# Departments CRUD + Department-Linked Functional Areas

## Overview

The `md_departments` table already exists with 20 seed records but has no admin CRUD screen. The `md_functional_areas` table is currently standalone (no `department_id` column). This plan adds a Departments admin page and links functional areas to departments.

## What Changes

### 1. Database Migration

Add `department_id` column to `md_functional_areas`:

```sql
ALTER TABLE md_functional_areas 
  ADD COLUMN department_id UUID REFERENCES md_departments(id);

CREATE INDEX idx_functional_areas_department ON md_functional_areas(department_id);
```

The column is **nullable** so all existing functional area records remain valid (no breaking change). Existing `seeker_contacts` references to `md_functional_areas` are unaffected since the FK relationship is unchanged.

Add admin write policy on `md_departments` (currently only has a SELECT policy):

```sql
CREATE POLICY "Admin full access md_departments"
  ON md_departments FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));
```

Seed department-functional area linkages by updating existing functional area records with matching department IDs (e.g., "Technology" functional area linked to "Information Technology" department).

### 2. New Files: Departments Admin CRUD

Following the exact same pattern as FunctionalAreasPage:

**`src/hooks/queries/useDepartmentsAdmin.ts`** -- CRUD hooks (useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useRestoreDepartment, useHardDeleteDepartment) using `handleMutationError`, `withCreatedBy`/`withUpdatedBy`, and explicit column selection.

**`src/pages/admin/departments/DepartmentsPage.tsx`** -- Standard DataTable page with View/Edit/Deactivate/Delete/Restore actions, identical pattern to FunctionalAreasPage.

**`src/pages/admin/departments/index.ts`** -- Barrel export.

### 3. Modified Files

**`src/pages/admin/functional-areas/FunctionalAreasPage.tsx`**
- Add a "Department" select dropdown to the form (optional field)
- Show department name in the table columns (via Supabase join)
- View dialog shows linked department name

**`src/hooks/queries/useFunctionalAreasAdmin.ts`**
- Update `useFunctionalAreas` query to join `md_departments(name)` and select `department_id`
- Update create/update mutations to include `department_id`

**`src/hooks/queries/useFunctionalAreas.ts`** (registration flow hook)
- Add `department_id` to the select so the registration form can filter functional areas by selected department

**`src/components/admin/AdminSidebar.tsx`**
- Add "Departments" entry to `masterDataItems` array (before Functional Areas)

**`src/App.tsx`**
- Add lazy import for DepartmentsPage
- Add route: `master-data/departments`

**`src/lib/routePrefetch.ts`**
- Add departments route to prefetch registry

### 4. Registration Form Impact (Future -- Not in This Change)

The `PrimaryContactForm.tsx` currently shows all functional areas in a flat dropdown. Once functional areas are linked to departments, the form could filter functional areas by the selected department. However, this is NOT part of this change -- the current form will continue to work because:
- `department_id` is nullable on `md_functional_areas`
- The registration form's `useFunctionalAreas()` hook fetches all active areas regardless
- No existing data or FK relationships are broken

## Non-Breaking Guarantees

| Concern | Why It Is Safe |
|---|---|
| Existing `md_functional_areas` rows | `department_id` is nullable; existing rows get NULL (still valid) |
| `seeker_contacts.department_functional_area_id` FK | Points to `md_functional_areas.id` which is unchanged |
| `seeker_contacts.functional_area_id` FK | Same -- unchanged |
| Registration form functional area dropdown | Continues to fetch all active areas; no filter change |
| Existing RLS policies on `md_functional_areas` | Unchanged; new column is just data |
| `md_departments` existing data | 20 seed records remain; only adding admin write RLS policy |

## Technical Details

### Departments Admin Hook Pattern

```typescript
export function useDepartments(includeInactive = false) {
  return useQuery({
    queryKey: ["departments", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_departments")
        .select("id, code, name, description, display_order, is_active, created_at, updated_at")
        .order("display_order").order("name");
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
```

### Functional Areas Query with Department Join

```typescript
// Updated select in useFunctionalAreasAdmin
supabase.from("md_functional_areas")
  .select("id, code, name, description, department_id, display_order, is_active, created_at, updated_at, md_departments(name)")
```

### Functional Areas Form -- Department Select Field

```typescript
{
  name: "department_id",
  label: "Department",
  type: "select",
  placeholder: "Select department (optional)",
  options: departments.map(d => ({ value: d.id, label: d.name })),
}
```

### Seed Linkage SQL (in migration)

```sql
UPDATE md_functional_areas SET department_id = (
  SELECT id FROM md_departments WHERE code = 'IT'
) WHERE code = 'TECH';
-- ... similar for OPS, FIN, MKT, HR, LEGAL, RND, SCM, SALES
```
