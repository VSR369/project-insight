

## Creator AI Review — Score Fix Plan

### Problem
Creator AI Review scores always land around ~55 due to 8 root causes, primarily: legal compliance penalization (creators don't attach legal docs), wrong DB column names causing NULL geography, harsh scoring curves, and circular score dependencies.

### Changes

**File 1: `supabase/functions/check-challenge-quality/contextFetcher.ts`**
- Fix org query: change `hq_country_code` → `hq_country_id` and `name` → `organization_name`
- Add a JOIN to `countries` table to resolve `hq_country_id` (UUID) → `code` (2-letter ISO) for geography lookup
- Filter challenge fields sent to AI based on governance mode (only send the fields relevant to QUICK/STRUCTURED/CONTROLLED instead of all 40+ fields)

**File 2: `supabase/functions/check-challenge-quality/promptBuilder.ts`**
- Remove `legal_compliance_score` from scoring criteria in system prompt
- Replace with 4-dimension model: Completeness, Clarity, Solver Readiness, Governance Alignment
- Remove "Analyze legal documents" instruction from system prompt
- Remove legal document section from user prompt when `reviewScope === 'creator_fields_only'`
- Add explicit instruction: "Do NOT penalize for missing legal documents — legal docs are assembled after curation, not by creators"
- Adjust scoring guidance to be calibrated: suggestion=minor polish, warning=should address, critical=blocker

**File 3: `supabase/functions/check-challenge-quality/index.ts`**
- Remove `legal_compliance_score` from TOOL_SCHEMA required fields
- Remove `legal_gaps` from required fields
- Keep them as optional (backwards compat for non-creator reviews)
- Add a new optional `content_quality_score` to replace legal_compliance in creator scope

**File 4: `src/hooks/cogniblend/useCreatorAIReview.ts`**
- Change `DimensionScores` to 4 dimensions (drop `legalCompliance`)
- Update `dimAvg` calculation: divide by 4 instead of 5
- Use `content_quality_score` if returned by AI, otherwise derive from completeness+clarity avg

**File 5: `src/lib/creatorReviewMapper.ts`**
- Adjust severity scores: `critical: 45`, `warning: 72`, `suggestion: 88`
- Fix `deriveFieldScore`: no-gap fields score 92-98 (cap 98, floor 82), independent of dimAvg
- Break circular dependency: no-gap score uses a fixed baseline, not dimAvg

**File 6: `src/components/cogniblend/creator/DimensionScoreBadges.tsx`**
- Remove `legalCompliance` dimension from display
- Update to show 4 badges instead of 5

### Risk Assessment
- **LOW risk**: All changes are scoped to Creator review path only (`reviewScope === 'creator_fields_only'`). Non-creator reviews (Curator/LC) are unaffected because they don't use this edge function.
- The tool schema keeps legal fields as optional, so if the AI returns them they're just ignored client-side.
- Geography fix corrects a bug — previously always NULL.

### Technical Details
- `seeker_organizations.hq_country_id` is a UUID FK to `countries(id)` where `countries.code` has the 2-letter ISO code
- The context fetcher will JOIN: `.select("id, organization_type_id, hq_country_id, governance_profile, organization_name, countries(code)")` 
- Then extract: `const countryCode = org?.countries?.code`

