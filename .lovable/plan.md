

# Plan: Seed Realistic AM/RQ Intake Data for CR/CA Spec Review

## Problem
The current `setup-test-scenario` edge function creates a bare challenge with only `title` and `description`. When the CR/CA logs in and navigates to the spec review page, there is no AM/RQ intake data to review — no problem statement, industry segment, budget, timeline, or extended brief. The CR/CA sees empty fields instead of the data the AM or RQ would have submitted.

## Solution
Update the seed edge function to create **two challenges** per scenario — one simulating an AM submission (MP model) and one simulating an RQ submission (AGG model) — each pre-populated with realistic intake data matching what `SimpleIntakeForm` + `useSubmitSolutionRequest` would produce. The challenge is set to **Phase 2** (Spec Review) so the CR/CA can immediately begin reviewing.

## Data to Seed (per challenge)

| Column | AM (MP) Value | RQ (AGG) Value |
|--------|--------------|----------------|
| `title` | "Predictive Maintenance for Smart Manufacturing" | "Cost Reduction Idea" |
| `problem_statement` | Detailed manufacturing problem | RQ template-based idea text |
| `scope` | Solution expectations text | (empty — RQ doesn't provide) |
| `description` | "Demo challenge..." | "Demo challenge..." |
| `current_phase` | 2 | 2 |
| `phase_status` | `SPEC_REVIEW` | `SPEC_REVIEW` |
| `reward_structure` | `{currency: 'USD', budget_min: 25000, budget_max: 75000}` | `{}` (RQ doesn't set budget) |
| `phase_schedule` | `{expected_timeline: '3-6'}` | `{expected_timeline: '6-12'}` |
| `eligibility` | `{industry_segment_id: '<Technology ID>', domain_tags: ['manufacturing','IoT'], urgency: 'standard'}` | `{industry_segment_id: '<Healthcare ID>', domain_tags: ['healthcare'], urgency: 'standard'}` |
| `extended_brief` | `{am_approval_required: true}` | `{beneficiaries_mapping: '<rich text>'}` |
| `operating_model` | MP | AGG |

## Changes

### File: `supabase/functions/setup-test-scenario/index.ts`

1. **Replace single bare challenge creation** (current Step 3, lines 280-301) with two pre-populated challenges:
   - **MP challenge**: Simulates AM intake with full problem brief data, assigned to the AM user, at Phase 2 ready for CR review.
   - **AGG challenge**: Simulates RQ intake with template-based idea, assigned to the RQ user, at Phase 2 ready for CR review.

2. **Use real industry segment IDs** from the database (query `industry_segments` table during seed to get Technology and Healthcare IDs dynamically).

3. **Assign challenge roles correctly**: AM/RQ gets their role on the appropriate challenge, CR gets assigned on both, and all other roles (CU, ID, ER, LC, FC) get assigned on both challenges so downstream phases can proceed.

4. **Update Step 4** (role assignment loop) to assign roles per-challenge based on operating model alignment.

### No Frontend Changes Required
The AISpecReviewPage and DomainTargetingCard already read `eligibility.industry_segment_id`, `problem_statement`, `reward_structure`, `extended_brief`, etc. — they just need the data to exist in the database.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Seed two realistic challenges at Phase 2 with AM/RQ intake data |

