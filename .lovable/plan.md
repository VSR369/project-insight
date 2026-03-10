

# Replace Proficiency Level with Proficiency Area in Pool Members

## Problem
The Pool Member form/table/filters currently use `md_proficiency_levels` (Junior, Mid-Level, Senior, Principal) but should use `proficiency_areas` (Future & Business Blueprint, Product & Service Innovation, etc.) from the existing taxonomy master data.

## Database Change
- Rename column `proficiency_id` in `platform_provider_pool` to reference `proficiency_areas` instead of `md_proficiency_levels`
- Drop the existing FK constraint to `md_proficiency_levels`, add new FK to `proficiency_areas`

```sql
ALTER TABLE platform_provider_pool
  DROP CONSTRAINT IF EXISTS platform_provider_pool_proficiency_id_fkey;

ALTER TABLE platform_provider_pool
  ADD CONSTRAINT platform_provider_pool_proficiency_area_fkey
  FOREIGN KEY (proficiency_id) REFERENCES proficiency_areas(id);
```

## Frontend Changes

### 1. `src/lib/validations/poolMember.ts`
- Rename field from `proficiency_id` to `proficiency_area_id` (or keep as `proficiency_id` for DB compatibility but update label)

### 2. `src/hooks/queries/usePoolMembers.ts`
- Update `PoolMemberRow`, `PoolMemberInsert`, and filter logic — field stays `proficiency_id` at DB level

### 3. `src/components/admin/marketplace/PoolMemberForm.tsx`
- Replace `useProficiencyLevels()` with `useProficiencyAreas()` or a new hook that fetches from `proficiency_areas`
- Update dropdown label from "Proficiency Level" to "Proficiency Area"
- Populate options from `proficiency_areas` table

### 4. `src/components/admin/marketplace/PoolFilterBar.tsx`
- Replace `useProficiencyLevels()` with proficiency areas hook
- Update filter label from "All Proficiency Levels" to "All Proficiency Areas"

### 5. `src/components/admin/marketplace/PoolMemberTable.tsx`
- Replace `useProficiencyLevels()` with proficiency areas hook for resolving display names
- Update column header from "Proficiency" to "Proficiency Area"

### 6. New hook: `src/hooks/queries/useProficiencyAreasLookup.ts`
- Simple hook to fetch `id, name` from `proficiency_areas` where `is_active = true`, ordered by `display_order`
- Distinct from the admin taxonomy hook — this is a lightweight lookup for dropdowns

No new tables needed — `proficiency_areas` already exists with the correct data.

