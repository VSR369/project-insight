

# Plan: Visibility as Solver-Tier-Based Selection + Remove Old Schema

## What the User Wants

1. **Remove** the old `src/lib/validations/challenge.ts` `visibility` enum (`private`, `marketplace`, `invited`) — it's no longer needed as the wizard uses `challengeFormSchema.ts`.
2. **Visibility should use the same 8 solver tier categories** (Certified Basic/Competent/Expert, Registered, Expert (Invitee), Signed In, Open Community, Hybrid + All) — meaning visibility is driven by solver tier selection, not a separate enum.
3. **Move visibility into the Provider Eligibility section** (Step 5).

## Current State

- `src/lib/validations/challenge.ts` — old schema used only by `ChallengeCreatePage.tsx` (the org-level challenge create page, separate from the CogniBlend wizard). Contains `visibility: z.enum(['private', 'marketplace', 'invited'])`.
- The CogniBlend wizard already has visibility handled in Step 5 via the Enterprise 3-tier Publication Config (challenge_visibility/enrollment/submission) which auto-fills from Solver Tier selection.
- The `visibility` field in `challengeFormSchema.ts` is `z.string().default('public')` — a legacy field that doesn't match the new model.

## Implementation

### 1. Remove old validation schema visibility enum

**File: `src/lib/validations/challenge.ts`**
- Remove the `visibility` field from `challengeSchema` entirely. This file is used by `ChallengeCreatePage.tsx` (org portal), not the CogniBlend wizard.

**File: `src/pages/org/ChallengeCreatePage.tsx`**
- Remove any references to the `visibility` form field (the org create page shouldn't expose this — it's now managed in the wizard's Step 5).

### 2. Update `challengeFormSchema.ts`

- Change `visibility` from `z.string().default('public')` to `z.string().optional().or(z.literal(''))` — making it a derived/optional field since visibility is now driven by solver tier selection.
- Update `DEFAULT_FORM_VALUES`: change `visibility: 'public'` to `visibility: ''`.

### 3. Update `StepProviderEligibility.tsx` — Visibility driven by Solver Tier

The solver tier selection already auto-fills `challenge_visibility`, `challenge_enrollment`, and `challenge_submission`. The change is:

- When a solver tier is selected, also set the `visibility` field to the solver tier's code/label for backward compatibility with the challenges table column.
- When "All (no restriction)" is selected, set `visibility` to empty/null.
- Add a clear label in the Solver Tier section indicating it controls both eligibility AND visibility: "This selection determines both who can participate and who can discover this challenge."

### 4. Update `ChallengeWizardPage.tsx`

- In `buildFieldsFromForm`: derive `visibility` from the selected solver tier rather than from a standalone field.
- Ensure `visibility` is mapped to Step 5 fields in `getStepFields`.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/validations/challenge.ts` | Remove `visibility` field from schema |
| `src/pages/org/ChallengeCreatePage.tsx` | Remove visibility form field references |
| `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Make `visibility` optional/derived |
| `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx` | Add note that solver tier controls visibility; set `visibility` on tier change |
| `src/pages/cogniblend/ChallengeWizardPage.tsx` | Move `visibility` to Step 5 fields, derive from solver tier |

