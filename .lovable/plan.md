

# Two Changes: Solver Expertise Section + Extended Brief AI Review Fix

## Problem 1: Missing "Solver Expertise Requirements" Section

Currently, there is no way for the curator to specify what proficiency areas, sub-domains, and specialities solvers should possess. The challenge already has an industry segment (via `targeting_filters`), but there's no mechanism to map required expertise from the 5-level taxonomy (Industry Segment → Expertise Level → Proficiency Area → Sub-domain → Speciality).

## Problem 2: Extended Brief Subsections Get No Individual AI Reviews

When "Review Sections by AI" is clicked, the edge function sends `extended_brief` as one section key. The AI returns a single review for the whole Extended Brief — but the subsections (`context_and_background`, `root_causes`, etc.) never get individual reviews. The `CURATION_SECTIONS` array in the edge function has `extended_brief` as one entry, not the 7 subsections.

---

## Fix 1: Solver Expertise Requirements Section

### Database
- Add `solver_expertise_requirements` JSONB column to `challenges` table via migration
- Structure: `{ expertise_levels: [{id, name}], proficiency_areas: [{id, name}], sub_domains: [{id, name}], specialities: [{id, name}] }`
- When empty/null = "ALL applicable" (no restriction)

### New Component: `SolverExpertiseSection.tsx`
- Located at `src/components/cogniblend/curation/SolverExpertiseSection.tsx`
- Shows the challenge's industry segment (read-only, from `targeting_filters`)
- For each expertise level (from `expertise_levels` table):
  - Shows proficiency areas, sub-domains, specialities as a collapsible tree
  - Checkboxes to select/deselect at each level
  - When nothing is selected: shows "All applicable" badge
- Uses existing `useProficiencyTaxonomy` hook to fetch the tree
- Edit mode: multi-select tree with checkboxes
- View mode: shows selected items as chips/badges grouped by level

### Section Config
- Add `solver_expertise` to `SECTION_FORMAT_CONFIG` as format `custom`, `aiCanDraft: true`, `aiReviewEnabled: true`, `curatorCanEdit: true`
- `aiUsesContext: ['scope', 'deliverables', 'evaluation_criteria', 'eligibility', 'domain_tags']`

### AI Integration
- When AI reviews this section, it reads all challenge content and suggests which proficiency areas / sub-domains / specialities are most relevant
- AI output: JSON object with arrays of IDs + names from master data
- Edge function fetches the taxonomy tree for the challenge's industry segment and injects allowed options into the prompt
- Accept flow: validates IDs against master data before saving

### CurationReviewPage Integration
- Add `solver_expertise` to the SECTIONS array in `publication` group (after `eligibility`)
- Add to challenge query select
- Add renderer/editor switch case
- Add to `getSectionContent`, `handleAcceptRefinement`, `masterDataOptions` resolution

---

## Fix 2: Extended Brief Subsection-Level AI Reviews

### Root Cause
The `CURATION_SECTIONS` array in the edge function has `extended_brief` as a single entry. When the AI reviews it, it returns one review with key `extended_brief`. The 7 subsection keys (`context_and_background`, `root_causes`, etc.) are never sent to the AI as separate section keys.

### Fix in Edge Function (`review-challenge-sections/index.ts`)
- Replace the single `extended_brief` entry in `CURATION_SECTIONS` with the 7 individual subsection keys:
  - `context_and_background`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `extended_brief_expected_outcomes`, `preferred_approach`, `approaches_not_of_interest`
- Each with its own description matching the format-specific instructions
- When building the user prompt data, extract each subsection's value from `extended_brief` JSONB and include as separate data fields
- Keep `extended_brief` in the data payload so AI has full context

### Fix in Frontend (CurationReviewPage)
- When batch AI review returns, the 7 subsection reviews will now have individual `section_key` values matching `EXTENDED_BRIEF_SUBSECTION_KEYS`
- `ExtendedBriefDisplay` already maps `aiSectionReviews` by subsection key — so this will "just work" once the edge function returns per-subsection reviews
- Remove the parent-level `extended_brief` from `CURATION_SECTIONS` since it's no longer reviewed as one block

---

## Files to Create/Modify

| File | Action |
|------|--------|
| SQL migration | Add `solver_expertise_requirements JSONB` column to `challenges` |
| `src/components/cogniblend/curation/SolverExpertiseSection.tsx` | New — tree-based expertise selector |
| `src/lib/cogniblend/curationSectionFormats.ts` | Add `solver_expertise` entry |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add section def, renderer, handlers |
| `supabase/functions/review-challenge-sections/index.ts` | Replace `extended_brief` with 7 subsection keys, extract subsection data |
| `supabase/functions/refine-challenge-section/index.ts` | Add `solver_expertise` handling with taxonomy injection |
| `src/lib/aiReviewPromptTemplate.ts` | Add `solver_expertise` format mapping |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Add subsection keys + `solver_expertise` to format map |

