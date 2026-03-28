

# Fix Industry Segment Resolution + Curator Selector for Solver Expertise

## Problem

When the curator clicks Edit on Solver Expertise Requirements, the taxonomy tree doesn't load because `industrySegmentId` resolves to `null`. The current code only checks `challenge.eligibility?.industry_segment_id` — missing two other sources. Additionally, if no source has the industry segment (e.g. early-stage challenges), the curator has no way to select one.

## What changes

### 1. Add missing columns to the Supabase query

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

- Add `targeting_filters` and `eligibility_model` to the `ChallengeData` interface (~line 141)
- Add both columns to the `.select()` query (~line 970)

### 2. Create `resolveIndustrySegmentId` helper

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

A utility function that checks three sources in priority order:

1. `targeting_filters.industries[0]` — set by Account Manager during intake
2. `eligibility.industry_segment_id` — set by Challenge Creator in wizard
3. `eligibility_model` — fallback field

Returns the first non-null value, or `null` if none exist.

### 3. Use the resolved ID in the `solver_expertise` case

Replace the current single-source lookup (~line 2763–2764) with `resolveIndustrySegmentId(challenge)`.

### 4. Add industry segment selector to `SolverExpertiseSection` when ID is null

**File: `src/components/cogniblend/curation/SolverExpertiseSection.tsx`**

Instead of returning the dead-end "No industry segment configured" message (line 252–258), show a dropdown selector populated from the `useIndustrySegments()` hook (already imported). The curator picks an industry segment, which:

- Sets a local state `selectedSegmentId` used to load the taxonomy tree
- Includes the selected segment ID in the `onSave` callback data so the parent can persist it to `eligibility`

The flow becomes:
- If `industrySegmentId` prop is provided → auto-populate, show as read-only badge (existing behavior)
- If `industrySegmentId` is null and `editing` is true → show a `<Select>` dropdown of active industry segments; curator must pick one before the taxonomy tree appears
- If `industrySegmentId` is null and not editing → show "Not yet configured" with a prompt to click Edit

### 5. Persist curator's industry segment choice

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

When `onSave` returns an `industry_segment_id` (new field on `SolverExpertiseData`), also update `challenge.eligibility` with the selected segment so it persists for future loads.

## Technical details

**`SolverExpertiseSection.tsx` changes:**
- Add `industry_segment_id?: string` to `SolverExpertiseData`
- Replace the early return at line 252 with a conditional: if editing and no ID, render a `<Select>` from `useIndustrySegments()` data
- Use local state `effectiveSegmentId = industrySegmentId ?? localSelectedId`
- Pass `effectiveSegmentId` to `useFullTaxonomyTree`

**`CurationReviewPage.tsx` changes:**
- `ChallengeData` gets `targeting_filters: Json | null` and `eligibility_model: string | null`
- Query `.select(...)` adds both columns
- New `resolveIndustrySegmentId()` function with 3-step fallback
- `onSave` handler in `solver_expertise` case: if `expertiseData.industry_segment_id` exists, also mutate `eligibility` to include it

## Result

- If AM/CR already set an industry segment → auto-populated, curator sees it as a badge
- If no one set it → curator sees a dropdown in edit mode, picks one, and proceeds with the taxonomy tree
- Industry segment is never null when the expertise tree is needed

