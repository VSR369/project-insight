

# Add "ALL" Option to Pool Member Domain Scope

## Business Context

A lean startup acting as a platform provider may have generalist pool members who cover ALL industries and ALL proficiency areas. Today, the form forces selecting each industry individually — impractical when you have 9+ segments and want full coverage. An "ALL" toggle at each scope level solves this.

## Design

### Semantics
- **"ALL" = empty array** — this is already the convention for proficiency areas, sub-domains, and specialities ("empty means ALL"). We extend this to **industry segments** as well.
- When "ALL Industries" is toggled ON → `industry_segment_ids = []` → member covers every industry.
- The cascading levels below also follow the same pattern: empty = ALL.

### UI Changes — `ScopeMultiSelect.tsx`

Add a **checkbox/switch** labeled **"All Industries"** above the industry segment picker. When toggled:
- The individual industry multi-select is hidden (no point selecting individual items)
- `industry_segment_ids` is set to `[]`
- Proficiency areas section shows an "All Proficiency Areas" toggle (since no specific industries are selected, we skip the cascading fetch and treat it as global)
- Sub-domains and Specialities similarly get "ALL" treatment

When toggled OFF → user must select at least one industry (current behavior).

Each cascading level gets a similar "Select All" toggle:
- **All Proficiency Areas** → `proficiency_area_ids = []`
- **All Sub-domains** → `sub_domain_ids = []`  
- **All Specialities** → `speciality_ids = []`

### Validation — `poolMember.ts`

Change `industry_segment_ids` from `.min(1)` to allow empty arrays (empty = ALL):

```typescript
industry_segment_ids: z.array(z.string().uuid()) // no min — empty means ALL
```

### Display — `PoolMemberTable.tsx`

When `industry_segment_ids` is empty, show a badge **"All Industries"** instead of listing names. Same pattern for proficiency scope depth.

### Filter Logic — `usePoolMembers.ts`

When filtering by industry/proficiency, members with empty arrays (ALL) should **always match** any filter value. Update client-side filter:

```typescript
// A member with empty industry_segment_ids matches ALL industry filters
if (filters.industry) {
  results = results.filter(m =>
    m.domain_scope?.industry_segment_ids?.length === 0 || 
    m.domain_scope?.industry_segment_ids?.includes(filters.industry!)
  );
}
```

### Cascading Behavior When "ALL" Is Selected

- ALL Industries toggled → proficiency picker still appears but with its own "All" toggle and no cascading fetch (since there's no specific industry to scope from). If user wants specific proficiency areas under ALL industries, they can toggle off the proficiency "All" and pick from the full deduplicated list.
- For the full-ALL case (startup generalist): toggle ALL at industry level, leave everything else empty → member covers the entire taxonomy.

## Files Changed

| File | Change |
|---|---|
| `src/components/org/ScopeMultiSelect.tsx` | Add "All" toggle switches at Industry and each cascading level; hide individual pickers when ALL is on |
| `src/lib/validations/poolMember.ts` | Remove `.min(1)` from `industry_segment_ids` |
| `src/hooks/queries/usePoolMembers.ts` | Update filter logic so empty arrays match all filter values |
| `src/components/admin/marketplace/PoolMemberTable.tsx` | Show "All Industries" / "All Areas" badges when arrays are empty |
| `src/hooks/queries/useScopeTaxonomy.ts` | Add a `useAllProficiencyAreas()` variant that fetches without industry filter (for ALL Industries mode) |

