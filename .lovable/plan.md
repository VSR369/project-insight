

# Fix Creator AI Review — Response Shape Mismatch

## Problem

The edge function (`check-challenge-quality`) works correctly and returns rich data. The hook (`useCreatorAIReview`) fails to display it due to 3 bugs:

1. **Never unwraps `data.data`** — `supabase.functions.invoke()` returns `{ success, data: { overall_score, gaps[], ... } }`. The hook reads `data.fieldResults` (top-level, undefined).
2. **Shape mismatch** — Edge function returns dimension scores + `gaps[{ field, severity, message }]`. Hook expects `fieldResults[{ fieldKey, score, comment }]`. These are completely different shapes.
3. **`reviewScope` sent but ignored** — Defined in `PromptParams` interface but never used in prompt construction.

Result: Every field shows 0/100 and "No feedback available" in all modes.

## Fix Strategy

Transform the edge function's actual response shape into the per-field format the drawer expects. No changes to the edge function or drawer — only fix the hook and add `reviewScope` prompt filtering.

---

## Changes

### 1. Rewrite `useCreatorAIReview.ts` — response transformation

**File:** `src/hooks/cogniblend/useCreatorAIReview.ts`

- Unwrap `data.data` correctly from the `supabase.functions.invoke()` response
- Add a field alias map to normalize AI gap field names to canonical `creatorReviewFields` keys (e.g. `problem` → `problem_statement`, `prize`/`top_prize` → `platinum_award`, `tags` → `domain_tags`)
- Map `gaps[]` entries to per-field results: derive score from severity (`critical` → 35, `warning` → 65, `suggestion` → 80), use gap `message` as the comment
- For fields with no gaps, derive a baseline score from the dimension scores (`completeness_score`, `clarity_score`, etc.) — average them, then add a positive comment from `strengths[]` if available
- Update `AIReviewResult` interface to also expose the raw dimension scores and summary for the drawer's overall score card
- Use `overallScore` from `data.data.overall_score`

### 2. Enhance drawer with dimension scores — `CreatorAIReviewDrawer.tsx`

**File:** `src/components/cogniblend/creator/CreatorAIReviewDrawer.tsx`

- Below the overall score card, add a compact sub-scores row showing the 5 dimension scores (completeness, clarity, solver readiness, legal compliance, governance alignment) as small badges
- Display the AI summary text below the score card
- Show `strengths[]` as a collapsed list if present
- Keep existing per-field card rendering unchanged

### 3. Wire `reviewScope` into prompt — `promptBuilder.ts`

**File:** `supabase/functions/check-challenge-quality/promptBuilder.ts`

- Read `params.reviewScope` in `buildSystemPrompt`
- When `reviewScope === 'creator_fields_only'`, add a prompt section instructing the AI to focus gaps analysis on the governance-specific creator fields only (inject the field list from `GOVERNANCE_DESCRIPTIONS`)
- Pass `reviewScope` through from `index.ts` to `params`

### 4. Pass `reviewScope` in edge function — `index.ts`

**File:** `supabase/functions/check-challenge-quality/index.ts`

- Read `body.reviewScope` from request
- Include it in `params` object passed to `buildSystemPrompt` and `buildUserPrompt`

---

## Field Alias Map (in hook)

```text
AI gap field name     →  Canonical key
─────────────────────────────────────
problem               →  problem_statement
problem_statement     →  problem_statement (direct)
tags / domain_tags    →  domain_tags
currency / currency_code → currency_code
prize / top_prize / platinum_award → platinum_award
title                 →  title (direct)
scope                 →  scope (direct)
maturity / maturity_level → maturity_level
criteria / weighted_criteria / evaluation_criteria → weighted_criteria
hook / one_liner      →  hook
context / context_background / org_context → context_background
ip / ip_model         →  ip_model
timeline / expected_timeline → expected_timeline
```

## Score Derivation Logic (in hook)

```text
For each creator field:
  1. Find matching gaps via alias map
  2. If gap exists → score = severity map (critical:35, warning:65, suggestion:80), comment = gap.message
  3. If multiple gaps → use worst severity, concatenate messages
  4. If no gap → score = avg(dimension scores) clamped 70-95, comment = "Looks good" or matched strength
```

## Files Changed

| File | Type |
|------|------|
| `src/hooks/cogniblend/useCreatorAIReview.ts` | Rewrite response transformation |
| `src/components/cogniblend/creator/CreatorAIReviewDrawer.tsx` | Add dimension scores display |
| `supabase/functions/check-challenge-quality/promptBuilder.ts` | Wire reviewScope |
| `supabase/functions/check-challenge-quality/index.ts` | Pass reviewScope to params |

