

# Overhaul Complexity AI Review: Merge into Global Flow with Parameter Table

## Problem

The current complexity AI review is broken in three ways:
1. **Junk comments** — generic "warning" text that doesn't guide curators on how to rate parameters
2. **Junk suggested selection** — markdown prose from `buildComplexitySuggestionMd` instead of structured justifications
3. **Score mismatch** — dedicated `assess-complexity` edge function produces results independently from the global `review-challenge-sections` flow, causing drift between what's shown and what's calculated

## Solution: Merge complexity into the global review engine

Remove the dedicated `assess-complexity` path entirely. Make `review-challenge-sections` handle complexity like every other section — but with a custom prompt that reads ALL other section content and produces structured per-parameter output.

```text
Current flow:
  triage → pass/warning → review-challenge-sections (26 sections)
                        → assess-complexity (separate call)
                        → buildComplexitySuggestionMd (prose)

New flow:
  triage → pass/warning → review-challenge-sections (27 sections, complexity included)
                        → complexity gets structured tool_call output
                        → parameter table rendered in UI
```

## Technical Changes

### 1. Edge Function: `review-challenge-sections`

**Add complexity-specific handling:**
- When `section_key === 'complexity'`, fetch `master_complexity_params` (param_key, name, weight, description)
- Build a specialized prompt that:
  - Includes ALL other section content as context (problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, extended_brief, etc.)
  - Instructs AI to rate each parameter independently (1-10) with justification citing specific evidence from other sections
  - Uses tool calling with a structured schema: `{ ratings: { [param_key]: { rating, justification, evidence_sections } }, comments: string[] }`
- Comments should be **guidelines** for curators: "Consider the technical novelty — the problem statement describes applying known ML techniques to a standard classification task, suggesting a rating of 3-4."
- Suggested selection is the `ratings` object (not markdown)

**Response shape for complexity:**
```json
{
  "sections": [{
    "section_key": "complexity",
    "status": "warning",
    "comments": [
      "Technical novelty appears moderate (3-4): the problem describes applying established techniques to a novel dataset.",
      "Timeline urgency is high (7-8): 6-week deadline for a multi-deliverable challenge."
    ],
    "suggested_complexity": {
      "technical_novelty": { "rating": 4, "justification": "Standard ML techniques applied to novel domain", "evidence": ["problem_statement", "deliverables"] },
      "solution_maturity": { "rating": 6, "justification": "POC-level prototype required", "evidence": ["maturity_level", "deliverables"] },
      ...
    }
  }]
}
```

### 2. Remove dedicated complexity infrastructure

**Files to clean up:**
- `supabase/functions/assess-complexity/index.ts` — delete entire function (no longer needed)
- `src/lib/sectionRoutes.ts` — remove `complexity: 'assess-complexity'` from `SECTION_REVIEW_ROUTES`
- `src/lib/cogniblend/complexityScoring.ts` — keep `computeWeightedComplexityScore`, `deriveComplexityLevel`, etc. Remove `buildComplexitySuggestionMd` (no longer needed — UI renders table directly)

### 3. `CurationReviewPage.tsx` — Remove dedicated complexity logic

- Remove `handleComplexityReReview` callback
- Remove `complexityPromise` parallel call in `handleAIReview`
- Remove `complexitySuggestionMd` state (no longer needed)
- Remove `aiSuggestedComplexity` state — instead, extract ratings from the standard review response
- Parse complexity review from `review-challenge-sections` response like any other section
- Extract `suggested_complexity` from review data and pass to `ComplexityAssessmentModule` as `aiSuggestedRatings`
- Pass `onReReview={undefined}` for complexity (uses standard re-review path now)
- Pass `initialRefinedContent={undefined}` for complexity (table rendered by panel)

### 4. `AIReviewInline.tsx` — Complexity uses standard path

- No special `onReReview` handler needed for complexity anymore
- Standard re-review calls `review-challenge-sections` with `section_key: 'complexity'`
- The response includes `suggested_complexity` which gets extracted and passed to the module

### 5. `AIReviewResultPanel.tsx` — Render parameter table for complexity

Add complexity-specific rendering when `sectionKey === 'complexity'` and `result.suggested_version` contains structured ratings:
- Parse the `suggested_complexity` JSON
- Render a table with columns: **Parameter**, **Rating**, **Justification**, **Evidence Sections**
- Each row shows the parameter name, a colored rating badge (1-10), the AI's reasoning, and which sections informed the rating
- Accept button applies all ratings to `ComplexityAssessmentModule` draft state
- Individual ratings remain overridable via the pencil icon in the module

### 6. Scoring remains centralized

`complexityScoring.ts` continues to be the single source of truth for:
- `computeWeightedComplexityScore` — weighted average from ratings
- `deriveComplexityLevel` / `deriveComplexityLabel` — L1-L5 mapping
- `LEVEL_COLORS`, `LEVEL_CARD_COLORS` — display constants

The score shown in the AI Review tab of the module will derive from the AI-suggested ratings (consistent with what the table shows).

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/review-challenge-sections/index.ts` | Add complexity-specific prompt + tool schema when `section_key === 'complexity'` |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Add complexity parameter format instructions |
| `supabase/functions/assess-complexity/index.ts` | Delete |
| `src/lib/sectionRoutes.ts` | Remove complexity route |
| `src/lib/cogniblend/complexityScoring.ts` | Remove `buildComplexitySuggestionMd` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove dedicated complexity logic, extract ratings from standard review |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Remove complexity-specific `onReReview` wiring |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add parameter table renderer for complexity |

## What curators will see

**AI Comments (guideline-style):**
> "Technical novelty appears moderate (3-4): the problem statement describes applying established warehouse optimization techniques. Consider rating higher if the cross-domain integration with IoT sensors adds novelty."

**AI Suggested Selection (parameter table):**

| Parameter | Rating | Justification | Evidence |
|-----------|--------|--------------|----------|
| Technical Novelty | 4/10 | Standard techniques applied to novel dataset | problem_statement, deliverables |
| Solution Maturity | 6/10 | POC prototype required with working demo | maturity_level, deliverables |
| Domain Breadth | 7/10 | Crosses supply chain, IoT, and ML domains | scope, domain_tags |
| ... | ... | ... | ... |

**Weighted Score: 5.85 — L3 (Medium)**

