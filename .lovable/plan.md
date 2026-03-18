

# Revised Plan: Two-Layer Eligibility with Filtered Solver Tiers

## Summary of Change

Filter the Solver Tier list to show only the **8 legacy categories** plus an **"All" option**. Remove BRD 5.7.1 model categories from the UI entirely.

Final solver tier list:
1. Certified Basic (⭐)
2. Certified Competent (⭐⭐)
3. Certified Expert (⭐⭐⭐)
4. Registered
5. Expert (Invitee)
6. Signed In
7. Open Community
8. Hybrid
9. **All (no restriction)** — virtual option at top

## Implementation

### 1. `StepProviderEligibility.tsx`

**Filter out BRD 5.7.1 categories**: In the `groupedCategories` memo, filter `solverCategories` to exclude entries where `model_category === 'brd_5_7_1'` (or `display_order >= 100`). Only legacy categories will render.

**Remove group headers**: Since only one group remains ("Legacy"), remove the grouped rendering loop and display all categories in a single flat list without a group label.

**Add "All (no restriction)" radio option**: Insert a virtual radio option at the top of the list with value `''` (empty string). When selected, it clears `solver_eligibility_id` and sets visibility/enrollment/submission to their most open defaults (`public` / `open_auto` / `all_enrolled`).

**Add Provider Category section** (Layer 1): Above the solver tier list, add a multi-select checkbox section using `useParticipationModes()` from `useMasterData.ts`. Include an "All Categories" toggle — when checked, the `eligible_participation_modes` array is emptied (meaning all accepted). When unchecked, individual checkboxes appear.

### 2. `challengeFormSchema.ts`

- Add `eligible_participation_modes: z.array(z.string()).default([])` — empty means "All"
- Make `solver_eligibility_id` optional: `z.string().optional().or(z.literal(''))` — empty means "All"
- Add to `DEFAULT_FORM_VALUES`: `eligible_participation_modes: []`

### 3. `ChallengeWizardPage.tsx`

- Add `eligible_participation_modes` to Step 5 field list in `getStepFields`
- Serialize `eligible_participation_modes` in `buildFieldsFromForm`

## Files to Modify

| File | Change |
|------|--------|
| `challengeFormSchema.ts` | Add `eligible_participation_modes`, make `solver_eligibility_id` optional |
| `StepProviderEligibility.tsx` | Filter out BRD 5.7.1 categories, add "All" radio, add Provider Category multi-select |
| `ChallengeWizardPage.tsx` | Add new field to step 5 mapping |

