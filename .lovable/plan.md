

# Plan: Structured Display for Deliverables, Evaluation Criteria, Eligibility & Visibility in AI Spec Review

## Problem

The `AISpecReviewPage` currently renders **all fields as plain text** via `whitespace-pre-line` paragraphs — including deliverables (array), evaluation criteria (array of objects with name/weight/description), eligibility, and visibility. This makes structured data look cluttered and inconsistent with the Manual Editor's structured UX.

Additionally, eligibility and visibility are currently free-text AI outputs instead of being selected from the **same master data options** used in the Manual Editor (Step 5 — `StepProviderEligibility.tsx`).

## Changes

### 1. Update Edge Function to Return Structured Eligibility & Visibility
**File:** `supabase/functions/generate-challenge-spec/index.ts`

Expand the tool schema to include structured eligibility/visibility fields that match the Manual Editor's master data options:

- `challenge_visibility`: enum from `VISIBILITY_OPTIONS` (public, registered_users, platform_members, curated_experts, invited_only)
- `challenge_enrollment`: enum from `ENROLLMENT_OPTIONS` (open_auto, curator_approved, direct_nda, org_curated, invitation_only)
- `challenge_submission`: enum from `SUBMISSION_OPTIONS` (all_enrolled, shortlisted_only, invited_solvers)
- `eligibility_model`: enum from `ELIGIBILITY_MODELS` (OC, DR, CE, IO, HY)
- Keep `eligibility` as free-text for additional notes

Update the system prompt to instruct AI to select from these exact option values based on the problem context and maturity level.

### 2. Update Hook Types
**File:** `src/hooks/mutations/useGenerateChallengeSpec.ts`

Add new fields to `GeneratedSpec` interface:
- `challenge_visibility`, `challenge_enrollment`, `challenge_submission`, `eligibility_model`

### 3. Rewrite Section Rendering in AISpecReviewPage
**File:** `src/pages/cogniblend/AISpecReviewPage.tsx`

Replace the generic `ReadOnlySectionCard` and `EditableSectionCard` with field-type-aware renderers:

**Deliverables** — Render as a numbered list with bullet items (matching the Manual Editor's list UI), not a JSON dump.

**Evaluation Criteria** — Render as a 4-column table (#, Name, Weight%, Description) with a total weight footer bar — same layout as `StepEvaluation.tsx`.

**Eligibility & Visibility** — Render as a structured card grid showing:
- Visibility tier (from `VISIBILITY_OPTIONS` with label + description)
- Enrollment tier (from `ENROLLMENT_OPTIONS`)
- Submission tier (from `SUBMISSION_OPTIONS`)
- Eligibility Model (from `ELIGIBILITY_MODELS` with code + description)
- Free-text eligibility notes below

For STRUCTURED mode's editable cards, deliverables get an editable list UI, criteria get an editable table, and eligibility/visibility get dropdown selectors matching the Manual Editor.

### 4. Wire Structured Data to Manual Editor Sync
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx`

When AI spec populates the shared state, also map the new structured fields (`challenge_visibility`, `challenge_enrollment`, `challenge_submission`, `eligibility_model`) so they flow into the wizard form when switching to Manual Editor.

## Technical Details

- The visibility/enrollment/submission options are already defined as constants in `StepProviderEligibility.tsx` — extract them to a shared constants file or import directly
- The eligibility models are defined in `ApprovalPublicationConfigTab.tsx` — similarly extract for reuse
- The AI prompt will list the exact option values so the model selects valid codes, not free-text descriptions
- Fallback: if AI returns an unrecognized value, default to the most open option (public/open_auto/all_enrolled/OC)

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/generate-challenge-spec/index.ts` | Modify — add structured eligibility/visibility to tool schema + prompt |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Modify — extend `GeneratedSpec` type |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Rewrite — structured renderers for deliverables, criteria, eligibility/visibility |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Modify — sync new fields to shared state |

