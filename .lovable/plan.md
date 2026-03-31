

# Industry Segment: Creator → Curator Flow

## Data Flow
1. **Creator form** (`ChallengeCreatorForm.tsx`): User selects a "Primary Industry Segment" via a dedicated `<Select>` dropdown (field: `industry_segment_id`).
2. **Payload** (`buildPayload`): Maps `industry_segment_id` → `industrySegmentId` in the submit payload.
3. **Submission** (`useSubmitSolutionRequest`): Writes `industrySegmentId` into `eligibility.industry_segment_id` in the challenge row.
4. **Curator** (`CurationReviewPage.tsx`): `resolveIndustrySegmentId` reads from the fallback chain:
   - `targeting_filters` JSONB
   - `eligibility` JSONB (`industry_segment_id` key)
   - `eligibility_model`

## Recent Changes
- Added `industry_segment_id` field to Zod schema in `buildCreatorSchema()`
- Added `<Select>` dropdown in `EssentialDetailsTab.tsx` above the Industry Domain chip picker
- Mapped field in `buildPayload()`: `industrySegmentId: data.industry_segment_id`
- Moved the Industry Segment selector in Curator from `context_and_background` to `problem_statement` section
