

# Unified Challenge Form: Dashboard View = New Challenge Layout

## Status: ✅ IMPLEMENTED

## Changes Made

### 1. ConversationalIntakeContent — Full AM Field Coverage
- Added `title` input field at the top of the form
- Added `industry_segment_id` dropdown (reuses `useIndustrySegments`)
- Added `budget_min` input for budget range support (shows min–max when AM provided a range)
- Added `expected_timeline` dropdown (1-3, 3-6, 6-12, 12+ months)
- Added `beneficiaries_mapping` textarea in Expand Challenge Details
- Added `solution_expectations` textarea in Expand Challenge Details
- Added dynamic field rendering: any `extended_brief` key not in the hardcoded set renders as an editable textarea under "Additional fields from Account Manager"

### 2. Pre-fill Logic Enhanced
- Pre-fills `title` from challenge data
- Pre-fills `budget_min` from `reward_structure.budget_min`
- Pre-fills `expected_timeline` from `phase_schedule.expected_timeline`
- Pre-fills `industry_segment_id` from `targeting_filters.industry_segment_id`
- Pre-fills `beneficiaries_mapping` and `solution_expectations` from `extended_brief`
- Detects unknown `extended_brief` keys and populates dynamic fields state

### 3. Update Handler Enhanced
- Saves `title`, `reward_structure` (budget_min + budget_max + currency), `phase_schedule`, `targeting_filters`, `beneficiaries_mapping`, `solution_expectations`, and all dynamic AM fields back to DB

### 4. useChallengeDetail Query Expanded
- Added `eligibility_model`, `domain_tags`, `targeting_filters` to the select clause
- Updated `ChallengeDetail` interface with new fields

### 5. Dynamic Field Rendering
- `KNOWN_BRIEF_KEYS` set defines all statically-rendered keys
- Any `extended_brief` key outside this set renders as an editable textarea
- Dynamic fields are preserved during save (merged back into `extended_brief`)
- Human-readable labels generated via `humanizeKey()` (e.g., "custom_am_field" → "Custom Am Field")

## Files Modified
| File | Change |
|---|---|
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Added title, industry segment, budget range, timeline, beneficiaries, solution expectations fields + dynamic brief rendering |
| `src/hooks/queries/useChallengeForm.ts` | Expanded query select clause and ChallengeDetail interface |
