

# Fix: Reward AI Suggested Version Rendering + Non-Monetary Content

## Problem 1 — Distorted rendering

The AI now returns a structured JSON object for `reward_structure`:
```json
{"type":"both","monetary":{"tiers":{"platinum":1000,...}},"nonMonetary":{"items":[...]}}
```

But `AIReviewResultPanel` still treats `reward_structure` as format `table` and tries `parseTableRows()`, which expects an array. The object fails that check → returns `null` → the JSON string falls through to the `rich_text` or `line_items` renderer → each JSON line becomes a separate editable row (the distortion in the screenshot).

## Problem 2 — Non-monetary content missing from AI

The edge function prompt now asks for both monetary and non-monetary, but the current reward data sent to the AI (in `CurationReviewPage.tsx`) may only serialize monetary tier data. The AI has no context about non-monetary items, so it defaults to generic or monetary-only suggestions.

## Fix Plan

### 1. Custom renderer for `reward_structure` in `AIReviewResultPanel.tsx`

Instead of routing through the generic `table` renderer, add a dedicated `reward_structure` rendering branch that:

- Parses the structured `{type, monetary, nonMonetary}` object
- Renders a clean card layout:
  - **Type badge**: "Monetary", "Non-Monetary", or "Both"
  - **Monetary section**: Tier cards showing Platinum/Gold/Silver amounts + currency + justification
  - **Non-monetary section**: Bullet list of suggested items
- Falls back to the old table renderer if the AI returns legacy flat-array format

Changes:
- Add `rewardData` memo that detects and parses the new format (before `tableRows`)
- Add a new rendering branch before the `tableRows` branch in the JSX
- The "Accept" button will pass the parsed structured object (not the raw string)

### 2. Update `curationSectionFormats.ts`

Change `reward_structure` format from `'table'` to `'custom'` so it doesn't trigger generic table parsing.

### 3. Pass current NM items to AI context in `CurationReviewPage.tsx`

Ensure the reward section data sent to the refine edge function includes any existing non-monetary items, so the AI can build on them.

### 4. Update edge function prompt context

In `refine-challenge-section/index.ts`, ensure the `reward_structure` section prompt includes context about the current reward type selection and any existing non-monetary items, so the AI generates appropriate NM suggestions.

## Files

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add `reward_structure` custom renderer branch with tier cards + NM item list |
| `src/lib/cogniblend/curationSectionFormats.ts` | Change `reward_structure` format to `'custom'` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Include NM items in reward section data sent to AI |
| `supabase/functions/refine-challenge-section/index.ts` | Ensure prompt includes existing NM items context |

