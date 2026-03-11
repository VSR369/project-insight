

# Deduplicate Proficiency Areas by Name in ScopeMultiSelect

## Problem
The `proficiency_areas` table stores one row per (industry_segment × expertise_level × area_name). When selecting an industry, the query returns all rows across all expertise levels, showing "Future & Business Blueprint" 4 times (once per level). The user wants each name shown only once.

## Solution
Deduplicate in `useProficiencyAreasBySegments` hook — group by name and keep the first ID per unique name. This ensures:
- Dropdown shows each proficiency area name exactly once
- If areas diverge across expertise levels in the future, new unique names will appear automatically
- Cascade logic (sub-domains, specialities) still works because we store the representative ID

### Change: `src/hooks/queries/useScopeTaxonomy.ts`

In `useProficiencyAreasBySegments`, after fetching, deduplicate by name:

```typescript
// After fetching data, deduplicate by name (same area appears per expertise level)
const seen = new Map<string, typeof data[0]>();
for (const row of data) {
  if (!seen.has(row.name)) seen.set(row.name, row);
}
return Array.from(seen.values());
```

This keeps the first occurrence (by display_order) of each unique name and drops duplicates. The cascade removal logic in `ScopeMultiSelect` still works because we track by `industry_segment_id`, and all duplicates share the same industry segment.

**One file changed, ~4 lines added.**

