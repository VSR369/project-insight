

# Plan: Fix Taxonomy Cascade & Create Reusable Taxonomy Hook

## Issues Identified

### 1. Role label wrong for Aggregator
Line 410 of `CogniSubmitRequestPage.tsx` says "As Account Manager" — Aggregator mode has no Account Manager. The submit request role in AGG is Challenge Requestor (RQ).

### 2. Sub-domains showing duplicates (wrong table queried)
`useSubDomainOptions()` in `useTaxonomySelectors.ts` queries the **`proficiency_areas`** table (line 44), NOT the actual `sub_domains` table. This means:
- It returns proficiency areas labeled as "sub-domains"
- Since proficiency areas exist per expertise level, the same name repeats across levels
- No deduplication is applied in this hook

### 3. Specialities not cascading from sub-domains
`CogniSubmitRequestPage` doesn't use cascading hooks at all — it fetches a flat list via `useSubDomainOptions()` and has no speciality fetching from the `specialities` table. Specialties are only populated via text-based taxonomy suggestions.

### 4. No reusable taxonomy component
The taxonomy cascade logic (Industry → Proficiency Areas → Sub-domains → Specialities, with deduplication across expertise levels) is implemented separately in:
- `ScopeMultiSelect.tsx` (pool member scope)
- `StepProviderEligibility.tsx` (challenge wizard)
- `CogniSubmitRequestPage.tsx` (solution request — broken)
- `DomainScopeDisplay.tsx` (read-only display)

## Taxonomy Tree (for reference)
```text
Industry Segment
  └─ Expertise Level 1
  │   └─ Proficiency Area A
  │       └─ Sub-domain X → Speciality 1, 2
  │       └─ Sub-domain Y → Speciality 3
  └─ Expertise Level 2
      └─ Proficiency Area A (same name, different row)
          └─ Sub-domain X (same name) → Speciality 1 (same)
```
When selecting an Industry Segment, ALL expertise levels' proficiency areas, sub-domains, and specialities should appear — deduplicated by name.

## Solution

### File 1: NEW — `src/hooks/queries/useTaxonomyCascade.ts` (Reusable hook)
Single hook that provides the full cascade from industry segment IDs down to specialities, with built-in deduplication by name at every level.

- `useTaxonomyCascade(industrySegmentIds: string[])` returns:
  - `proficiencyAreas`: deduplicated by name, all IDs for each name collected
  - `subDomains`: fetched from `sub_domains` table using ALL proficiency area IDs for the selected segments (not just the deduplicated ones), deduplicated by name
  - `specialities`: fetched from `specialities` table using ALL sub-domain IDs, deduplicated by name
- Each level collects all underlying IDs so that child queries work correctly even after dedup
- Accepts optional `selectedProficiencyAreaNames` and `selectedSubDomainNames` to filter children (for cascading selection UX)

### File 2: MODIFY — `src/hooks/queries/useScopeTaxonomy.ts`
- Add deduplication by name to `useSubDomainsByAreas` (currently missing)
- Add deduplication by name to `useSpecialitiesBySubDomains` (currently missing)
- These hooks are used by `ScopeMultiSelect` and `DomainScopeDisplay`

### File 3: MODIFY — `src/pages/cogniblend/CogniSubmitRequestPage.tsx`
- Remove `useSubDomainOptions` import — replace with `useTaxonomyCascade`
- Watch `industry_segment_id` and pass as `[id]` to the cascade hook
- Watch `sub_domain_ids` to drive speciality options from the cascade
- Wire sub-domain dropdown to use cascaded, deduplicated sub-domains
- Wire speciality section to show selectable specialities (from DB, not just text suggestions)
- Fix AGG mode text: remove "Account Manager" reference, use "Challenge Requestor" or neutral phrasing
- Add `specialty_ids` (UUID array) alongside existing `specialty_tags` (text) for DB-linked specialities

### File 4: MODIFY — `src/hooks/queries/useTaxonomySelectors.ts`
- Remove or deprecate `useSubDomainOptions()` — it queries the wrong table and is only used in one place (now replaced by cascade hook)
- Keep `useIndustrySegmentOptions()` as-is (correct)

### File 5: MODIFY — `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`
- Replace direct `useProficiencyAreasBySegments` + `useSpecialitiesBySubDomains` calls with `useTaxonomyCascade` for consistency and correct deduplication
- Ensures sub-domains shown are from the actual `sub_domains` table, deduplicated

### File 6: MODIFY — `src/components/org/ScopeMultiSelect.tsx`
- No structural change needed — already uses the correct cascade pattern
- Add deduplication to sub-domain display (will be handled by the fix in `useScopeTaxonomy.ts`)

## Key Design Decisions

1. **Deduplicate by name, collect all IDs**: When "Sub-domain X" appears under multiple proficiency areas/expertise levels, show it once but use ALL its IDs to fetch child specialities
2. **Reusable hook, not component**: The cascade is data logic — UI varies per screen (select vs chips vs badges). A hook is the right abstraction
3. **Backward compatible**: Existing `useScopeTaxonomy` hooks get dedup fixes; new `useTaxonomyCascade` is additive

## No Database Changes Required
All tables (`proficiency_areas`, `sub_domains`, `specialities`) already exist with correct foreign keys.

