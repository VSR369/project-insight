

# Plan: Fix 6 Diagnostic Audit Gaps

## Overview
Six gaps identified in the AI Review pipeline. Fixes 1→2→3 are sequential (critical chain). Fixes 4, 5, 6 are independent.

---

## Fix 1: Expand LLM Tool Schema (Edge Function)
**File:** `supabase/functions/review-challenge-sections/index.ts`

**Lines 219-238** — Update the `review_sections` tool schema:
- Add `suggestion` (string) field for generated/improved content
- Add `cross_section_issues` array for consistency checks
- Add `"generated"` to status enum
- Add `field` and `reasoning` to comment items
- Remove `additionalProperties: false` from items to allow new fields
- Add descriptions to all fields

**Lines 260-270** — Update response parser to extract `suggestion` and `cross_section_issues` from each section result and pass them through in the response.

**Lines 28-54** — Fix fallback `CURATION_SECTIONS`: remove duplicate `domain_tags` (line 44), add missing `expected_outcomes`, `success_metrics_kpis`, `data_resources_provided` (Fix 5 combined here).

---

## Fix 2: Differentiate Prompts by `wave_action` (Edge Function)
**File:** `supabase/functions/review-challenge-sections/index.ts`

**Line 484** — Add `wave_action` to destructured request body.

**Lines 713-715** — Replace static user prompt with action-aware logic:
- `'generate'` → instruct LLM to create content, return in `suggestion`, set status `"generated"`
- `'review'` (default) → current behavior plus optional `suggestion` for significant improvements
- Skip action already handled client-side (useWaveExecutor line 67)

---

## Fix 3: Propagate Generated Content Between Waves (Client)
**File:** `src/hooks/useWaveExecutor.ts`

**Lines 87-118** — After `onSectionReviewed` in `reviewSingleSection`, check if the response contains a `suggestion` with content. If so, write it to the Zustand store via `store.getState().setSectionData(sectionKey, suggestion)` so that `buildContextOptions()` at line 223 picks it up for the next wave's context refresh.

No new store actions needed — `setSectionData` already exists (curationFormStore.ts line 84).

---

## Fix 4: Inject `analyst_sources` into Prompts (Edge Function)
**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`

**After line 263** — Add 3 lines:
```typescript
const sources = config.analyst_sources ?? [];
if (sources.length > 0) {
  parts.push(`Analyst sources to cite: ${(sources as string[]).join(', ')}`);
}
```

---

## Fix 5: Fix Fallback CURATION_SECTIONS (Edge Function)
Combined with Fix 1 above — update lines 28-54 in `index.ts` to have all 26 sections, no duplicates.

---

## Fix 6: Add Token Usage Logging (Edge Function)
**File:** `supabase/functions/review-challenge-sections/index.ts`

**After line 254** (where `result` is parsed from AI gateway response) — Add structured `console.log` of `result.usage` with challengeId, section keys, action, model, and token counts. Console-only, no DB table needed initially.

---

## Implementation Order
1. Fix 1 + Fix 5 (tool schema + fallback list) — edge function
2. Fix 2 (wave_action prompt differentiation) — edge function
3. Fix 4 (analyst_sources injection) — edge function promptTemplate
4. Fix 6 (token logging) — edge function
5. Fix 3 (propagate content between waves) — client useWaveExecutor
6. Deploy edge function, verify TypeScript build

## Files Modified
- `supabase/functions/review-challenge-sections/index.ts` — Fixes 1, 2, 5, 6
- `supabase/functions/review-challenge-sections/promptTemplate.ts` — Fix 4
- `src/hooks/useWaveExecutor.ts` — Fix 3

## Risk Assessment
- **Low risk**: All changes are additive — existing `pass`/`warning`/`needs_revision` flow is preserved
- **Fix 3** has the highest risk — must ensure `setSectionData` doesn't trigger unwanted sync/staleness propagation for AI-generated content. Will use the existing `setSectionData` which only updates `data` without touching staleness flags.

