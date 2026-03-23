

# AI Section Review for AM, RQ, CR/CA Roles

## Context

The Curation Review page (CU role) has a mature AI review system with:
- **Batch review**: "Review Sections by AI" button → calls `review-challenge-sections` edge function
- **Per-section inline panel**: `CurationAIReviewInline` component showing pass/warning/needs_revision status, editable comments, "Refine with AI" (calls `refine-challenge-section`), Accept & Save, re-review
- **Persistence**: Reviews stored in `challenges.ai_section_reviews` JSONB column

The goal is to bring this same Review → Edit Comments → Refine → Accept/Discard flow to:
1. **AM/RQ** — SimpleIntakeForm (view/edit mode) — intake fields
2. **CR/CA** — AISpecReviewPage — specification sections

## What Changes

### 1. Extend the Edge Function — Role-Aware Section Sets

**File**: `supabase/functions/review-challenge-sections/index.ts`

Add a `role_context` parameter to the request body. Based on the role, review different section subsets:

| Role Context | Sections Reviewed |
|---|---|
| `intake` (AM/RQ) | problem_statement, scope (from extended_brief: solution_expectations, beneficiaries_mapping, budget reasonableness) |
| `spec` (CR/CA) | problem_statement, scope, description, deliverables, evaluation_criteria, hook, ip_model |
| `curation` (CU) | All 14 sections (current behavior, unchanged) |

The system prompt will be adapted per role context — e.g., for intake it focuses on clarity and completeness of the brief; for spec it focuses on solver-readiness.

### 2. Generalize the AI Review Inline Component

**New file**: `src/components/cogniblend/shared/AIReviewInline.tsx`

Extract `CurationAIReviewInline` into a role-agnostic version. The component interface stays identical — it already accepts generic props (`sectionKey`, `review`, `currentContent`, `challengeId`, etc.). The only change is renaming and re-exporting from a shared location. `CurationAIReviewInline` becomes a thin re-export for backward compatibility.

### 3. Add AI Review to SimpleIntakeForm (AM/RQ)

**File**: `src/components/cogniblend/SimpleIntakeForm.tsx`

- In **view/edit mode only**, add a "Review with AI" button in the header area
- Below each rich-text field section (Problem Summary, Solution Expectations, Beneficiaries), render `AIReviewInline` with the matching section key
- Load persisted reviews from `challenge.ai_section_reviews` on mount
- On "Accept & Save", update the field value via the existing `useUpdateChallenge` mutation
- Pass `role_context: 'intake'` to the edge function call

### 4. Add AI Review to AISpecReviewPage (CR/CA)

**File**: `src/pages/cogniblend/AISpecReviewPage.tsx`

- Add a "Review Sections by AI" button (similar to CurationReviewPage) — only visible in STRUCTURED/CONTROLLED modes
- Below each section's content display, render `AIReviewInline`
- Load/persist reviews from `challenge.ai_section_reviews`
- On "Accept & Save", update the section value via existing `saveStep` mutation
- Pass `role_context: 'spec'` to the edge function call

### 5. Update the Refine Edge Function

**File**: `supabase/functions/refine-challenge-section/index.ts`

Minor update: accept `role_context` in the request body to tailor the refinement system prompt. For intake sections, the AI focuses on brief clarity; for spec sections, on solver-readiness. No structural changes needed — the function already handles arbitrary section keys.

## Technical Details

```text
Component Reuse Architecture:
┌──────────────────────────────┐
│   AIReviewInline (shared)    │  ← Extracted from CurationAIReviewInline
│   Props: sectionKey, review, │
│   currentContent, challengeId│
│   onAcceptRefinement, etc.   │
└──────┬───────┬───────┬───────┘
       │       │       │
  SimpleIntake  AISpec  CurationReview
  (AM/RQ)      (CR/CA) (CU - existing)
```

**Edge function call flow** (same for all roles):
1. Client calls `review-challenge-sections` with `{ challenge_id, role_context }`
2. Function selects section subset based on `role_context`
3. Returns `SectionReview[]` → persisted to `ai_section_reviews`
4. User edits comments → calls `refine-challenge-section` → Accept/Discard

**Files to create**: 1 (shared component)
**Files to modify**: 4 (SimpleIntakeForm, AISpecReviewPage, review-challenge-sections, refine-challenge-section)
**No database changes needed** — `ai_section_reviews` JSONB column already exists and supports arbitrary section keys.

