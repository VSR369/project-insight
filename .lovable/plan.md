

# Add AI Comments + Suggested Observation to Complexity Re-Review

## Problem

When "Re-review this section" runs for Complexity, `handleComplexityReReview` calls `assess-complexity` and sets:
- `comments` (param justifications) on the `SectionReview` object
- `aiSuggestedComplexity` (slider ratings) on the module

But it never sets a `suggestion` field, so the `AIReviewInline` panel shows AI comments but **no "AI Suggested Version"** block — unlike every other section.

## What the Suggested Version Should Show

For complexity, the "AI Suggested Observation" should be a human-readable summary of the AI's assessment — e.g.:

> **Suggested Complexity: L4 — High (Score: 6.80)**
> - Technical Novelty: 7/10 — Requires novel approaches...
> - Domain Breadth: 8/10 — Spans multiple disciplines...
> - ... (all params with ratings + justifications)

This gives curators a clear, reviewable AI output alongside the interactive sliders.

## Implementation

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**In `handleComplexityReReview` (line ~1732) and the initial complexity assessment block (line ~1401):**

After getting `ratings` from `assess-complexity`, build a markdown suggestion string:

```text
const score = avgRating.toFixed(2);
const level = deriveLevel(avgRating);
let suggestion = `**Suggested Complexity: ${level} (Score: ${score})**\n\n`;
for (const [key, r] of Object.entries(ratings)) {
  suggestion += `- **${formatParamName(key)}**: ${r.rating}/10 — ${r.justification}\n`;
}
```

Then include `suggestion` in the `SectionReview` object stored in `aiReviews`:

```typescript
const complexityReview: SectionReview = {
  section_key: 'complexity',
  status: avgRating > 0 ? 'warning' : 'pass',
  comments,
  suggestion,   // <-- NEW: enables "AI Suggested Version" in the panel
  addressed: false,
};
```

### File: `src/components/cogniblend/shared/AIReviewInline.tsx`

The `SectionReview` interface needs a `suggestion` field (check if it already exists as an optional field used by the refinement pipeline — if not, add `suggestion?: string`).

### No other changes needed

The `AIReviewInline` component already renders `suggestion` when present. The `AiContentRenderer` already handles markdown. The `ComplexityAssessmentModule` continues to show interactive sliders independently — the suggestion in the review panel is a readable summary, not a duplicate.

## Result

After re-review, curators see:
1. **AI Review comments** — per-parameter justifications (already working)
2. **AI Suggested Observation** — formatted summary with score, level, and all ratings (new)
3. **Interactive sliders** — in the ComplexityAssessmentModule (already working)
