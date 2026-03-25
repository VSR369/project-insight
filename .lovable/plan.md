

# Fix: Confirmation Alert When Switching Reward Type With Existing Data

## Problem Analysis
The confirmation dialog code already exists in `RewardTypeToggle.tsx` and the `hasExistingData` logic in the orchestrator looks correct. There are two issues:

1. **The `hasExistingData` check only looks at current type's data** — It checks `monetary.tiers.length > 0 || nonMonetary.items.length > 0`. Because `setRewardType` enforces mutual exclusivity (clears the other type), only the *active* type has data. This should work fine for the toggle scenario. The check is correct.

2. **After confirming the switch, the old data is cleared locally but the DB still has the old type's data.** The `setRewardType` hook clears the opposite type in state, but there's no auto-save triggered — so if the user navigates away before explicitly saving, the DB retains the old type. On reload, the old data comes back.

3. **The dialog message could be clearer** — The current message says "will clear existing reward data" but doesn't emphasize that the *previous* type's data will be permanently lost.

## Changes

### 1. `src/components/cogniblend/curation/rewards/RewardTypeToggle.tsx`
Update the confirmation dialog text to be more explicit about data loss:
- Title: "Change reward type?"
- Description: "You currently have **{currentLabel}** reward data configured. Switching to **{targetLabel}** will permanently delete all {currentLabel} data. This action cannot be undone."
- Confirm button: "Yes, switch to {targetLabel}"

### 2. `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
Add auto-save after type switch when data existed. Create a `handleTypeSwitch` wrapper around `setRewardType`:

```typescript
const handleTypeSwitch = useCallback((type: RewardType) => {
  const hadData = hasExistingData;
  setRewardType(type);
  if (hadData) {
    setPendingSave(true); // Auto-save the cleared state to DB
  }
}, [setRewardType, hasExistingData]);
```

Pass `handleTypeSwitch` to `RewardTypeToggle` instead of `setRewardType` directly.

### 3. `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
Also check `hasExistingData` more broadly — include `totalPool` for monetary (user may have entered amount but no tiers yet):

```typescript
const hasExistingData =
  (rewardData.monetary && (rewardData.monetary.tiers.length > 0 || (rewardData.monetary.totalPool ?? 0) > 0)) ||
  (rewardData.nonMonetary && rewardData.nonMonetary.items.length > 0);
```

## Result
- Switching types with existing data shows a clear, descriptive confirmation alert
- Confirming the switch auto-saves the cleared state to DB (preventing stale data on reload)
- The `hasExistingData` check covers both tiers and totalPool for monetary rewards

