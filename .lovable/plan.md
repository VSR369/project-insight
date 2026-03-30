

# Complexity Prompt Quality + Reward Structure Persistence Fixes

## Overview
Six changes across 4 files: 3 complexity prompt improvements in the edge function, and 5 reward structure persistence/quality fixes across frontend hooks, components, prompt templates, and the query layer.

## Changes

### A1: Add `temperature` for Deterministic AI Outputs
**File:** `supabase/functions/review-challenge-sections/index.ts`
- `executeComplexityAssessment` (line ~808): Add `temperature: 0` to the `body` JSON alongside `model`
- `callAIPass1Analyze` (line ~256): Add `temperature: 0.2` to the `body` JSON
- `callAIPass2Rewrite` (line ~538): Add `temperature: 0.2` to the `body` JSON

### A2: Curated Challenge Summary for Complexity Prompt
**File:** `supabase/functions/review-challenge-sections/index.ts`
- Replace the `userPrompt` in `executeComplexityAssessment` (lines ~783-788) with a structured, section-by-section summary (title, solution type, maturity, problem statement, scope, deliverables, expected outcomes, evaluation criteria, phase schedule, IP model, data resources, success metrics, solver expertise, domain tags, context/background, root causes). Includes a `strip()` helper to clean HTML and truncate to 2000 chars.

### A3: Section-to-Dimension Mapping in System Prompt
**File:** `supabase/functions/review-challenge-sections/index.ts`
- Replace the `systemPrompt` in `executeComplexityAssessment` (lines ~772-781) with an enriched version that includes:
  - A `dimHints` mapping telling the AI which challenge sections to focus on for each complexity dimension
  - Explicit rating scale guidance (1-2 = Trivial, 3-4 = Standard, etc.)
  - Rules requiring specific content citations, differentiated ratings, and conservative scoring for empty sections

### B1: Auto-Save to DB After AI Accept (Critical)
**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
- Modify `handleApplyAIReviewResult` (lines ~161-165) to auto-save to the `challenges` table after a 300ms delay, invalidate the query cache, update the saved snapshot, and show appropriate toast messages. Prevents data loss when users accept AI suggestions and navigate away without clicking Save.

### B2: Set `totalPool` in `applyAIReviewResult`
**File:** `src/hooks/useRewardStructureState.ts`
- After applying monetary tiers (line ~472), compute the sum of all tier amounts and call `setTotalPoolState(tierTotal)` if > 0. Also ensure `Number(amount)` coercion on tier values.

### B3: Normalize Reward Type String
**File:** `src/hooks/useRewardStructureState.ts`
- Replace the strict equality check (lines ~485-487) with a normalizer that handles case variations ("Monetary", "Both"), hyphens ("non-monetary"), and aliases ("cash", "mixed"). Falls back to inferring type from data shape if the type string is unrecognized.

### B4: Enrich Reward Prompt with Budget Rules
**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`
- Replace the `reward_structure` entry in `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS` (line ~105) with enriched rules covering budget constraints, maturity-based estimation, mandatory "both" type, tier count guidance, and non-monetary item examples. Reinforces that tiers must be an object (not array).

### B5: Prevent Data Loss on React Query Refetch
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Add `placeholderData: (previousData) => previousData` to the `useQuery` at line ~1255. Prevents UI flicker and component remount (which would reset reward editor state) during background refetches.

## Deployment
- Edge function `review-challenge-sections` will need redeployment after A1-A3 and B4 changes.

## Files Modified
1. `supabase/functions/review-challenge-sections/index.ts` — A1, A2, A3
2. `supabase/functions/review-challenge-sections/promptTemplate.ts` — B4
3. `src/hooks/useRewardStructureState.ts` — B2, B3
4. `src/components/cogniblend/curation/RewardStructureDisplay.tsx` — B1
5. `src/pages/cogniblend/CurationReviewPage.tsx` — B5

