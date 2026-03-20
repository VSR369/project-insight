

## Plan: Auto-Generate AI Spec on Page Load for Incomplete Challenges

### Problem

The "New Horizon Company — Demo Challenge" (a7962f69) was created by the test setup script with:
- `description`: "This is a demo challenge created by the test scenario setup." (non-null)
- `problem_statement`: null
- `scope`: null
- `hook`: null
- `ip_model`: null
- `deliverables.items`: empty array
- `evaluation_criteria`: has criterion names but all descriptions are empty strings

Because `description` is non-null, the current `hasAiData` guard on line 820 passes (it checks `challenge.description`), so the page renders — but every section shows "No content yet" because the actual AI-generated fields are missing.

### Solution

When the spec review page detects that key AI fields are missing (even if `description` exists), automatically invoke the `generate-challenge-spec` edge function to populate ALL sections, save the result to the database, and refresh the page.

### Change: `src/pages/cogniblend/AISpecReviewPage.tsx`

**1. Fix the `hasAiData` check (line 820-830)**
- Remove `challenge.description` from the check — a generic description from a seed script does not count as AI data
- The check becomes: `problem_statement` OR `hook` OR `scope` OR non-empty deliverables items

**2. Replace the static "No AI Specification Available" guard (lines 832-858) with auto-generation logic**

Add:
- Import `useGenerateChallengeSpec` from `@/hooks/mutations/useGenerateChallengeSpec`
- A `useRef` flag (`autoGenTriggered`) to prevent double-firing in StrictMode
- A `useEffect` that runs when `hasAiData` is false and challenge data is loaded:
  1. Calls `generateSpec.mutateAsync()` with `problem_statement` set to `challenge.description || challenge.title` and `maturity_level` set to `challenge.maturity_level || 'blueprint'`
  2. On success, maps the returned `GeneratedSpec` to challenge fields and calls `saveStep.mutateAsync()` to persist ALL fields: `title`, `problem_statement`, `scope`, `description`, `deliverables` (as `{items: [...]}` format), `evaluation_criteria` (as `{criteria: [...]}` format), `hook`, `ip_model`, `maturity_level`, `solver_eligibility_types`, `solver_visibility_types`, `challenge_visibility`
  3. Query invalidation happens automatically via `useSaveChallengeStep.onSuccess`
  4. Shows a success toast
  5. On error, sets an error state with retry option

- While generating, render a loading UI: Sparkles icon with "Generating AI Specification..." text and skeleton placeholders for each section
- On error, render an error state with "Retry" button and fallback link to Advanced Editor

**No other files need changes.** The edge function, save mutation, and query invalidation all exist already.

### Technical Details

- `useGenerateChallengeSpec` calls the `generate-challenge-spec` edge function (already deployed and working — it successfully generated challenge 3c9839ae)
- The `GeneratedSpec` response includes: `title`, `problem_statement`, `scope`, `description`, `deliverables[]`, `evaluation_criteria[]`, `hook`, `ip_model`, `solver_eligibility_codes`, `solver_eligibility_details`, `visible_solver_codes`, `solver_visibility_details`, `eligibility_notes`, `challenge_visibility`
- `useSaveChallengeStep` normalizes fields and updates the `challenges` table, then invalidates `['challenge-detail', challengeId]` causing re-render with populated data
- The `useRef` guard prevents the effect from firing twice in React StrictMode

