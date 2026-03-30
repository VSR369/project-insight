

# Remaining Fixes Plan (6 items — skipping already-fixed bugs)

## Already Fixed (confirmed in code)
- **parseMasterDataCodes** JSON object handling ✅
- **reward_structure** → `'custom'` in SECTION_FORMAT_MAP ✅
- **reward_structure** format instruction ✅
- **Extended brief** content lookup in Pass 2 ✅
- **cleanAIOutput** skip for table sections ✅
- **Pass 2 filter** for empty sections ✅

---

## Remaining Fixes

### Fix A — Add missing fields to edge function SELECT
**File:** `supabase/functions/review-challenge-sections/index.ts` line 982

Add `expected_outcomes, success_metrics_kpis, data_resources_provided, solution_type, currency_code, organization_id` to the SELECT string. Without these, the AI can't see existing data for these sections.

### Fix B — Add 4 missing format instructions
**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts` (EXTENDED_BRIEF_FORMAT_INSTRUCTIONS)

Add explicit column schemas for:
- `success_metrics_kpis` → kpi, baseline, target, measurement_method, timeframe
- `data_resources_provided` → resource, type, format, size, access_method, restrictions
- `evaluation_criteria` → criterion_name, weight_percentage, description, scoring_method, evaluator_role
- `solver_expertise` → expertise_areas, certifications, experience_years, domain_knowledge

### Fix D — SINGLE_CODE_MAP Accept handler
**File:** `src/pages/cogniblend/CurationReviewPage.tsx` line 1944

Before `const code = newContent.trim()...`, add JSON object extraction so `{"selected_id":"PILOT","rationale":"..."}` correctly extracts just `"PILOT"`.

### Fix F — Complexity scale 1-5 → 1-10
**File:** `supabase/functions/review-challenge-sections/index.ts`

- Line 751: Change system prompt from "scale of 1-5" to "scale of 1-10" with level anchors
- Line 774: Change `maximum: 5` to `maximum: 10`, update description

### Fix G — Add `r.status === 'warning'` to Pass 2 filter
**File:** `supabase/functions/review-challenge-sections/index.ts` line 427

Add `|| r.status === 'warning'` to ensure warning-status sections always get suggestions.

### Fix H — Submission guidelines structured save
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

Add a specific handler for `submission_guidelines` before the SINGLE_CODE_MAP block that always saves as `{ items: [{ name, description }] }` format, parsing from JSON array, `{items:[...]}` wrapper, or newline-delimited text.

---

## Files Modified
1. `supabase/functions/review-challenge-sections/index.ts` — Fixes A, F, G
2. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Fix B
3. `src/pages/cogniblend/CurationReviewPage.tsx` — Fixes D, H

Edge function redeployment required after changes.

