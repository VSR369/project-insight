

# Fix: AI Reward Review — Include Non-Monetary Suggestions

## Current State

**"Review Sections by AI" does cover `reward_structure`** — it's listed in the triage function's 26-section curation list. So triage (Phase 1) runs on it, and Phase 2 refinement triggers for warning/needs_revision results.

**No sections are left out** — the triage covers: problem_statement, scope, deliverables, expected_outcomes, evaluation_criteria, **reward_structure**, phase_schedule, submission_guidelines, eligibility, complexity, ip_model, legal_docs, escrow_funding, maturity_level, hook, submission_deadline, challenge_visibility, effort_level, domain_tags, visibility, solver_expertise, context_and_background, root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest (26 sections).

**The real bug**: The refine edge function's `FORMAT_INSTRUCTIONS` for `reward_structure` (line 298) instructs the AI to return **only** a flat table of monetary prize tiers:

```
Return ONLY a valid JSON array of row objects with keys:
"prize_tier", "amount", "currency", "payment_trigger"
```

This produces the constant "1st Place / 2nd Place / 3rd Place" table you see in the screenshot. It has **no instruction** to include non-monetary rewards or a recommended reward type.

Meanwhile, `applyAIReviewResult` in `useRewardStructureState.ts` already supports parsing `{ monetary: { tiers }, nonMonetary: { items }, type }` — but the edge function never produces that structure.

## Fix — Two Files

### 1. Edge Function: `supabase/functions/refine-challenge-section/index.ts` (line 298)

Replace the `reward_structure` format instruction to demand a structured JSON object containing both monetary and non-monetary:

```
CRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON object with this structure:
{
  "type": "monetary" | "non_monetary" | "both",
  "monetary": {
    "tiers": { "platinum": <amount>, "gold": <amount>, "silver": <amount> },
    "currency": "<ISO code>",
    "justification": "<1-2 sentences explaining the tier split>"
  },
  "nonMonetary": {
    "items": ["<unique/innovative item 1>", "<unique/innovative item 2>", ...]
  }
}
Rules:
- Suggest 1-3 tiers based on challenge budget and complexity
- Tier amounts MUST sum to the total reward pool
- Non-monetary items MUST be innovative and domain-relevant (NOT generic certificates)
- If challenge context suggests non-monetary only, set type to "non_monetary" and omit monetary
- If both are appropriate, set type to "both"
```

### 2. Frontend: `src/hooks/useRewardStructureState.ts` — `applyAIReviewResult`

Already handles the `{ monetary, nonMonetary, type }` shape. Minor update needed: if the AI returns the old flat array format (backward compat), detect it and wrap into the expected structure.

### 3. Frontend: `src/pages/cogniblend/CurationReviewPage.tsx` — `handleAcceptRefinement`

The reward_structure branch at line 1544 calls `rewardStructureRef.current?.applyAIReviewResult(valueToSave)`. If the AI returns the new object format, it flows through correctly. Add a guard: if `valueToSave` is an array (old format), wrap it as `{ monetary: { tiers: ... }, type: 'monetary' }`.

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/refine-challenge-section/index.ts` | Update FORMAT_INSTRUCTIONS for `reward_structure` to demand structured JSON with both monetary tiers + NM items |
| `src/hooks/useRewardStructureState.ts` | Add backward-compat guard for old flat-array AI responses |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add array-to-object wrapping guard for old-format AI reward responses |

