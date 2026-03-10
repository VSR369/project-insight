

# Fix: Remove All Hardcoded Values, Use Master Data

## Problems Found

| File | Hardcoded Data | Fix |
|------|---------------|-----|
| `src/lib/validations/poolMember.ts` | `SLM_ROLE_CODES` array, `SLM_ROLE_LABELS` map | Remove exports; change `z.enum()` to `z.string().min(1)` |
| `src/components/admin/marketplace/PoolMemberForm.tsx` | Imports `SLM_ROLE_CODES`/`SLM_ROLE_LABELS` for checkbox rendering | Use `useSlmRoleCodes()` hook instead |
| `src/components/admin/marketplace/PoolFilterBar.tsx` | Imports `SLM_ROLE_LABELS` for role dropdown + hardcoded `AVAILABILITY_OPTIONS` array | Use `useSlmRoleCodes()` for roles; create `md_availability_statuses` table + hook for availability |
| `src/components/admin/marketplace/RoleBadge.tsx` | `ROLE_STYLES` with hardcoded labels ("Architect", "Curator", etc.) | Accept `label` prop from parent (which has master data); keep color mapping by code as visual config |
| `src/components/admin/marketplace/AvailabilityBadge.tsx` | `STATUS_CONFIG` with hardcoded labels | Accept `label` prop; colors stay as visual config |

## Database Change

Create **`md_availability_statuses`** master data table (does not exist yet):

```sql
CREATE TABLE md_availability_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color_class TEXT,        -- e.g. "emerald", "amber", "red" for UI mapping
  display_order INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO md_availability_statuses (code, display_name, color_class, display_order) VALUES
  ('available', 'Available', 'emerald', 1),
  ('partially_available', 'Partially Available', 'amber', 2),
  ('fully_booked', 'Fully Booked', 'red', 3);
```

## File Changes

### 1. `src/lib/validations/poolMember.ts`
- Remove `SLM_ROLE_CODES`, `SlmRoleCode`, `SLM_ROLE_LABELS` exports
- Change `role_codes` to `z.array(z.string().min(1)).min(1, "At least one role required")`

### 2. `src/hooks/queries/useAvailabilityStatuses.ts` (new)
- Fetch from `md_availability_statuses` with `is_active = true`, ordered by `display_order`
- Same pattern as `useProficiencyLevels`

### 3. `src/components/admin/marketplace/PoolMemberForm.tsx`
- Replace `SLM_ROLE_CODES`/`SLM_ROLE_LABELS` with `useSlmRoleCodes()` hook
- Render checkboxes from `roleCodes.map(r => r.code, r.display_name)`

### 4. `src/components/admin/marketplace/PoolFilterBar.tsx`
- Replace `SLM_ROLE_LABELS` import with `useSlmRoleCodes()` for role dropdown
- Replace `AVAILABILITY_OPTIONS` with `useAvailabilityStatuses()` for availability dropdown

### 5. `src/components/admin/marketplace/RoleBadge.tsx`
- Add `label` prop; use it for display text instead of hardcoded labels
- Keep color mapping by code (visual concern, not data duplication)

### 6. `src/components/admin/marketplace/AvailabilityBadge.tsx`
- Add `label` prop; use it for display text
- Keep color mapping by code

### 7. `src/components/admin/marketplace/PoolMemberTable.tsx`
- Use `useSlmRoleCodes()` to build a code-to-label map
- Pass `label` prop to `RoleBadge`
- Use `useAvailabilityStatuses()` to build a code-to-label map
- Pass `label` prop to `AvailabilityBadge`

No other hardcoded master data found in the marketplace components. Industries and proficiency levels already use database hooks correctly.

