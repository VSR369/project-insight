

# Conditional Save Button Based on Reward Type & Save State

## Problem

When "Both" is selected and all data is saved, the Monetary and Non-Monetary sub-screens still show a Save button — redundant since everything was saved together. Conversely, when "Monetary" or "Non-Monetary" is selected individually, explicit Save buttons are needed since data hasn't been saved under "Both".

## Current Behavior

There is a single Save button at the bottom of the editing section (line 480-493 in `RewardStructureDisplay.tsx`). It appears regardless of whether the data was already saved under "Both" or is being configured fresh under a single type.

## Proposed Fix

**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

Add logic to the Save/Cancel/Lock footer (lines 462-495) that checks:

1. **If `rewardType === 'both'` AND data is already saved** (i.e., the monetary and NM data came from a prior "Both" save and hasn't been modified) → hide the Save button. The user only sees Edit to make changes, then Save reappears.

2. **If `rewardType === 'monetary'` or `'non_monetary'` (individual selection)** → always show the Save button when in editing mode, since this data needs its own explicit save.

Concretely, add a computed flag:

```typescript
const needsExplicitSave = useMemo(() => {
  // "Both" that's already been saved and not modified → no save needed
  if (rewardType === 'both' && sectionState === 'saved' && !isModified) return false;
  // Individual types always need save
  return true;
}, [rewardType, sectionState, isModified]);
```

Then wrap the Save button render with `needsExplicitSave`:

```tsx
{needsExplicitSave && (
  <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !isValid}>
    <Save className="h-3.5 w-3.5" /> Save
  </Button>
)}
```

However, once the user edits anything in "Both" mode (tabs become dirty / `isModified` becomes true), the Save button reappears so they can persist changes.

**Edge case:** When transitioning from "Both" (saved) to editing mode via the Edit button, `isModified` will flip true on first change, naturally bringing Save back.

| Scenario | Save Button |
|----------|-------------|
| "Both" selected + saved + no edits | Hidden |
| "Both" selected + saved + user edits | Shown |
| "Both" selected + not yet saved | Shown |
| "Monetary" selected (any state) | Shown |
| "Non-Monetary" selected (any state) | Shown |

## Files

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Add `needsExplicitSave` flag, conditionally render Save button |

