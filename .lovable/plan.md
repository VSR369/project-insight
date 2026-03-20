

# Plan: Simplify Access Model — Solver-Type Only + Better AI Deliverables/Criteria

## Problem

1. **Enrollment and Submission fields are redundant** — the logic is simple: eligible solvers can submit, visible solvers can only view. These fields add confusion without value.
2. **AI is not generating proper deliverables** — they should be concrete, measurable outputs derived from the problem statement.
3. **AI is not generating proper evaluation criteria** — needs structured Name/Weight/Description with weights summing to 100%.
4. **AI should show only its finalized solver type selections** (not all types), but allow the user to add/remove.

## Simplified Access Logic

```text
Solver Types (from md_solver_eligibility):
  ├── Eligible Solvers: Can view AND submit solutions
  └── Visible Solvers: Can only view/discover the challenge (not submit)

No separate Enrollment or Submission tiers needed.
```

## Changes

### 1. Remove Enrollment & Submission from DB
**Migration SQL** — Drop `challenge_enrollment` and `challenge_submission` columns from `challenges` table. Keep `challenge_visibility` as it maps to the "visible solver types" concept.

### 2. Remove from Constants & Shared Code
**Files:** `src/constants/challengeOptions.constants.ts`, `src/components/cogniblend/AccessModelSummary.tsx`

- Remove `ENROLLMENT_OPTIONS`, `SUBMISSION_OPTIONS`, `findEnrollmentOption`, `findSubmissionOption`
- Simplify `AccessModelSummary` to show only two tiers: "Eligible Solvers" (can submit) and "Visible Solvers" (can view only)

### 3. Remove from Manual Editor (StepProviderEligibility)
**File:** `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`

- Remove the 3-column Publication Configuration grid (Visibility/Enrollment/Submission dropdowns)
- Remove `VALID_ENROLLMENTS`, `VALID_SUBMISSIONS` cascade logic
- Remove the useEffect hooks that cascade enrollment/submission values
- Keep solver tier checkboxes as-is — they define eligible solvers
- Add a simple "Visibility" concept: the selected solver tiers define who is eligible; visibility remains as a separate dropdown (public vs restricted)

### 4. Remove from Form Schema
**File:** `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts`

- Remove `challenge_enrollment` and `challenge_submission` from the Zod schema and defaults

### 5. Remove from Review/Submit Step
**File:** `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx`

- Remove enrollment/submission from the review summary

### 6. Update Edge Function — Better Deliverables & Criteria
**File:** `supabase/functions/generate-challenge-spec/index.ts`

- Remove `challenge_enrollment` and `challenge_submission` from the response
- Enhance the deliverables prompt: "Analyze the problem statement and derive 3-7 specific deliverables that directly address each aspect of the stated problem. Each must be a tangible work product."
- Enhance evaluation criteria prompt: "Create 3-6 evaluation criteria with structured Name (2-4 words), Weight (integer %, must sum to exactly 100), and Description (1-2 sentences on scoring methodology). Weight distribution should reflect the relative importance to solving the specific problem."
- Remove `default_enrollment` and `default_submission` from the solver category query

### 7. Update AI Spec Review — Show Only AI-Selected + Allow Edit
**File:** `src/pages/cogniblend/AISpecReviewPage.tsx`

- Remove enrollment/submission state, dropdowns, and props
- **STRUCTURED mode**: Show AI-selected solver types as pre-checked cards (only the selected ones shown prominently). Below, show remaining available types in a collapsed "Add more solver types" section.
- **QUICK mode**: Show AI-selected solver types as read-only cards (finalized)
- Simplify `AccessModelSummary` usage to just show Eligible vs Visible
- Remove `ENROLLMENT_OPTIONS` and `SUBMISSION_OPTIONS` imports

### 8. Update State Sync
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx`

- Remove `challenge_enrollment` and `challenge_submission` from `handleSpecGenerated`

### 9. Update Hook Types
**File:** `src/hooks/mutations/useGenerateChallengeSpec.ts`

- Remove `challenge_enrollment` and `challenge_submission` from `GeneratedSpec`

### 10. Clean Up Tests
**File:** `src/components/cogniblend/challenge-wizard/__tests__/Wave5PublicationConfig.test.ts`, `useFormCompletion.test.ts`

- Remove enrollment/submission test cases

### 11. Clean Up Approval Tab
**File:** `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx`

- Remove enrollment/submission references

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Drop `challenge_enrollment`, `challenge_submission` columns |
| `src/constants/challengeOptions.constants.ts` | Remove enrollment/submission options |
| `src/components/cogniblend/AccessModelSummary.tsx` | Simplify to 2-tier (Eligible + Visible) |
| `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx` | Remove 3-tier publication config |
| `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Remove enrollment/submission fields |
| `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx` | Remove enrollment/submission from review |
| `supabase/functions/generate-challenge-spec/index.ts` | Better deliverables/criteria prompts, remove enrollment/submission |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Show only AI-finalized types + edit, remove enrollment/submission |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Remove enrollment/submission from state sync |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Remove enrollment/submission from types |
| `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx` | Remove enrollment/submission |
| Test files | Update to remove enrollment/submission references |

