

# Final 3 Bugs Fix Plan

## Bug 1 (HIGH): Reward Structure — Tiers Array vs Record Mismatch

**Problem:** The prompt tells the LLM to return `tiers` as an array of objects, but `applyAIReviewResult` expects a `Record<string, number>`. When the LLM returns an array, `Object.entries()` yields index keys ("0", "1") which don't match valid tier names.

**Fix (2 changes):**

1. **`promptTemplate.ts` line 104** — Change the reward_structure format instruction to tell the LLM to return tiers as an object `{"platinum": 75000, "gold": 25000, "silver": 10000}` instead of an array.

2. **`CurationReviewPage.tsx` ~line 2052** — Add defensive array-to-record conversion for `monetary.tiers` before calling `applyAIReviewResult`. This handles cases where the LLM ignores the instruction and returns an array anyway.

## Bug 2 (MEDIUM): Submission Guidelines — Column Collision with `description`

**Problem:** `submission_guidelines` uses `dbField: "description"`, which is the challenge's main description field. This causes data collision and garbled display when the description contains plain text.

**Fix (migration + code changes):**

1. **DB Migration** — `ALTER TABLE challenges ADD COLUMN IF NOT EXISTS submission_guidelines JSONB`

2. **`CurationReviewPage.tsx`:**
   - Line 299: Change `dbField: "description"` → `dbField: "submission_guidelines"`
   - Line 300-304: Update `isFilled` to read from `ch.submission_guidelines`
   - Lines 2874-2877: Update render case to read from `challenge.submission_guidelines`
   - Lines 2887, 2895: Update save mutations from `field: "description"` → `field: "submission_guidelines"`
   - Update the dedicated Accept handler (Fix H) to use `submission_guidelines` field

3. **Edge function `index.ts`** — Add `submission_guidelines` to the SELECT query

## Bug 3 (LOW): Extended Brief Subsections Show Empty in Collapsed View

**Problem:** 6 extended brief subsections + hook + complexity have `render: () => null`, showing empty bodies in collapsed cards.

**Fix:** Add inline preview renderers for each subsection that reads from `ch.extended_brief` and shows a brief summary (badge chips for line items, count for tables, truncated text for rich text). Complexity and hook already have dedicated modules/renderers — only the 6 extended brief subsections need render functions.

## Files Modified

1. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Bug 1 (format instruction)
2. `supabase/functions/review-challenge-sections/index.ts` — Bug 2 (add submission_guidelines to SELECT)
3. `src/pages/cogniblend/CurationReviewPage.tsx` — Bugs 1, 2, 3 (defensive conversion, dbField change, render functions)
4. **DB Migration** — Bug 2 (add submission_guidelines column)

Edge function redeployment required after changes.

