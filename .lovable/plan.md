

# Ensure Full Section Coverage & Remove EB Expected Outcomes

## Current State

**Frontend groups** show 28 sections total:
- Content (7): problem_statement, scope, deliverables, expected_outcomes, submission_guidelines, maturity_level, hook
- Evaluation (3): evaluation_criteria, reward_structure, complexity
- Legal & Finance (4): ip_model, legal_docs, escrow_funding, domain_tags
- Publication (7): phase_schedule, eligibility, visibility, solver_expertise, submission_deadline, challenge_visibility, effort_level
- Extended Brief (7): context_and_background, root_causes, affected_stakeholders, current_deficiencies, extended_brief_expected_outcomes, preferred_approach, approaches_not_of_interest

**Edge function** (`CURATION_SECTION_KEYS`) has 27 — missing `expected_outcomes`.

## Changes

### 1. Remove `extended_brief_expected_outcomes` everywhere

This section duplicates `expected_outcomes` (already in Content group). Remove it from:

- **`supabase/functions/triage-challenge-sections/index.ts`** — remove from `CURATION_SECTION_KEYS`
- **`src/lib/cogniblend/curationSectionFormats.ts`** — remove from `SECTION_FORMAT_CONFIG`, `EXTENDED_BRIEF_SUBSECTION_KEYS` (7 → 6), and `EXTENDED_BRIEF_FIELD_MAP`
- **`supabase/functions/review-challenge-sections/promptTemplate.ts`** — remove from `SECTION_FORMAT_MAP` and `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS`
- **`src/lib/aiReviewPromptTemplate.ts`** — remove from its copy of these maps

### 2. Add `expected_outcomes` to edge function triage

Add `"expected_outcomes"` to `CURATION_SECTION_KEYS` in `triage-challenge-sections/index.ts`. This brings the total to 27 sections (matching 27 in the frontend after EB removal).

### 3. No collapsible AI Suggested Version

Dropped per user request — the AI Suggested Version panel stays as-is (always visible).

## Final Section Count

After changes: 7 + 3 + 4 + 7 + 6 = **27 sections**, all covered by the triage edge function.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/triage-challenge-sections/index.ts` | Add `expected_outcomes`, remove `extended_brief_expected_outcomes` |
| `src/lib/cogniblend/curationSectionFormats.ts` | Remove `extended_brief_expected_outcomes` from config, subsection keys, field map |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Remove from format maps |
| `src/lib/aiReviewPromptTemplate.ts` | Remove from format maps |

