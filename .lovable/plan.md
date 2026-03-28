

# Fix: Reward Source Attribution — 5 Why Analysis & Fix Plan

## 5 Why Root Cause Analysis

**Symptom**: Curator cannot see the reward amount/details provided by Account Manager (Marketplace) or Challenge Creator (Aggregator) in the Reward Structure section.

1. **Why can't the curator see AM/CR-provided reward data?**
   Because the SourceBanner and budget details only show when `sectionState === 'populated_from_source'` or `rewardData.isAutoPopulated === true`. Once the curator saves, both become false.

2. **Why do both become false after curator saves?**
   Because `serializeRewardData()` always sets `source_role: 'CURATOR'`. On next page load, the resolver sees `source_role: CURATOR` and returns `isAutoPopulated: false`.

3. **Why does the serializer overwrite the original source?**
   Because there is no separate "upstream source" concept. The single `source_role` field serves double duty — it indicates both who provided the original data AND who last edited it. When the curator saves, the original AM/CR attribution is destroyed.

4. **Why is there no separate upstream source concept?**
   Because the initial design assumed a linear handoff: AM provides data → curator takes over completely. There was no requirement to preserve the original source attribution after the curator modifies the data.

5. **Why was the original budget range not preserved?**
   Because `useSubmitSolutionRequest` saves `{ budget_min, budget_max }` at intake, but `serializeRewardData()` (curator save) replaces the entire JSONB with `{ type, tiers, platinum, gold, silver, ... }` — the original `budget_min`/`budget_max` fields are lost.

## Root Cause

**The original upstream data (source, budget range) is destroyed when the curator saves.** There is no immutable record of what the AM/CR originally provided.

## Fix Plan — 4 Changes

### 1. Persist immutable `upstream_source` sub-object during intake

**Files:** `useSubmitSolutionRequest.ts`, `SimpleIntakeForm.tsx`, `ConversationalIntakePage.tsx`

When intake saves `reward_structure`, embed an `upstream_source` sub-object that is never overwritten:

```js
reward_structure: {
  currency: "USD",
  budget_min: 25000,
  budget_max: 75000,
  upstream_source: {        // ← NEW immutable sub-object
    role: "AM",             // or "CR"
    date: "2026-03-28T...",
    budget_min: 25000,
    budget_max: 75000,
    currency: "USD"
  }
}
```

### 2. Curator serializer preserves `upstream_source` on save

**File:** `rewardStructureResolver.ts` (`serializeRewardData`)

When serializing, if the original resolved data had `upstreamSource`, carry it forward:

```js
serializeRewardData(data) → {
  source_role: 'CURATOR',
  type: 'monetary',
  tiers: [...],
  upstream_source: data.upstreamSource  // ← preserved across saves
}
```

### 3. Resolver surfaces upstream source regardless of current `source_role`

**File:** `rewardStructureResolver.ts` (`resolveRewardSource`)

Add `upstreamSource` to `RewardData` interface. Even when `source_role` is `CURATOR`, if `raw.upstream_source` exists, populate it:

```ts
interface RewardData {
  // ... existing fields
  upstreamSource?: {
    role: SourceRole;
    date?: string;
    budgetMin?: number;
    budgetMax?: number;
    currency?: string;
  };
}
```

Remove the model-based inference block entirely — per user preference, never infer source. Only use explicit metadata.

### 4. Show SourceBanner in all section states when upstream source exists

**File:** `RewardStructureDisplay.tsx`

Currently the banner only shows in `populated_from_source` state or when `isAutoPopulated`. Change to show in ALL states (saved, curator_editing, reviewed, populated_from_source) whenever `rewardData.upstreamSource` is present:

```tsx
// Before each state's render block, add:
{rewardData.upstreamSource && (
  <SourceBanner
    sourceRole={rewardData.upstreamSource.role}
    sourceDate={rewardData.upstreamSource.date}
    isModified={sectionState !== 'populated_from_source'}
    onEdit={startEditing}
    budgetRange={{
      min: rewardData.upstreamSource.budgetMin ?? 0,
      max: rewardData.upstreamSource.budgetMax ?? 0,
      currency: rewardData.upstreamSource.currency ?? 'USD'
    }}
  />
)}
```

## Files Changed

| File | Change |
|------|--------|
| `src/services/rewardStructureResolver.ts` | Add `upstreamSource` to RewardData; extract from `upstream_source` sub-object; preserve in serializer; remove inference block |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Add `upstream_source` sub-object to reward_structure on create and draft |
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add `upstream_source` to reward_structure update payload |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Add `upstream_source` to reward_structure on edit save |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Show SourceBanner in all states when `upstreamSource` exists |
| `src/hooks/useRewardStructureState.ts` | Pass through `upstreamSource` from resolved data |

## Result

- **AM/CR budget always visible**: Even after curator edits and saves, banner shows "Populated from Account Manager · Budget: $25K–$75K"
- **Curator can freely edit**: Tier breakup, amounts, type — all editable. Banner persists as context.
- **No inference**: Only explicit metadata drives attribution. Legacy challenges without metadata show no banner.

