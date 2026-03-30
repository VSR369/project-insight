

# Fix 7 Pass 2 Gaps — Elevate to Principal Consultant Level

## Summary

Fix 7 gaps in the Pass 2 rewrite pipeline across two files. All changes are in edge function code only — no migrations, no UI changes.

## Files Modified

| File | Gaps Fixed |
|------|-----------|
| `supabase/functions/review-challenge-sections/index.ts` | 1, 2, 3, 7 |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | 4, 5, 6 |

## Changes

### Gap 1: Replace raw JSON dump with compact summary
**File:** `index.ts`, lines 722-724

Replace `FULL CHALLENGE DATA:\n${JSON.stringify(challengeData, null, 2)}` with a compact reference block showing only Title, Problem (300 chars), Scope (300 chars), Maturity, Complexity, Domain Tags, Solution Type, Deliverable Count, IP Model, and Currency. Saves ~5,000-10,000 tokens per Pass 2 call.

### Gap 2: Feed cross-section issues into Pass 2
**File:** `index.ts`, inside `sectionPrompts` builder (~line 616-707)

After the `bestPractices` block (line 639-641), extract `cross_section_issues` from `pass1Results` that reference the current section key. Build a `crossIssueBlock` string and inject it into the per-section template after ISSUES TO ADDRESS.

### Gap 3: Preserve strengths in Pass 2
**File:** `index.ts`, inside `sectionPrompts` builder

Filter `r.comments` for `type === 'strength'` entries. Build a `strengthBlock` string and inject before ISSUES TO ADDRESS so the LLM knows what to keep.

### Gap 4: Add self-validation instruction
**File:** `promptTemplate.ts`, in `buildPass2SystemPrompt` (after REWRITE RULES, ~line 1273)

Append an 8-point self-validation checklist (address every issue, preserve strengths, resolve cross-section issues, seeker voice, solver comprehension, format match, specificity, AI-ONLY embedding).

### Gap 5: Section-specific quality bar exemplars
**File:** `promptTemplate.ts`

Add a `SECTION_QUALITY_EXEMPLARS` constant with fallback examples for `scope`, `evaluation_criteria`, `success_metrics_kpis`, `hook`, `solver_expertise`, and `reward_structure`. In the per-section enrichment loop (line 1346-1348), add an `else if` branch using these when `config.example_good` is null.

### Gap 6: Quantification mandate
**File:** `promptTemplate.ts`, in `buildPass2SystemPrompt` (after REWRITE RULES)

Append a QUANTIFICATION MANDATE block with 3 wrong/right pairs and a fallback instruction for benchmarked ranges.

### Gap 7: Generation strategy for empty sections
**File:** `index.ts`, line 682

Replace the generic `'ACTION: Generate new content from scratch based on challenge context.'` with a 5-step generation strategy: derive from upstream, apply domain expertise for the maturity level, reference attached materials, quantify, and follow exact format.

## Implementation Order

1. Gap 1 (index.ts — replace JSON dump)
2. Gaps 2 + 3 (index.ts — cross-section issues + strengths in sectionPrompts builder)
3. Gap 7 (index.ts — generation strategy)
4. Gaps 4 + 6 (promptTemplate.ts — self-validation + quantification mandate)
5. Gap 5 (promptTemplate.ts — quality exemplars)
6. Deploy edge function

## Technical Notes

- All changes are within the `review-challenge-sections` edge function
- No database migrations required
- No frontend changes required
- Token savings from Gap 1 offset any token increase from Gaps 2-6
- Net effect: better quality output at similar or lower token cost

