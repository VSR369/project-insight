

# Plan: Fix AI Failing to Populate Deliverables, Criteria, and Solver Types

## Root Cause Analysis

Three distinct bugs prevent AI-generated data from appearing on the review page:

### Bug 1: Deliverables & Evaluation Criteria — Wrong Column Format
**Where**: `ConversationalIntakePage.tsx` line 367-368
```typescript
deliverables: { items: spec.deliverables },        // wraps in { items: [...] }
evaluation_criteria: { criteria: spec.evaluation_criteria }, // wraps in { criteria: [...] }
```
**But** the `AISpecReviewPage` reads `challengeRecord.deliverables` and `challengeRecord.evaluation_criteria` directly, expecting raw arrays. When stored as `{ items: [...] }` and `{ criteria: [...] }`, the `Array.isArray()` check fails and shows "No deliverables defined" / "No criteria defined".

### Bug 2: Solver Eligibility Codes — Never Saved to DB
**Where**: `ConversationalIntakePage.tsx` lines 360-376 — the `saveStep` call saves `eligibility` (free text) but never saves `solver_eligibility_codes`, `solver_eligibility_details`, or `solver_eligibility_types` (the actual DB column). The challenges table has `solver_eligibility_types` (Json) and `solver_eligibility_id` (FK) columns, but neither is written.

### Bug 3: `useChallengeDetail` Doesn't Fetch Solver Fields
**Where**: `useChallengeForm.ts` lines 54-60 — the select query fetches `eligibility` and `visibility` but NOT `solver_eligibility_types`, `solver_eligibility_id`, `challenge_visibility`, or `hook`. So even if saved, they'd never load on the review page.

### Bug 4 (Minor): AccessModelSummary is Unnecessary
User confirmed "Access model summary is not required." It can be removed from the review page.

## Changes

### 1. Fix `saveStep` Call — Save All AI Fields Properly
**File**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

Update the `saveStep.mutateAsync` call (lines 360-376) to:
- Save `deliverables` as the raw array (not wrapped in `{ items: ... }`)
- Save `evaluation_criteria` as the raw array (not wrapped in `{ criteria: ... }`)
- Save `solver_eligibility_types` as JSON array of `{ code, label }` objects from `spec.solver_eligibility_details`
- Save `challenge_visibility` from `spec.challenge_visibility`
- Save `hook` from `spec.hook`

### 2. Fix `useChallengeDetail` — Fetch Missing Columns
**File**: `src/hooks/queries/useChallengeForm.ts`

Add to the select query and `ChallengeDetail` interface:
- `solver_eligibility_types`
- `solver_eligibility_id`  
- `challenge_visibility`
- `hook`
- `effort_level`

### 3. Fix AISpecReviewPage — Read Data From Correct Shape
**File**: `src/pages/cogniblend/AISpecReviewPage.tsx`

Update `getRawData` to unwrap both formats: if `deliverables` is `{ items: [...] }`, extract the array; if it's already an array, use directly. Same for `evaluation_criteria` with `{ criteria: [...] }`. This handles both old and new data.

For solver eligibility: read from `solver_eligibility_types` (DB column) instead of non-existent `solver_eligibility_codes`, and map codes to the master data for the checkbox editor.

### 4. Remove AccessModelSummary from Review Page
**File**: `src/pages/cogniblend/AISpecReviewPage.tsx`

Remove `AccessModelSummary` from both QUICK and STRUCTURED modes, and from the `SolverEligibilityEditor` component. Keep the component file itself (used elsewhere).

## Files Summary

| File | Action |
|------|--------|
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Fix saveStep to save raw arrays + solver types |
| `src/hooks/queries/useChallengeForm.ts` | Add missing columns to select + interface |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Fix data reading + remove AccessModelSummary |

