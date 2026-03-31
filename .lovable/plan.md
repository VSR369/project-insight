

# Add Primary Industry Segment to Creator → Curator Flow

## Problem
The Creator form has a multi-select "Industry Domain" chip picker (`domain_tags`) but never maps a primary segment to `industrySegmentId`. The `useSubmitSolutionRequest` hook already accepts and stores `industrySegmentId` into `eligibility.industry_segment_id`, but `buildPayload()` never populates it. So the Curator page finds nothing.

## Changes

### 1. Add a dedicated "Industry Segment" dropdown to EssentialDetailsTab
**File:** `src/components/cogniblend/creator/EssentialDetailsTab.tsx`

- Add a new `Select` dropdown labeled **"Primary Industry Segment"** (required) above the existing "Industry Domain" chip selector
- Populated from the same `industrySegments` prop (already passed in)
- Form field name: `industry_segment_id`
- Single-select, required for all governance modes

### 2. Add `industry_segment_id` to the form schema
**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`

- Add `industry_segment_id: z.string().min(1, 'Please select a primary industry segment')` to `buildCreatorSchema()`
- Add `industry_segment_id: ''` to `defaultValues`
- In `buildPayload()`, add: `industrySegmentId: data.industry_segment_id`

### 3. Update seed content
**File:** `src/components/cogniblend/creator/creatorSeedContent.ts`

- Add `industry_segment_id: ''` placeholder (resolved at runtime like `domain_tags`)
- In `handleFillTestData`, set `industry_segment_id` to `segments[0]?.id`

### 4. Update the plan file
**File:** `.lovable/plan.md`

- Document that the primary industry segment flows from Creator → `eligibility.industry_segment_id` → Curator's `resolveIndustrySegmentId` fallback chain

## No backend changes needed
`useSubmitSolutionRequest` already writes `payload.industrySegmentId` into `eligibility.industry_segment_id`. The Curator page's `resolveIndustrySegmentId` already reads from `eligibility.industry_segment_id` (step 2 in the fallback chain). This is purely a frontend wiring fix.

