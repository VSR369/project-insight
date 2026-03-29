

# Plan: Consolidated AI Review Enrichment — Remaining Changes

## Already Implemented (No Action Needed)
From the diagnostic audit, these are already in the codebase:
- **Tool schema**: `suggestion`, `cross_section_issues`, `"generated"` status — ✅ done (lines 227-282)
- **wave_action reading**: destructured at line 546, used in prompts at lines 777-784 — ✅ done
- **Content propagation**: `parseSuggestionForSection` + `setSectionData` in useWaveExecutor lines 101-121 — ✅ done
- **analyst_sources injection**: promptTemplate.ts lines 265-269 — ✅ done
- **Fallback CURATION_SECTIONS**: all 26 sections, no duplicates (lines 28-61) — ✅ done
- **Token logging**: lines 300-310 — ✅ done
- **Format-aware suggestion parsing**: `parseSuggestion.ts` utility — ✅ done

## What Still Needs to Change (5 items)

### Change 1: Add multi-tier comment types to tool schema
**File:** `supabase/functions/review-challenge-sections/index.ts` (lines 244-250)

Currently the comment schema uses `severity` with enum `["error","warning","suggestion"]`. Update to add `type` field with the 5-tier enum while keeping `severity` for backward compatibility, and add `guidelines` to the section item.

- Add `type` property: `enum: ["error","warning","suggestion","best_practice","strength"]`
- Add `guidelines` array field to the section-level properties
- In the response parser (line 319-321), fix normalization: only downgrade `pass→warning` if comments contain `error` or `warning` type — not for `strength`/`best_practice` comments

### Change 2: Add output format instructions to system prompt
**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts` (lines 189-192)

Replace the terse status/comments instructions in `buildStructuredBatchPrompt` with detailed multi-tier output instructions explaining the 5 comment types, guidelines, cross_section_issues, and when to include suggestions. Also update the final lines (327-330) to reference the new types.

Same update in `buildConfiguredBatchPrompt` (lines 347-349).

### Change 3: Update UI to render multi-tier comments + guidelines
**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

- Update comment parsing to handle objects with `{text, type}` in addition to plain strings (backward compatible)
- Group and color-code comments: red (error), amber (warning), blue (suggestion), purple (best_practice), green (strength)
- Add guidelines rendering section (indigo)
- Add cross_section_issues rendering section (orange)
- Update `AIReviewResult` interface to include optional `guidelines` and `cross_section_issues`

**File:** `src/components/cogniblend/shared/AIReviewInline.tsx`
- Pass `guidelines` and `cross_section_issues` through from review data to the result panel

### Change 4: Skip auto-refine when inline suggestion available
**File:** `src/components/cogniblend/shared/AIReviewInline.tsx` (lines 278-297)

Add a condition: if the review already has a `suggestion` from the review tool call, set `refinedContent` directly and skip the separate `refine-challenge-section` LLM call. This eliminates the redundant second API call.

### Change 5: Enrich refine-challenge-section with DB config
**File:** `supabase/functions/refine-challenge-section/index.ts`

Load the section's config from `ai_review_section_config` table. If structured data exists (quality_criteria, cross_references), build a richer system prompt including those fields. Cannot import from sibling edge function, so inline the config loading logic. Fall back to existing prompts if no config found.

---

## Implementation Order
1. Change 1 + Change 2 (tool schema + prompt instructions) — edge function, deploy together
2. Change 5 (refine enrichment) — edge function, deploy together with above
3. Change 3 (UI multi-tier rendering) — client
4. Change 4 (skip auto-refine) — client

## Files Modified
- `supabase/functions/review-challenge-sections/index.ts` — Change 1
- `supabase/functions/review-challenge-sections/promptTemplate.ts` — Change 2
- `supabase/functions/refine-challenge-section/index.ts` — Change 5
- `src/components/cogniblend/curation/AIReviewResultPanel.tsx` — Change 3
- `src/components/cogniblend/shared/AIReviewInline.tsx` — Changes 3, 4

## Risk
- All changes are additive with backward compatibility (handle both old `severity`/`comment` and new `type`/`text` formats)
- Auto-refine skip (Change 4) preserves fallback path — if no inline suggestion, the refine call still fires
- UI changes are rendering-only — no store or data flow changes

