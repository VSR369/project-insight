

# Fix: Reward AI Persistence Loss + "Re-review" Label Consistency

## Root Cause Analysis

### Bug 1 — AI accepted values lost on navigation

In `CurationReviewPage.tsx` line 1559, after accepting an AI suggestion for `reward_structure`, the code saves the **raw AI object** directly to the DB:

```js
saveSectionMutation.mutate({ field: dbField, value: valueToSave });
// valueToSave = { type: "both", monetary: { tiers: { platinum: 5000, gold: 3000 } }, nonMonetary: { items: ["Mentorship", ...] } }
```

This raw format is **incompatible** with `migrateRawReward()` which expects:
- `tiers` as an **array** of `{ rank, amount, count }` objects (not a key-value map)
- `items` as an array of **objects** with `{ title, description, type }` (not plain strings)

Result on reload: monetary tiers can't be parsed → lost. NM items are strings → skipped → empty list → defaults populate.

### Bug 2 — "Review with AI" instead of "Re-review"

`MonetaryRewardEditor` and `NonMonetaryRewardEditor` have a hardcoded "Review with AI" label. Other sections use `AIReviewInline` which dynamically shows "Re-review this section" after initial review. The reward editors don't track review state.

## Fix Plan

### File 1: `src/pages/cogniblend/CurationReviewPage.tsx` (line ~1556-1559)

After calling `applyAIReviewResult`, instead of saving the raw AI object, call the reward component's `getSerializedData()` after a short delay (state update needs to settle), OR better: **convert the AI object to the proper serialized format before saving**.

Transform the AI object inline:
- Convert `monetary.tiers` from `{ platinum: N }` map → proper `tiers` array `[{ rank: "platinum", amount: N, count: 1 }]`
- Convert `nonMonetary.items` from `["string"]` → `[{ id, type: "recognition", title: "string", description: "" }]`
- Add flat keys (`platinum`, `gold`, `silver`) + `currency` + `source_role: "CURATOR"` for full round-trip compatibility

This ensures `migrateRawReward()` can reconstruct the data on next page load.

### File 2: `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx`

Add a `hasBeenReviewed` prop. When true, change button text from "Review with AI" to "Re-review with AI" and swap icon from `Sparkles` to `RefreshCw`.

### File 3: `src/components/cogniblend/curation/rewards/NonMonetaryRewardEditor.tsx`

Same change — add `hasBeenReviewed` prop for label consistency.

### File 4: `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

Pass `hasBeenReviewed` (derived from `sectionState === 'reviewed'` or presence of AI review results) down to both editors.

## Summary

| File | Change |
|------|--------|
| `CurationReviewPage.tsx` | Transform AI reward object to proper serialized format before DB save |
| `MonetaryRewardEditor.tsx` | Add `hasBeenReviewed` prop → "Re-review with AI" label |
| `NonMonetaryRewardEditor.tsx` | Add `hasBeenReviewed` prop → "Re-review with AI" label |
| `RewardStructureDisplay.tsx` | Pass `hasBeenReviewed` to both editors |

