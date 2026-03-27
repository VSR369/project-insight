

# Fix: Monetary Reward Data Lost on Navigation (Round-Trip Bug)

## Root Cause

`migrateRawReward()` in `src/services/rewardStructureResolver.ts` has **no branch for `type: 'both'`**.

When data is saved with `type: 'both'`, it includes both monetary tiers and non-monetary items in the JSONB. On reload, `migrateRawReward` checks:
1. Line 115: `explicitType === 'non_monetary'` → false (it's `'both'`)
2. Line 187: `explicitType === 'monetary'` → false. But `hasTierAmounts` is true → enters monetary branch → returns `type: 'monetary'` with tiers but **drops all NM items**

If the saved data has no flat `platinum/gold/silver` keys but only a `tiers` array, or if amounts are zero, the data falls through entirely to `type: null` → everything lost.

Additionally, even for `type: 'monetary'`, there's a secondary issue: the `pendingSave` auto-save in `RewardStructureDisplay.tsx` fires synchronously after `applyAIReviewResult` sets tier states via `setTierStates`. Due to React's batching, `getSerializedData()` may capture stale state, saving zero amounts.

## Fix Plan

### File 1: `src/services/rewardStructureResolver.ts` — Add `'both'` branch to `migrateRawReward`

Insert a new branch **before** the monetary-only branch (around line 176) that handles `type === 'both'`:

- Parse monetary tiers (same logic as existing monetary branch)
- Parse non-monetary items (same logic as existing NM branch — `items` array, `tiered_perks`, `non_monetary_perks`)
- Return `{ type: 'both', monetary: {...}, nonMonetary: {...} }`

### File 2: `src/components/cogniblend/curation/RewardStructureDisplay.tsx` — Fix auto-save timing

The `pendingSave` effect fires before React processes the `setTierStates` update from `applyAIReviewResult`. Fix by adding a small delay or using a ref to track that the state has actually updated before saving.

Change the `pendingSave` effect to use `setTimeout` with a 100ms delay, ensuring React's state batch has flushed before `getSerializedData()` reads the updated tier states.

## Files

| File | Change |
|------|--------|
| `src/services/rewardStructureResolver.ts` | Add `type === 'both'` branch in `migrateRawReward` (~15 lines) |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Add timing delay on `pendingSave` effect to avoid stale state reads |

