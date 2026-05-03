## Deactivate duplicate "College" org type

Both `College` rows in `organization_types` are currently `is_active = false`, so neither shows in the Organization Type picker — that's why "College" disappeared. We need to keep one active.

### Action
Run a single update migration:
- Set `is_active = true` for code **`COLLEGE`** (canonical, matches naming pattern of `SCHOOL`/`UNI`).
- Leave code **`COL`** as `is_active = false` (legacy duplicate, no organizations reference it).

```sql
UPDATE public.organization_types SET is_active = true,  updated_at = now() WHERE code = 'COLLEGE';
UPDATE public.organization_types SET is_active = false, updated_at = now() WHERE code = 'COL';
```

### Result
- Registration form shows a single "College" option.
- Selecting it surfaces the UG + PG/Research industries already mapped.
- No data loss; legacy `COL` row is preserved (deactivated) in case any historical reference is found later.
