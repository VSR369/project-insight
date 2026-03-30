

# Link Proficiency Areas to Solution Types

## Summary

Replace the hardcoded 4 solution types with the existing Proficiency Area taxonomy. The curator selects a Proficiency Area (e.g., "Future & Business Blueprint") as the Solution Type. This selection drives complexity dimensions and auto-populates the Solver Expertise section.

## Current State

- **4 hardcoded solution types**: `strategy_design`, `process_operations`, `technology_architecture`, `product_innovation`
- **4 Proficiency Areas** (distinct names): Future & Business Blueprint, Business & Operational Excellence, Digital & Technology Blueprint, Product & Service Innovation
- **`complexity_dimensions` table**: keyed by `solution_type` string
- **No mapping** exists between proficiency areas and solution types

## Natural Mapping

```text
Proficiency Area                    → solution_type code
─────────────────────────────────── ─────────────────────────
Future & Business Blueprint         → strategy_design
Business & Operational Excellence   → process_operations
Digital & Technology Blueprint      → technology_architecture
Product & Service Innovation        → product_innovation
```

## Changes

### 1. Create mapping table (DB migration)

New table `proficiency_area_solution_type_map` linking proficiency area names to solution type codes:

```sql
CREATE TABLE public.proficiency_area_solution_type_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proficiency_area_name TEXT NOT NULL,
  solution_type_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Seed with the 4 mappings. This makes the relationship data-driven rather than hardcoded.

### 2. Add Solution Type section to Tab 3 (Scope & Complexity)

**File**: `CurationReviewPage.tsx`

- Add a new section entry `solution_type` in the Tab 3 section list, placed before `complexity`
- Renderer: radio group showing the 4 Proficiency Area names (fetched from DB via the mapping table)
- On selection, save the `solution_type_code` to `challenges.solution_type`
- Show the selected Proficiency Area name as the label, not the code

### 3. Update section format config

**File**: `curationSectionFormats.ts`

Add `solution_type` entry with format `radio`, marking it as curator-editable and AI-draftable.

### 4. Auto-populate Solver Expertise on Solution Type change

**File**: `CurationReviewPage.tsx`

When `solution_type` is saved:
1. Look up the corresponding Proficiency Area name from the mapping
2. Find all proficiency_area IDs matching that name (across expertise levels) for the challenge's industry segment
3. Auto-set those IDs in `solver_expertise_requirements.proficiency_areas`
4. Save to DB and show toast: "Solver Expertise auto-updated to match Solution Type"

### 5. Update complexity module dependency

When `solution_type` changes:
- If complexity was previously scored, show confirmation dialog (existing behavior)
- The `useComplexityDimensions` hook already filters by `solutionType` — no change needed there

### 6. Update `challengeContextAssembler.ts`

- Keep `SOLUTION_TYPE_LABELS` but derive from the mapping table or update labels to match Proficiency Area names
- Add `PROFICIENCY_AREA_TO_SOLUTION_TYPE` constant as a client-side fallback

### 7. Add to DB SELECT in challenge fetch

`solution_type` is already in the SELECT query — no change needed.

## Technical Details

- The mapping table is lightweight (4 rows) and avoids hardcoding the relationship
- The `complexity_dimensions.solution_type` column values remain unchanged — no data migration needed
- The radio selector shows Proficiency Area names with descriptions from the DB
- Auto-population of Solver Expertise is additive (doesn't clear existing sub-domain/speciality selections)
- The mapping is 1:1 today but the table structure supports future N:1 if needed

## Files Modified

1. **DB migration** — create `proficiency_area_solution_type_map` + seed data
2. `src/lib/cogniblend/curationSectionFormats.ts` — add `solution_type` section config
3. `src/pages/cogniblend/CurationReviewPage.tsx` — add section entry, renderer, save handler, auto-populate logic
4. `src/lib/cogniblend/challengeContextAssembler.ts` — update labels to match Proficiency Area names

