

## Fix Plan: 3 Remaining Gaps in Context Intelligence Implementation

### Status of All Spec Items

| # | Area | Status |
|---|------|--------|
| GAP 1 (Git) | N/A — Lovable manages commits automatically | **Not applicable** |
| GAP 2 (curation-intelligence file) | File exists at 140 lines, deployed | **Done** |
| GAP 3 | `discover-context-resources` has wrong column names | **BUG — needs fix** |
| GAP 4 | `useAddContextUrl` missing digest regeneration | **BUG — needs fix** |
| GAP 5 | Duplicate "Discover Sources" button in drawer | **UX fix needed** |

### Changes

**1. Fix `discover-context-resources/index.ts` (GAP 3)**

The org query on line 62 uses columns that don't exist in `seeker_organizations`:
- `name` → `organization_name`
- `country` → (remove — need `hq_country_id` + join to `countries` or just use `hq_city`)
- `city` → `hq_city`
- `website` → `website_url`
- `description` → `organization_description`

Also add `industry_segment_id` to the challenge select (line 49) so discovery can use it directly instead of only relying on org's industry.

Update the `variableMap` references accordingly (lines 97-105).

**2. Fix `useAddContextUrl` in `useContextLibrary.ts` (GAP 4)**

In the `onSuccess` callback (line 323), add a delayed digest regeneration call after URL extraction completes:
```
onSuccess: () => {
  invalidateAll(qc, challengeId);
  toast.success('URL added — extracting content...');
  setTimeout(() => {
    supabase.functions.invoke('generate-context-digest', {
      body: { challenge_id: challengeId },
    }).then(() => invalidateAll(qc, challengeId)).catch(() => {});
  }, 5000);
},
```

**3. Rename "Discover Sources" button in `ContextLibraryDrawer.tsx` (GAP 5)**

Change the button label from "Discover Sources" to "Re-discover Sources" since primary discovery now runs automatically during "Analyse Challenge". This makes it clear this is a manual re-run, not the primary entry point.

### What is NOT touched
- All other spec items already implemented correctly
- No edge function logic changes beyond the column name fix
- No hook interface changes
- No migration needed

