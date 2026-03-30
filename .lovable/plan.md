

# Solution Types as Multi-Select Section with Full Curation Integration

## What Changed from Previous Plan

The previous implementation treated Solution Type as a **single proficiency-area radio selector** (4 options). The user's requirement is fundamentally different:

- **15 granular solution types** grouped under 4 proficiency area headers
- **Multiple solution types can be selected** per challenge (multi-select, not radio)
- AI must auto-identify the right solution types from challenge context
- Solution types must influence downstream sections (deliverables, complexity, solver expertise, etc.)
- Full curation section lifecycle: AI review, staleness, wave execution, re-review

## The 15 Solution Types (Grouped)

```text
Future & Business Blueprint (strategy_design)
├── Business Model Design
├── Business Strategy Map
└── Business Outcomes Design

Product & Service Innovation (product_innovation)
├── Product Innovation
└── Service Innovation

Business & Operational Excellence (process_operations)
├── Business Processes Design (SCM, CRM, CXM, PLM etc.)
├── Workplaces Design
└── Operating Model Design

Digital & Technology Blueprint (technology_architecture)
├── Technology Strategy
├── Technology Architecture
├── Technology Governance
├── AI Agents / Digital Workforce Design
├── AI/ML Models Design
└── Application Rationalization & Agentic AI Integration Strategy
```

## Implementation Plan

### 1. Database: New `md_solution_types` Master Data Table

Create a proper master data table with hierarchical grouping:

```sql
CREATE TABLE public.md_solution_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  proficiency_group TEXT NOT NULL,        -- e.g. 'strategy_design'
  proficiency_group_label TEXT NOT NULL,  -- e.g. 'Future & Business Blueprint'
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Seed with all 15 types. Also change `challenges.solution_type` from a single TEXT to a new JSONB column `solution_types` (array of codes) — or add a new `solution_types JSONB` column alongside the existing one for backward compatibility.

**Decision: Add `solution_types JSONB DEFAULT '[]'` column** to `challenges`, keep `solution_type` for backward compat with complexity dimensions (which maps proficiency group → dimensions).

### 2. Update Section Format Config

In `curationSectionFormats.ts`:
- Change `solution_type` format from `radio` to `checkbox_multi`
- Update `masterDataTable` to `md_solution_types`
- Update `aiUsesContext` to include `['problem_statement', 'scope', 'deliverables', 'context_and_background']`

### 3. Section Dependencies

In `sectionDependencies.ts`, add `solution_type` as an upstream section:

```
solution_type → [deliverables, complexity, solver_expertise, 
                 evaluation_criteria, submission_guidelines, domain_tags]
problem_statement → [...existing..., solution_type]
scope → [...existing..., solution_type]  (AI can infer solution types from scope)
```

### 4. Move to Tab 3 Before Deliverables

Current Tab 3 order: `deliverables, data_resources_provided, maturity_level, solution_type, complexity`

New order: `solution_type, deliverables, data_resources_provided, maturity_level, complexity`

This ensures solution types are set before deliverables (which depend on them).

### 5. Wave Execution Config

In `waveConfig.ts`, add `solution_type` to **Wave 1 (Foundation)** or **Wave 2 (Enrichment)**. Since solution types depend on problem_statement and scope (Wave 1), place in **Wave 2**:

```
Wave 2: ['solution_type', 'root_causes', 'affected_stakeholders', ...]
```

Or better: Wave 1 as it's foundational to deliverables (Wave 3). Add to Wave 1 prerequisites = `['problem_statement', 'scope']` — but Wave 1 has no prerequisites. Solution: add to **Wave 2** with prerequisite on problem_statement and scope.

### 6. UI Renderer (CurationReviewPage.tsx)

Replace the current radio group with a **grouped checkbox multi-select**:
- Group headers showing proficiency area labels
- Checkboxes for each of the 15 solution types under their group
- Display selected types as grouped badges in read mode
- New hook `useSolutionTypes()` to fetch from `md_solution_types`

### 7. Save Handler Update

`handleSaveSolutionType` becomes `handleSaveSolutionTypes`:
- Saves selected codes as JSON array to `challenges.solution_types`
- Derives the primary `solution_type` (proficiency group) from the selected types for complexity dimension compatibility
- Auto-populates solver expertise with matching proficiency area IDs (union of all selected groups)
- Triggers staleness on downstream sections

### 8. AI Review Integration

The edge function `review-challenge-sections` already handles `solution_type` as a section. Updates needed:
- AI prompt context includes the 15 solution type options with descriptions
- AI returns a JSON array of recommended codes
- `parseSuggestion` already handles `checkbox_multi` → `tryParseArray`
- Accept handler maps AI suggestion codes to the store

### 9. Challenge Context Assembler

Update `challengeContextAssembler.ts`:
- Change `solutionType: SolutionType | null` to `solutionTypes: string[]`
- Keep `solutionType` for backward compat (derived as primary group)
- Include solution type labels in context for AI consumption

### 10. Display Name & Section Dependencies

In `sectionDependencies.ts`:
- Add `solution_type` display name
- Add dependency entries

### 11. Store Sync

`SECTION_DB_FIELD_MAP` already has `solution_type: 'solution_type'`. Update to map to `solution_types` (new column).

## Files to Modify

1. **New migration** — create `md_solution_types` table + seed 15 rows + add `solution_types JSONB` column to challenges
2. **`src/hooks/queries/useSolutionTypeMap.ts`** — rename/extend to `useSolutionTypes.ts` fetching from `md_solution_types`, grouped by proficiency area
3. **`src/lib/cogniblend/curationSectionFormats.ts`** — change format to `checkbox_multi`
4. **`src/lib/cogniblend/sectionDependencies.ts`** — add `solution_type` dependencies + display name
5. **`src/lib/cogniblend/waveConfig.ts`** — add `solution_type` to Wave 2
6. **`src/lib/cogniblend/challengeContextAssembler.ts`** — update context to include `solutionTypes` array
7. **`src/pages/cogniblend/CurationReviewPage.tsx`** — new grouped checkbox renderer, updated save handler, reorder in Tab 3
8. **`src/hooks/useCurationStoreSync.ts`** — update field mapping to `solution_types`
9. **`src/hooks/useCurationStoreHydration.ts`** — hydrate from new column
10. **`src/integrations/supabase/types.ts`** — auto-updated after migration

## Verification

1. Select multiple solution types → saves correctly as JSON array
2. AI review suggests appropriate types based on challenge context
3. Changing solution types marks deliverables, complexity, solver_expertise as stale
4. Complexity module resolves dimensions from the primary proficiency group
5. Solver expertise auto-populates from all selected proficiency groups
6. Wave executor processes solution_type in correct order (before deliverables)
7. Re-review works for solution_type section
8. Accept/reject AI suggestions works with multi-select format

