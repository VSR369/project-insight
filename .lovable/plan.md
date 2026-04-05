

# Gap Analysis: Plan vs Implementation

## What's Done

| Prompt | Status | Notes |
|--------|--------|-------|
| CR-1 (Schema fix) | DONE | `creatorFormSchema.ts` aligned, seed data updated, defaultValues correct |
| CR-3 (Field rendering) | DONE | Visibility guards, WeightedCriteriaEditor, Context tab hidden for QUICK |
| CR-4 (Visual separation) | DONE | Step 1/Step 2 layout with badges and field counts |

## What's NOT Done: CR-2 (Submit Hook Mapping)

This is the critical missing piece. The form collects the right data, but it is stored incorrectly in the database. The Curator will see NULL or wrong values.

### 3 bugs in `useSubmitSolutionRequest.ts`:

1. **`currency_code` direct column never set** -- Line 87-112 `.update()` call does not include `currency_code`. The value is only stored inside `reward_structure` JSONB. Curator reads `ch.currency_code` and gets NULL.

2. **`platinum_award` stored as `budget_max`** -- `reward_structure` uses `budget_max` key (line 62). Plan requires it to also be stored as `platinum_award` so Curator reads the correct key.

3. **`weighted_criteria` never stored** -- `evaluation_criteria` JSONB column is never written. The form collects criteria via `WeightedCriteriaEditor` but `buildPayload` in `ChallengeCreatorForm.tsx` (line 114-132) does not pass `weightedCriteria` to the submit payload. The `SubmitPayload` interface in `solutionRequestPayloads.ts` doesn't have a `weightedCriteria` field.

### Files to fix:

**1. `src/lib/cogniblend/solutionRequestPayloads.ts`**
- Add `weightedCriteria?: Array<{ name: string; weight: number }>` to `SubmitPayload` and `DraftPayload` interfaces
- In `buildChallengeUpdatePayload`: add `currency_code: fp.currency` and `evaluation_criteria` from `weightedCriteria`
- Add `platinum_award` to `reward_structure` alongside `budget_max` (backward compat)

**2. `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**
- In the `.update()` call (line 87): add `currency_code: filteredPayload.currency ?? payload.currency`
- Add `evaluation_criteria: filteredPayload.weightedCriteria?.length ? { weighted_criteria: filteredPayload.weightedCriteria } : null`
- In `rewardStructure` (line 59): add `platinum_award: filteredPayload.budgetMax ?? 0`
- In creator snapshot (line 137): add `evaluation_criteria` and `currency_code`

**3. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- In `buildPayload` (line 114): add `weightedCriteria: data.weighted_criteria`

### Also missing: Governance config migration

The plan specifies:
```sql
UPDATE md_governance_mode_config
SET dual_curation_enabled = false
WHERE governance_mode = 'CONTROLLED';
```
This migration has not been created.

## Execution Order

1. Add `weightedCriteria` to payload interfaces (`solutionRequestPayloads.ts`)
2. Fix `buildPayload` in `ChallengeCreatorForm.tsx` to pass `weightedCriteria`
3. Fix `.update()` in `useSubmitSolutionRequest.ts` to store `currency_code`, `evaluation_criteria`, and `platinum_award`
4. Fix `buildChallengeUpdatePayload` in `solutionRequestPayloads.ts` for draft saves
5. Create migration for `dual_curation_enabled = false`

All files remain under 250 lines. No new files needed.

