

# Critical Analysis: Missing Features in Challenge Creation Flow

## Problems Identified

### Problem 1: No Step 0 — Governance Mode Selection Missing
The Advanced Editor wizard starts at Step 1 (Challenge Brief). The memory states Step 0 should be "Mode & Model Selection" where users pick QUICK / STRUCTURED / CONTROLLED governance mode per-challenge. Instead, governance is silently inherited from the organization's `governance_profile` field (line 94-98 of ChallengeWizardPage.tsx), giving users no way to choose.

### Problem 2: Binary `isLightweight` Instead of 3-Mode System
The entire wizard uses a boolean `isLightweight` prop (true/false) passed to every step component. This collapses the 3-mode system (QUICK / STRUCTURED / CONTROLLED) into just two states. CONTROLLED mode — which should enforce stricter rules like mandatory escrow, formal gates, etc. — behaves identically to STRUCTURED.

**Affected files (8 step components + helpers)**:
- `StepProblem.tsx`, `StepEvaluation.tsx`, `StepRewards.tsx`, `StepTimeline.tsx`, `StepProviderEligibility.tsx`, `StepTemplates.tsx`, `StepReviewSubmit.tsx`, `StepRequirements.tsx`
- `useFormCompletion.ts`, `challengeFormSchema.ts`

### Problem 3: Conversational Intake Page Not Visible for Some Roles
The sidebar shows "Create Challenge" only for role `CR` (Creator). If the logged-in user (e.g., Alex Morgan as AM) doesn't have the CR role, they cannot see or navigate to the Conversational Intake page at all.

---

## Plan

### Step 1: Add Step 0 — Governance Mode & Operating Model Selection

**New file**: `src/components/cogniblend/challenge-wizard/StepModeSelection.tsx`

Create a new step component that renders:
- 3 governance mode cards (QUICK / STRUCTURED / CONTROLLED) using the existing `GOVERNANCE_MODE_CONFIG` colors and labels
- Operating model selector (if applicable from org context)
- Add-on toggles for STRUCTURED/CONTROLLED modes (e.g., escrow, formal gates)
- Subscription tier gating: disable modes not available on the user's tier

The selected mode will be stored in the form as `governance_mode` field.

**Modify**: `ChallengeWizardPage.tsx`
- Change `TOTAL_STEPS` from 7 to 8
- Add `StepModeSelection` as `currentStep === 0` (or renumber to start at 0)
- Replace the org-inherited `governanceMode` with the form-selected value
- Update `ChallengeProgressBar.tsx` STEPS array to include Step 0

**Modify**: `challengeFormSchema.ts`
- Add `governance_mode` field to the schema

### Step 2: Replace `isLightweight: boolean` with `governanceMode: GovernanceMode`

Across all 8 step components, change the prop from `isLightweight: boolean` to `governanceMode: GovernanceMode`. This enables 3-way branching:

- **QUICK**: Simplified UX, fewer required fields, auto-complete behaviors
- **STRUCTURED**: Full fields, manual curation, optional add-ons
- **CONTROLLED**: All STRUCTURED features plus mandatory escrow, formal gates, distinct role separation

Each step will use `isQuickMode()`, `isEnterpriseGrade()`, and `isControlledMode()` helpers from `governanceMode.ts` instead of a single boolean.

Key behavioral differences for CONTROLLED mode:
- `StepRewards`: Escrow is mandatory (not optional)
- `StepTimeline`: All phase gates are mandatory
- `StepProviderEligibility`: Stricter eligibility requirements
- `StepTemplates`: All legal documents are required
- `useFormCompletion.ts`: 3-way field requirement lists instead of binary

### Step 3: Update Progress Bar for 8 Steps

**Modify**: `ChallengeProgressBar.tsx`
- Add Step 0 "Mode & Model" to STEPS array
- Adjust styling to fit 8 steps (slightly smaller circles/labels)

### Step 4: Update `useFormCompletion` for 3-Mode System

**Modify**: `useFormCompletion.ts`
- Replace `isLightweight: boolean` parameter with `governanceMode: GovernanceMode`
- Add CONTROLLED-specific required fields (e.g., mandatory escrow fields, all legal docs)
- Update `getRequiredFieldsByStep` to have 3 branches

---

## Technical Details

**Prop change across 8 files** — each step component signature changes from:
```
isLightweight: boolean
```
to:
```
governanceMode: GovernanceMode
```

Internal logic changes from `if (isLightweight)` to `if (isQuickMode(governanceMode))` for QUICK behavior, and adds `if (isControlledMode(governanceMode))` for CONTROLLED-specific enforcement.

**Form schema update** — `challengeFormSchema.ts` adds:
```typescript
governance_mode: z.enum(['QUICK', 'STRUCTURED', 'CONTROLLED']).default('STRUCTURED')
```

**Step numbering** — Steps shift from 1-7 to 0-7 (or 1-8 with renumbering). The `getStepFields` helper in ChallengeWizardPage.tsx needs a case 0 entry.

