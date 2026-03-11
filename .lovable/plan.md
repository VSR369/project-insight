

# Replace Single Proficiency ID with Full Domain Scope in Pool Members

## Problem

The Pool Member form stores a single `proficiency_id` UUID, but the taxonomy is hierarchical: **Industry Segment → Proficiency Areas → Sub-domains → Specialities**. A pool member works across multiple industries, and for each industry the available proficiency areas (and their children) can differ. A single FK cannot represent this.

## Existing Pattern to Reuse

The Seeker module already solves this exact problem for Delegated Admins using a **JSONB `domain_scope` column** with cascading multi-selects. The `ScopeMultiSelect` component and `useScopeTaxonomy` hooks already handle:
- Industry → Proficiency Areas (filtered by selected industries)
- Proficiency Areas → Sub-domains (filtered by selected areas)
- Sub-domains → Specialities (filtered by selected sub-domains)
- Cascade removal (removing a parent clears its children)
- "Empty = ALL" semantics at each level

```text
Current Pool Member Schema          Proposed Schema
┌──────────────────────────┐       ┌──────────────────────────────────┐
│ industry_ids: UUID[]     │       │ domain_scope: JSONB              │
│ proficiency_id: UUID     │       │   industry_segment_ids: UUID[]   │
│                          │       │   proficiency_area_ids: UUID[]   │
│                          │       │   sub_domain_ids: UUID[]         │
│                          │       │   speciality_ids: UUID[]         │
└──────────────────────────┘       └──────────────────────────────────┘
```

## Implementation Plan

### 1. Database Migration
- Add `domain_scope JSONB DEFAULT '{}'` column to `platform_provider_pool`
- Migrate existing data: copy `industry_ids` and `proficiency_id` into the new JSONB structure
- Drop `industry_ids` and `proficiency_id` columns (or keep as deprecated for safety, drop later)

### 2. Reuse `ScopeMultiSelect` Component
- The existing `ScopeMultiSelect` from `src/components/org/ScopeMultiSelect.tsx` already implements the full cascading picker with the `DomainScope` interface
- Import it directly into `PoolMemberForm` — no need to build a new component
- Skip the Department/Functional Area fields (not relevant for pool members) by creating a slim wrapper or a `hideDepartments` prop

### 3. Update `PoolMemberForm.tsx`
- Remove the separate "Industry Segments" multi-select chips and "Proficiency Area" single select
- Replace with the `ScopeMultiSelect` component bound to a `domain_scope` form field
- The cascading hierarchy (Industry → Proficiency → Sub-domain → Speciality) becomes the single scope section

### 4. Update Validation (`poolMember.ts`)
- Remove `industry_ids` and `proficiency_id` fields
- Add `domain_scope` object with `industry_segment_ids` (required, min 1), and optional arrays for `proficiency_area_ids`, `sub_domain_ids`, `speciality_ids`

### 5. Update `usePoolMembers.ts`
- `PoolMemberRow`: replace `industry_ids` + `proficiency_id` with `domain_scope: DomainScope`
- `PoolMemberInsert`: same change
- Filter logic: query JSONB contains for industry/proficiency filtering

### 6. Update `PoolFilterBar.tsx`
- Industry filter: query `domain_scope->>'industry_segment_ids'` contains value
- Proficiency filter: use `useProficiencyAreasBySegments` or show all areas; filter against `domain_scope`

### 7. Update `PoolMemberTable.tsx`
- Industry column: read from `member.domain_scope.industry_segment_ids`
- Proficiency column: show count or first proficiency area name from `domain_scope.proficiency_area_ids`

### 8. ScopeMultiSelect Enhancement
- Add an optional `hideDepartments` prop (or create a `PoolScopeSelect` wrapper) to hide the Department/Functional Area fields that are irrelevant for pool members

## Summary

| What | Change |
|---|---|
| DB column | Add `domain_scope JSONB`, remove `industry_ids` + `proficiency_id` |
| Form component | Reuse existing `ScopeMultiSelect` (cascading picker) |
| Hooks | Reuse existing `useScopeTaxonomy` hooks (already built) |
| Validation | New `domain_scope` object schema |
| Table + Filters | Read from JSONB instead of array/UUID columns |
| New code | Minimal — mostly wiring existing components |

