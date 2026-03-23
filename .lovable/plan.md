

# Fix: AI Review Key Mismatch in CR/CA Intake

## Root Cause

The "Review with AI" button works correctly -- it calls the edge function and gets results back. But the results never appear because of a **section key mismatch** between two layers:

**Edge function (`SPEC_SECTIONS`)** reviews these 7 sections:
`problem_statement`, `scope`, `description`, `deliverables`, `evaluation_criteria`, `hook`, `ip_model`

**Form (`AIReviewInline` panels)** displays these 4 sections:
`problem_statement`, `expected_outcomes`, `scope`, `beneficiaries_mapping`

Only `problem_statement` and `scope` overlap. The other 5 edge function results (`description`, `deliverables`, `evaluation_criteria`, `hook`, `ip_model`) have no panels in the form. And the 2 form panels (`expected_outcomes`, `beneficiaries_mapping`) never receive results because the edge function doesn't review them.

## Fix (2 files)

### 1. Edge function: `supabase/functions/review-challenge-sections/index.ts`

Update `SPEC_SECTIONS` to include `expected_outcomes` and `beneficiaries_mapping`:

```typescript
const SPEC_SECTIONS = [
  { key: "problem_statement", desc: "..." },
  { key: "expected_outcomes", desc: "Clear, measurable outcomes solvers should deliver" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity for solvers" },
  { key: "beneficiaries_mapping", desc: "Stakeholders and beneficiaries clearly identified" },
  { key: "description", desc: "..." },
  { key: "deliverables", desc: "..." },
  { key: "evaluation_criteria", desc: "..." },
  { key: "hook", desc: "..." },
  { key: "ip_model", desc: "..." },
];
```

Also update the `challengeFields` select for `spec` context to include `scope` (which stores `expected_outcomes` in DB) and ensure `extended_brief` is included for `beneficiaries_mapping`.

### 2. Form: `src/pages/cogniblend/ConversationalIntakePage.tsx`

**a)** The `handleRunAiReview` handler already merges `data.data.sections` into `aiReviews` state -- this is correct. But also merge from `data.data.all_reviews` (which includes previously persisted reviews for sections not re-reviewed), so all sections populate:

```typescript
// Use all_reviews (merged set) instead of just sections (new only)
const allReviews = data.data.all_reviews ?? data.data.sections;
for (const r of allReviews as SectionReview[]) { map[r.section_key] = r; }
```

**b)** Add `AIReviewInline` panels for the additional spec sections that exist in the form but currently lack review panels. The form already has description, deliverables, evaluation_criteria fields in the ExpandField/dynamic sections. Add review panels after those fields where they exist in the form UI.

**Files modified**: 2 (`review-challenge-sections/index.ts`, `ConversationalIntakePage.tsx`)

