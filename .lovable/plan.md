

# Plan: Fix AI Autonomous Solver Type Selection for Eligibility & Visibility

## Root Cause (from DB inspection)

For challenge `3c9839ae`, the actual DB state is:
- `solver_eligibility_types`: `[]` (empty — never saved)
- `challenge_visibility`: `null` (never saved)
- `deliverables`: `{ items: [...] }` (wrapped format — old bug, already handled by display)
- `evaluation_criteria`: `{ criteria: [...] }` (wrapped format — already handled)

**Why solver types are empty**: The edge function returns `solver_eligibility_details` in the spec, but `ConversationalIntakePage` maps `spec.solver_eligibility_details` — if the AI tool call doesn't return this field or returns it differently, it becomes `[]`. Additionally, the current model only outputs ONE set of solver codes for eligibility. There's NO separate set for visibility — `challenge_visibility` is just a string like "public", not solver types.

## What Needs to Change

The user wants TWO solver-type-based lists from the SAME `md_solver_eligibility` master data:
1. **Eligible solver types** — can view AND submit solutions
2. **Visible solver types** — can only discover/view the challenge, NOT submit

Both selected autonomously by AI. Both editable by user.

## Changes

### 1. Add DB Column for Visible Solver Types
**Migration**: Add `solver_visibility_types` (JSONB, default `[]`) to `challenges` table. This mirrors `solver_eligibility_types` but for view-only access.

### 2. Update Edge Function — Two Solver Type Outputs
**File**: `supabase/functions/generate-challenge-spec/index.ts`

Add to the tool schema:
- `visible_solver_codes`: array of codes for view-only solver types
- Update prompt to explain the distinction: "Select 1-3 codes for eligible solvers (can submit). Then select 1-3 broader codes for visible solvers (can discover but not submit). Visible should be equal or broader than eligible."

Post-process: Build both `solver_eligibility_details` and `solver_visibility_details` arrays from master data, include both in response.

### 3. Update GeneratedSpec Type
**File**: `src/hooks/mutations/useGenerateChallengeSpec.ts`

Add `visible_solver_codes`, `solver_visibility_details`, `visible_solver_types` to `GeneratedSpec`.

### 4. Update ConversationalIntakePage — Save Both Arrays
**File**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

Save `solver_visibility_types` alongside `solver_eligibility_types` in the `saveStep` call.

### 5. Update useChallengeDetail — Fetch New Column
**File**: `src/hooks/queries/useChallengeForm.ts`

Add `solver_visibility_types` to select query and `ChallengeDetail` interface.

### 6. Update AISpecReviewPage — Show Both Sections
**File**: `src/pages/cogniblend/AISpecReviewPage.tsx`

Replace the single "Solver Eligibility & Access" section with two sub-sections:
- **Eligible Solver Types** (can submit) — AI-selected, editable checkboxes
- **Visible Solver Types** (can view only) — AI-selected, editable checkboxes
- Remove the `challenge_visibility` dropdown (replaced by solver-type-based visibility)

Initialize both from their respective DB columns. Both use the same `md_solver_eligibility` master data checkboxes.

### 7. Update Manual Editor (StepProviderEligibility) — Match
**File**: `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`

Add "Visible Solver Types" checkboxes alongside existing eligibility checkboxes.

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `solver_visibility_types` JSONB column |
| `supabase/functions/generate-challenge-spec/index.ts` | Add `visible_solver_codes` to tool schema + prompt |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Add visibility types to `GeneratedSpec` |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Save both solver type arrays |
| `src/hooks/queries/useChallengeForm.ts` | Fetch `solver_visibility_types` |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Show two solver type sections, remove visibility dropdown |
| `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx` | Add visible solver types |

