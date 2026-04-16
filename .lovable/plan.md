

# Prompt 13 — Curator Learning Loop Hardening & Self-Critique

## Summary
Close the highest-priority gaps in the curator learning system: add hard-constraint injection, activation thresholds, correction classification, token budgeting, self-critique block, and delete the legacy prompt builder. All changes are additive or refinement-only — no structural changes to existing navigation, wave execution, routing, or curator UX.

## ALERT: No Breaking Changes
All changes below are backward-compatible:
- No route changes, no navigation changes, no new pages
- No changes to wave execution flow or diagnostics state machine
- No curator UX workflow changes
- `buildConfiguredBatchPrompt` deletion is safe — `buildSmartBatchPrompt` already routes 100% to `buildStructuredBatchPrompt` (line 396). The legacy function is dead code.

---

## Changes

### 1. Add `correction_class` column to `section_example_library`
**Migration**: Add `correction_class TEXT` column (nullable) to `section_example_library`. Values: `factual`, `style`, `structural`, `terminology`, `quantification`, `framework`, `omission`. No CHECK constraint (per project rules — would use lookup table for evolving sets, but nullable TEXT is fine here since it's metadata).

Also add `activation_confidence NUMERIC DEFAULT 0.5` and `distinct_curator_count INTEGER DEFAULT 1` columns to track activation readiness.

### 2. Update `extract-correction-patterns` edge function
**File**: `supabase/functions/extract-correction-patterns/index.ts`

- Add `correction_class` to the AI extraction prompt (ask AI to classify the correction)
- Store `correction_class` on the `section_example_library` insert
- Before inserting, query existing active examples for same `section_key` + similar `learning_rule` text (substring match). If found, increment `activation_confidence` by 0.15 and `distinct_curator_count` if different curator, instead of creating a duplicate
- Set new examples to `is_active = false` by default (dormant until activation threshold met)
- Auto-activate when `activation_confidence >= 0.7 AND distinct_curator_count >= 2`

### 3. Add `CURATOR-LEARNED CORRECTIONS` hard-constraint block to prompts
**File**: `supabase/functions/review-challenge-sections/fetchExamples.ts`

Add a new function `fetchHardCorrections(adminClient, sectionKeys)` that:
- Queries `section_example_library` WHERE `is_active = true AND learning_rule IS NOT NULL AND activation_confidence >= 0.7`
- Returns formatted block: `## CURATOR-LEARNED CORRECTIONS (hard rules — these have been corrected before, DO NOT repeat):\n` + numbered rules

Add `formatCorrectionsForPrompt(corrections)` to produce the prompt block.

**File**: `supabase/functions/review-challenge-sections/index.ts`

- Call `fetchHardCorrections` alongside `fetchExamplesForBatch`
- Inject the corrections block into the system prompt BEFORE the dynamic examples block (corrections = hard rules, examples = soft guidance)
- Inject into Pass 2 prompt as well via `buildPass2SystemPrompt`

### 4. Token budgeting for corpus injection
**File**: `supabase/functions/review-challenge-sections/fetchExamples.ts`

Add a `TOKEN_BUDGET_CHARS = 24000` constant (approx 6K tokens, ~30% of a 20K token budget for corpus). In both `formatExamplesForPrompt` and `formatCorrectionsForPrompt`:
- Count accumulated characters
- Drop lowest-confidence entries first when over budget
- Log when truncation occurs

### 5. Append self-critique block to system prompts
**File**: `supabase/functions/review-challenge-sections/promptBuilders.ts`

At the end of `buildStructuredBatchPrompt` (before the final return), append:

```
PRINCIPAL-LEVEL SELF-CRITIQUE — before returning each comment, re-read it. If a junior analyst could have written it (no named benchmark, no named framework, no specific number, no cross-reference), rewrite it. Generic observations are disqualifying. Claims tagged with low confidence must be genuinely unavoidable — prefer retrieval from industry packs, geo packs, and context digest.
```

### 6. Delete `buildConfiguredBatchPrompt`
**File**: `supabase/functions/review-challenge-sections/promptBuilders.ts`
- Remove `buildConfiguredBatchPrompt` function (lines 302-384) — confirmed dead code, `buildSmartBatchPrompt` already bypasses it entirely

**File**: `supabase/functions/review-challenge-sections/promptTemplate.ts`
- Remove `buildConfiguredBatchPrompt` from exports

### 7. Redeploy edge functions
- Deploy `review-challenge-sections` and `extract-correction-patterns`

---

## Files Modified

| File | Change Type |
|---|---|
| `supabase/functions/extract-correction-patterns/index.ts` | Edit — add classification, dedup, activation logic |
| `supabase/functions/review-challenge-sections/fetchExamples.ts` | Edit — add hard corrections fetch + token budgeting |
| `supabase/functions/review-challenge-sections/index.ts` | Edit — inject corrections block into prompts |
| `supabase/functions/review-challenge-sections/promptBuilders.ts` | Edit — add self-critique, delete legacy function |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Edit — remove legacy export |
| `supabase/functions/review-challenge-sections/pass2Prompt.ts` | Edit — accept + inject corrections block |
| Migration SQL | New — add columns to `section_example_library` |

## What This Does NOT Change
- No UI changes (no new pages, no component edits)
- No route changes
- No wave execution flow changes
- No diagnostics panel changes
- No curator workflow changes
- Existing `section_example_library` data remains valid (new columns are nullable/defaulted)

