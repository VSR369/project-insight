

# Enhance `check-challenge-quality` with Industry, Geography, Governance, and Rate Card Context

## Problem Summary
The `check-challenge-quality` edge function (Creator AI Review) sends raw challenge JSON to the AI with zero contextual enrichment. Meanwhile, `review-challenge-sections` (Curator AI Review) already has a sophisticated 5-layer prompt with industry packs, geography context, rate cards, section hints, and org intelligence. The client hook (`useCreatorAIReview`) already sends `governanceMode`, `engagementModel`, and `industrySegmentId` but the edge function ignores them.

**Issues 2, 3 from the analysis are ALREADY FIXED** -- `review-challenge-sections/promptBuilders.ts` (lines 59-70) and `industryGeoPrompt.ts` (lines 79-99) already inject industry packs and section hints. No work needed there.

## What Needs to Change

### Issues to Fix (4 items)

| # | Issue | Impact | Files |
|---|-------|--------|-------|
| 1 | No industry/geo context in Creator AI Review | AI reviews pharma the same as a hackathon | Edge function |
| 4 | No governance mode in prompt | Can't differentiate QUICK vs CONTROLLED rigor | Edge function |
| 5 | No engagement model in prompt | Can't flag MP-specific legal gaps | Edge function |
| 7 | No rate card in Creator AI Review | Can't validate prize reasonableness | Edge function |

### Issues Already Fixed (no work needed)
- Issue 2: Industry pack injection into section prompts -- already wired in `promptBuilders.ts`
- Issue 3: Section hints from industry packs -- already handled in `industryGeoPrompt.ts`

### Issues Deferred
- Issue 6 (model consistency): Documentation only, not a code fix
- Issue 8 (structured JSONB for 3 sections): Separate migration task

---

## Implementation Plan

### Step 1: Create helper module `check-challenge-quality/contextFetcher.ts`

Extract context-fetching logic into a dedicated file to keep `index.ts` under 200 lines.

This module exports a single function `fetchChallengeContext(adminClient, challengeId, params)` that:
1. Fetches challenge data + legal docs (existing logic, moved here)
2. Fetches org data from `seeker_organizations` via `challenge.organization_id`
3. Resolves industry code from `seeker_org_industries` -> `industry_segments`
4. Fetches `industry_knowledge_packs` by industry code
5. Fetches `geography_context` by region (using `countryToRegion` mapping)
6. Fetches rate card from `rate_cards` table using org type + maturity level

Returns a structured `QualityCheckContext` object with all enrichment data.

### Step 2: Create helper module `check-challenge-quality/promptBuilder.ts`

Builds the enriched system prompt and user prompt. Exports `buildQualityCheckPrompt(context, params)`.

**System prompt enhancements:**
- Add governance mode awareness: "This is a {CONTROLLED} challenge -- apply maximum rigor, expect 12 required fields, separate roles, mandatory escrow"
- Add engagement model awareness: "Operating model: {MP} -- verify Creator has addressed org-specific legal requirements"
- Inject industry context block (reuse pattern from `industryGeoPrompt.ts`): industry overview, KPIs, frameworks, regulatory landscape
- Inject geography context: data privacy laws, business culture, currency context
- Add rate card awareness: "Rate card for this segment: floor $X/hr, reward floor $Y, ceiling $Z. Challenge offers $W -- {ABOVE/BELOW} floor."

**User prompt enhancements:**
- Add `GOVERNANCE MODE:` section with mode-specific field expectations
- Add `ENGAGEMENT MODEL:` section (MP vs AGG implications)
- Add `INDUSTRY CONTEXT:` section with industry-specific review criteria
- Add `GEOGRAPHIC CONTEXT:` section
- Add `RATE CARD BENCHMARK:` section for prize validation

### Step 3: Refactor `check-challenge-quality/index.ts`

Slim down to ~120 lines by importing from the two new helpers:
1. Parse full request body: `{ challenge_id, challengeId, governanceMode, engagementModel, industrySegmentId, reviewScope }`
2. Call `fetchChallengeContext()` for all enrichment
3. Call `buildQualityCheckPrompt()` for prompt assembly
4. Keep existing AI gateway call, tool schema, and response handling
5. Add `governance_alignment_score` to the tool schema (new score dimension)

### Step 4: Update tool schema with governance-aware scoring

Add to `assess_challenge_quality` function parameters:
- `governance_alignment_score` (0-100): Does the challenge meet governance mode expectations?
- `industry_relevance_notes`: Array of industry-specific observations
- `rate_card_assessment`: Object with `is_within_range`, `recommendation`

---

## Technical Details

**Files created:**
- `supabase/functions/check-challenge-quality/contextFetcher.ts` (~130 lines)
- `supabase/functions/check-challenge-quality/promptBuilder.ts` (~130 lines)

**Files modified:**
- `supabase/functions/check-challenge-quality/index.ts` (refactored from 250 to ~120 lines)

**No client-side changes needed** -- `useCreatorAIReview.ts` already sends `governanceMode`, `engagementModel`, `industrySegmentId`. The edge function just needs to read and use them.

**Country-to-region mapping** will be duplicated from `industryGeoPrompt.ts` (edge functions can't share code across function directories in Supabase).

