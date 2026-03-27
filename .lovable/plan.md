

# Fix Reward Source Attribution — Show AM/CR Origin

## Problem

The intake form saves `reward_structure` as `{ currency, budget_min, budget_max }` with **no `source_role` embedded**. The resolver then fails to recognize this as AM-provided content because:

1. `budget_min`/`budget_max` aren't tier amounts — `hasContent` returns `false`
2. No `source_role` field exists in the saved JSON
3. Result: everything defaults to `sourceRole: 'CURATOR'`, hiding the AM/CR attribution

## Root Cause Chain

```text
SimpleIntakeForm saves → { currency: "USD", budget_min: 25000, budget_max: 75000 }
                         ↑ no source_role, no source_date

resolveRewardSource reads → migrateRawReward finds no tiers/amounts → type: null
                          → hasContent: false → defaults to CURATOR
```

## Fix: 3 Targeted Changes

### 1. Embed `source_role` at Intake Save

**File:** `src/components/cogniblend/SimpleIntakeForm.tsx` (~line 446)

When building the `reward_structure` payload, add `source_role` and `source_date`:

- Marketplace model → `source_role: 'AM'`
- Aggregator model → `source_role: 'CR'`
- Always add `source_date: new Date().toISOString()`

This ensures all new challenges carry proper attribution from creation.

### 2. Recognize `budget_min`/`budget_max` as Valid Content

**File:** `src/services/rewardStructureResolver.ts`

Two changes:

**a) `migrateRawReward`** — Before the monetary tier detection block, check for `budget_min`/`budget_max`. If present and > 0, return a monetary reward with `totalPool` set to the budget range and empty tiers (the curator will create the breakup later):

```
if budget_min > 0 or budget_max > 0:
  type: 'monetary'
  monetary: { currency, totalPool: budget_max || budget_min, tiers: [] }
```

**b) `resolveRewardSource` `hasContent` check** — Add a condition for `totalPool > 0` even when tiers are empty, or check raw `budget_min`/`budget_max` directly.

### 3. Show Budget Range in SourceBanner

**File:** `src/components/cogniblend/curation/rewards/SourceBanner.tsx`

Add optional `budgetRange` prop (`{ min: number; max: number; currency: string }`). When present and `sourceRole !== 'CURATOR'`, display:

> "Populated from Account Manager · Budget: $25,000–$75,000 · Jan 15, 2026"

**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

Pass the budget range from `rewardData.monetary?.totalPool` or from the raw `budget_min`/`budget_max` to `SourceBanner`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add `source_role` + `source_date` to reward_structure save |
| `src/services/rewardStructureResolver.ts` | Recognize `budget_min`/`budget_max` as valid content; preserve them through migration |
| `src/components/cogniblend/curation/rewards/SourceBanner.tsx` | Add optional budget range display |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Pass budget range to SourceBanner |

## Result

- Marketplace challenges show: **"Populated from Account Manager · Budget: $25K–$75K"**
- Aggregator challenges show: **"Populated from Challenge Creator"**
- Curator-created rewards continue to show no banner
- Existing challenges without `source_role` still get correct attribution via the model-based inference fallback (which now works because `budget_min`/`budget_max` are recognized as content)

