

# Phase 4: Context Assembler + Validation Layer + Solution-Type Complexity

## Current State

- **AI calls** pass a minimal `challengeContext` (`{title, maturity_level, domain_tags}`) — no section content, no rate card, no structured extracts
- **No post-LLM validation** — AI output goes directly to the user
- **Complexity params** are generic (`master_complexity_params` table) — no solution-type differentiation
- **No `solution_type` column** on the `challenges` table
- Edge function `review-challenge-sections` already fetches full challenge data server-side but doesn't structure it as a formal context object

## Architecture

```text
Client (Curation Page)
  │
  ├── buildChallengeContext()  ← NEW: assembles full snapshot
  │     ├── All section content from Zustand store
  │     ├── Rate card lookup (org type × maturity)
  │     ├── Master data (from useCurationMasterData)
  │     └── Fresh todaysDate
  │
  ├── useAiSectionReview()  ← MODIFIED: passes full context
  │     └── Edge function receives richer context
  │
  └── validateAIOutput()  ← NEW: post-response checks
        ├── Date validation (phase schedule)
        ├── Master data enforcement
        ├── Eval weights = 100%
        ├── Reward rate floor check
        └── Prize tiers ≤ total pool
```

## Implementation Plan

### Step 1: Migration — `complexity_dimensions` table + `solution_type` column

**DB Migration:**
- Add `solution_type TEXT` column to `challenges` (nullable, CHECK constraint for 4 valid types)
- Create `complexity_dimensions` table: `id`, `solution_type`, `dimension_name`, `dimension_key`, `display_order`, `level_1_description`, `level_3_description`, `level_5_description`, `is_active`, audit fields
- Seed 20 rows (4 solution types × 5 dimensions each) using the exact seed data from the spec
- RLS: authenticated read access

### Step 2: Context Assembler (`src/lib/cogniblend/challengeContextAssembler.ts`)

Pure function that reads from the Zustand store + passed-in challenge data:
- Collects all section content from the store's `sections` map
- Parses structured data (complexity, phases, eval criteria, rewards) into typed extracts
- Looks up rate card via existing `lookupRateCard()` utility
- Computes `todaysDate` fresh on every call
- Returns typed `ChallengeContext` interface

**Key design decision:** This runs client-side, reading from the Zustand store (already populated) rather than re-fetching from Supabase. The edge function already fetches challenge data server-side — the context assembler enriches what gets passed in the `context` field of the request body.

### Step 3: Post-LLM Validation (`src/lib/cogniblend/postLlmValidation.ts`)

Five validation rules as pure functions:
1. **Date validation** — no past dates in phase schedule, end = start + duration, sequential phases
2. **Master data enforcement** — suggested values must exist in valid options (fuzzy match for auto-fix)
3. **Evaluation weights** — sum must equal 100% (auto-normalize if not)
4. **Reward rate floor** — effective $/hr must meet rate card floor
5. **Prize tiers** — sum ≤ total pool

Returns `ValidationResult` with corrections array (each has field, issue, severity, autoFixed flag).

### Step 4: Integration into `useAiSectionReview`

- Import `buildChallengeContext` and call it before each AI invocation
- Pass full context in the edge function request body (the `context` field already exists)
- After AI response, call `validateAIOutput` and store corrections alongside the review result
- Add `validationResult` to the store's section entry (new optional field on `SectionStoreEntry`)

### Step 5: `ValidationResultsBar` UI component

Small info bar rendered below AI review output:
- Green checkmarks for passed checks
- Amber warnings for auto-corrections with original → fixed values
- Red errors for unfixable issues
- Rendered inside `AIReviewResultPanel` or `CuratorSectionPanel` when validation results exist

### Step 6: `useComplexityDimensions` hook

React Query hook that fetches `complexity_dimensions` filtered by `solution_type`. Returns dimension definitions for the UI.

### Step 7: Integrate into `ComplexityAssessmentModule`

- Accept new `solutionType` prop
- Use `useComplexityDimensions(solutionType)` to get dimension definitions
- Override the generic `complexityParams` labels/descriptions with solution-type-specific ones
- Map dimension scores to the existing 1-10 scale (dimensions use 1-5 conceptually but map to the same slider)
- On solution_type change: reset scores with a confirmation dialog

### Step 8: Update edge function context

- Enrich the `review-challenge-sections` edge function to accept and use the richer context object
- Inject rate card data and `todaysDate` into the system prompt
- Pass solution_type to complexity assessment for dimension-aware ratings

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/cogniblend/challengeContextAssembler.ts` | `ChallengeContext` interface + `buildChallengeContext()` |
| `src/lib/cogniblend/postLlmValidation.ts` | `validateAIOutput()` + 5 validation rules + helpers |
| `src/components/cogniblend/curation/ValidationResultsBar.tsx` | UI component for validation results display |
| `src/hooks/queries/useComplexityDimensions.ts` | React Query hook for solution-type dimensions |

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAiSectionReview.ts` | Call context assembler before AI, validate after |
| `src/types/sections.ts` | Add `validationResult` field to `SectionStoreEntry` |
| `src/store/curationFormStore.ts` | Store validation results |
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Accept `solutionType`, use dimension-specific labels |
| `src/components/cogniblend/curation/CuratorSectionPanel.tsx` | Render `ValidationResultsBar` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass `solutionType` to complexity module, build context for AI calls |
| `supabase/functions/review-challenge-sections/index.ts` | Accept richer context, inject rate card + todaysDate |

## Migration

1. `ALTER TABLE challenges ADD COLUMN solution_type TEXT CHECK(...)` 
2. `CREATE TABLE complexity_dimensions (...)` + seed 20 rows
3. RLS policies for read access

