

## Plan: Add Structured JSON Rendering to AiContentRenderer

### What This Adds
The user's snippet introduces auto-detection and rich rendering of structured JSON in AI responses — monetary/reward cards, evaluation/scoring cards, tabular data, and generic key-value displays. Currently `AiContentRenderer` only handles HTML, Markdown, and plain text.

### Approach
Create the structured renderers as a new file, then extend `AiContentRenderer` to detect JSON content and route to the appropriate card.

### Changes

#### 1. New file: `src/components/ui/AiStructuredCards.tsx`
Contains 5 components ported from the user's snippet, styled with Tailwind (no inline styles) to match the existing design system:
- **`StructuredRenderer`** — Router: inspects JSON shape and delegates to the correct card
- **`MonetaryCard`** — Reward tiers (platinum/gold/silver), payment milestones with progress dots, tiered perks
- **`EvaluationCard`** — Overall score with color-coded progress bar, criteria breakdown, recommendation
- **`TableCard`** — Array-of-objects → auto-generated table using existing `Table` UI components
- **`GenericCard`** — Key-value fallback for unknown JSON shapes

#### 2. Modify: `src/components/ui/AiContentRenderer.tsx`
- Add JSON detection before HTML/Markdown checks in `detectFormat()` — returns `'json'` if content parses as `{}` or `[]`
- Add a `json` rendering branch that passes parsed data to `<StructuredRenderer />`
- Existing HTML/Markdown/plain text paths unchanged

### No other files modified — this is additive. All 12 existing `AiContentRenderer` consumers automatically gain JSON rendering.

