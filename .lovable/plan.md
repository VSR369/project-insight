

# Fix: Reward Structure Save & Data Persistence

## Problems

1. **No Save button visible after selecting reward type from empty state** — When a curator picks Monetary/Non-Monetary/Both from the type chooser (in `empty_no_source` state), the section transitions to an editing view. The `isEditing` flag IS true (`sectionState === 'empty_no_source' && !!rewardType`), but the JSX at line 424 renders the footer with Save. However, line 475 adds a condition: `{(rewardType !== 'both' || isModified) && ...}` — for the "both" type, Save only appears if `isModified` is true, which it may not be on initial selection.

2. **All manual edits are lost on navigation** — The auto-save (`pendingSave`) only fires when `applyAIReviewResult` is called (AI acceptance). Manual edits to tier amounts, NM items, reward type selection, and currency changes are NOT auto-saved. They're purely in-memory `useState` — gone on navigation or remount.

## Root Cause

- `pendingSave` is only set to `true` in one place: `handleApplyAIReviewResult` (line 106).
- Manual mutations (`updateTier`, `addNMItem`, `updateNMItem`, `deleteNMItem`, `setCurrency`, `setRewardType`) do not trigger any persistence mechanism.
- The Save button condition at line 475 excludes the "both" type unless `isModified` is true.

## Fix Plan

### 1. Auto-save on all meaningful edits (File: `RewardStructureDisplay.tsx`)

Add `setPendingSave(true)` calls after manual mutations to ensure data persists without requiring an explicit Save click:

- Wrap `updateTier`, `addNMItem`, `updateNMItem`, `deleteNMItem`, `setCurrency` with local callbacks that call the state hook function AND then set `setPendingSave(true)`.
- Guard: only trigger auto-save when a `rewardType` is set (avoid saving empty state).

```typescript
const handleUpdateTier = useCallback((rank: string, patch: Partial<TierState>) => {
  updateTier(rank, patch);
  if (rewardType) setPendingSave(true);
}, [updateTier, rewardType]);

const handleAddNMItem = useCallback((title: string) => {
  addNMItem(title);
  if (rewardType) setPendingSave(true);
}, [addNMItem, rewardType]);

// Same pattern for updateNMItem, deleteNMItem, handleCurrencyChange
```

### 2. Auto-save on reward type selection (File: `RewardStructureDisplay.tsx`)

When the user selects a reward type (from empty state or switches), trigger a save so the type choice persists:

```typescript
const handleTypeSwitch = useCallback((type: RewardType) => {
  setRewardType(type);
  // Auto-save type selection after a brief delay
  setTimeout(() => setPendingSave(true), 200);
}, [setRewardType]);
```

### 3. Fix Save button visibility for "both" type (File: `RewardStructureDisplay.tsx`, line 475)

Remove the `rewardType !== 'both'` guard — Save should always be visible in editing mode:

```tsx
// Before:
{(rewardType !== 'both' || isModified) && (
  <Button ... >Save</Button>
)}

// After:
<Button
  size="sm"
  variant="outline"
  onClick={handleSave}
  disabled={saving || !isValid || !rewardType}
  className="gap-1.5"
>
  ...Save
</Button>
```

### 4. Wire auto-save wrappers into child editors (File: `RewardStructureDisplay.tsx`)

Pass the new wrapped callbacks to `MonetaryRewardEditor` and `NonMonetaryRewardEditor` instead of the raw state hook functions:

- `onUpdateTier={handleUpdateTier}` (instead of `updateTier`)
- `onAddItem={handleAddNMItem}` (instead of `addNMItem`)
- `onUpdateItem={handleUpdateNMItem}` (instead of `updateNMItem`)
- `onDeleteItem={handleDeleteNMItem}` (instead of `deleteNMItem`)
- `onCurrencyChange={handleCurrencyChange}` (instead of `setCurrency`)

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Add auto-save wrapper callbacks, fix Save button visibility, wire wrappers to child editors |

No changes needed to `useRewardStructureState.ts`, `MonetaryRewardEditor.tsx`, or `NonMonetaryRewardEditor.tsx` — their interfaces remain the same.

## Behavior After Fix

- Selecting a reward type → auto-saved to DB
- Editing tier amounts → auto-saved
- Adding/editing/deleting NM items → auto-saved
- Changing currency → auto-saved
- Navigating away and back → data reloads from DB, nothing lost
- Save button always visible during editing (regardless of reward type)
- "Lock Reward Type" remains the explicit finalization gate

