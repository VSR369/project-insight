

# Plan: Simplify AI Spec — Solver-Type-Driven Eligibility & Visibility

## Problem

The AI Spec Review currently shows **enrollment**, **submission**, and **eligibility_model** as separate confusing cards. In the Manual Editor, the user simply selects **solver categories** (from `md_solver_eligibility`) and **provider categories** (from `participation_modes`), and the visibility/enrollment/submission are **auto-derived** from the selected solver category's defaults (`default_visibility`, `default_enrollment`, `default_submission`).

The AI should work the same way: intelligently select solver categories from master data, then auto-derive the access control fields — not expose the raw enrollment/submission/eligibility_model breakdown to the user.

## Changes

### 1. Edge Function: Fetch Solver Categories & Have AI Select Them
**File:** `supabase/functions/generate-challenge-spec/index.ts`

- Query `md_solver_eligibility` (active records) to get solver category codes, labels, descriptions, and their default visibility/enrollment/submission values
- Include the solver category list in the system prompt so the AI selects from real master data
- Replace `challenge_visibility`, `challenge_enrollment`, `challenge_submission`, `eligibility_model` in the tool schema with:
  - `solver_eligibility_codes`: array of solver category codes the AI recommends (e.g., `["CERT_L2", "REG_VERIFIED"]`)
  - `eligibility_notes`: free-text additional qualification notes
- After AI returns, look up the first selected category's `default_visibility`, `default_enrollment`, `default_submission` to auto-derive access control fields
- Return both the selected solver categories AND the derived access fields in the response

### 2. Update Hook Types
**File:** `src/hooks/mutations/useGenerateChallengeSpec.ts`

Update `GeneratedSpec` interface:
- Replace `challenge_visibility`, `challenge_enrollment`, `challenge_submission`, `eligibility_model` with:
  - `solver_eligibility_codes: string[]` — AI-selected solver category codes
  - `eligibility_notes: string` — free-text notes
  - Keep derived `challenge_visibility`, `challenge_enrollment`, `challenge_submission` as read-only derived values

### 3. Rewrite Eligibility/Visibility Display in AISpecReviewPage
**File:** `src/pages/cogniblend/AISpecReviewPage.tsx`

Replace the current `EligibilityVisibilityDisplay` (which shows 3 confusing tier cards + eligibility model card) with a **solver-category-focused display** matching the Manual Editor:

- Show "AI-Selected Solver Types" — render each selected solver category as a card with code badge, label, description, and requirement badges (Auth Required, Certified, etc.) — same layout as `StepProviderEligibility.tsx`
- Below, show a compact "Derived Access Model" summary using the existing `AccessModelSummary` component (already built) — this shows visibility → enrollment → submission as a flow diagram, auto-derived from selected categories
- Show eligibility notes as free text below

Remove the enrollment/submission/eligibility_model cards entirely from user view.

### 4. Wire to Manual Editor Sync
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx`

When AI spec populates shared state, map `solver_eligibility_codes` to `solver_eligibility_ids` (lookup by code) so the Manual Editor's solver tier checkboxes are pre-selected. The visibility/enrollment/submission will auto-derive via the existing `useEffect` in `StepProviderEligibility.tsx`.

## Technical Details

- The `md_solver_eligibility` table already has `code`, `label`, `description`, `default_visibility`, `default_enrollment`, `default_submission` columns — queried by the edge function at runtime
- The edge function will use a Supabase client to fetch solver categories, embed them in the prompt, then map AI selections back to derive access fields
- Fallback: if AI returns unrecognized codes, default to "All" (no restriction)
- The `AccessModelSummary` component already exists and renders the visibility → enrollment → submission flow

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/generate-challenge-spec/index.ts` | Modify — fetch solver categories from DB, update prompt + tool schema |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Modify — update `GeneratedSpec` type |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Modify — replace eligibility/visibility renderer with solver-category cards + AccessModelSummary |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Modify — map solver codes to IDs for wizard sync |

