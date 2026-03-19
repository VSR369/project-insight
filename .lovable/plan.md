

# Completed: Step 0 + 3-Mode Governance in Challenge Wizard

## Changes Made

### 1. Added Step 0 — Mode & Model Selection
- **New**: `StepModeSelection.tsx` — 3 governance mode cards (QUICK/STRUCTURED/CONTROLLED) + operating model selector (MP/AGG)
- Subscription tier gating support (disabledModes prop)
- Uses existing `GOVERNANCE_MODE_CONFIG` for consistent styling

### 2. Updated Schema
- `challengeFormSchema.ts` — Added `governance_mode` and `operating_model` fields to Zod schema and default values

### 3. Updated Progress Bar (8 Steps)
- `ChallengeProgressBar.tsx` — Now shows Steps 0–7 with slightly smaller circles to fit 8 steps

### 4. Updated Bottom Bar Navigation
- `ChallengeWizardBottomBar.tsx` — Added Step 0 labels, back navigation starts from Step 0

### 5. Refactored useFormCompletion to 3-Mode System
- `useFormCompletion.ts` — Replaced `isLightweight: boolean` with `governanceMode: GovernanceMode`
- 3-way required field definitions: QUICK (9 fields), STRUCTURED (14 fields), CONTROLLED (19 fields)

### 6. Updated Wizard Page
- `ChallengeWizardPage.tsx` — Starts at Step 0, form-selected governance mode drives the wizard
- Total steps updated from 7 to 8 (Steps 0–7)
- Form defaults initialized from org context

### 7. Updated Tests
- All 10 tests pass with the new 3-mode system

## Still Using `isLightweight` Prop
The 7 step components (StepProblem, StepEvaluation, etc.) still receive `isLightweight: boolean` derived from `isQuickMode(governanceMode)`. This is backward-compatible — the boolean correctly maps QUICK → true, STRUCTURED/CONTROLLED → false. A future PR can refactor these to accept `governanceMode: GovernanceMode` directly for CONTROLLED-specific behaviors.
