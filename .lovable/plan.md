

# Fix: Radio Button Switching Not Working

## Root Causes

**Problem 1 — `onSwitch` is a no-op in most states:**
In `RewardStructureDisplay.tsx`, the `RewardTypeToggle` receives `onSwitch={() => {}}` in `populated_from_source` (line 419), `saved` (line 516), and `reviewed` (line 537) states. Clicking any radio button calls this empty function — nothing happens.

**Problem 2 — `hasExistingData` is too broad:**
At line 302-306, `hasExistingData` checks `nmItems.length > 0`. When the user selects any type that involves non-monetary, default NM items are auto-populated (5 items). So `hasExistingData` is always `true` after the first selection, and every subsequent radio change triggers the confirmation dialog — even though there's no real user data to lose.

## Fix

### File: `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

**Fix 1 — Make radio buttons functional in all non-submitted states:**

In `populated_from_source`, `saved`, and `reviewed` states, replace `onSwitch={() => {}}` with a handler that transitions to editing mode and applies the type switch:

```typescript
// New handler for switching type from read-only states
const handleTypeSwitchFromReadOnly = useCallback((type: RewardType) => {
  startEditing();
  setRewardType(type);
}, [startEditing, setRewardType]);
```

Update all three read-only state blocks:
- Line 419: `onSwitch={handleTypeSwitchFromReadOnly}` + remove `disabled` (keep `isLocked` check)
- Line 516: `onSwitch={handleTypeSwitchFromReadOnly}` (already has `disabled={isSubmitted}`)
- Line 537: `onSwitch={handleTypeSwitchFromReadOnly}` (already has `disabled={isSubmitted}`)

**Fix 2 — Tighten `hasExistingData` check (line 302-306):**

Only count data as "existing" when there's real user/AM/AI-entered content, not just auto-populated defaults with no modifications:

```typescript
const hasExistingData = useMemo(() => {
  const hasMonetary = Object.values(tierStates).some((t) => t.enabled && t.amount > 0);
  const hasNM = nmItems.some((item) => !item.isDefault || item.src.src !== 'curator');
  return hasMonetary || hasNM;
}, [tierStates, nmItems]);
```

This way, default curator NM items won't trigger the confirmation dialog. Only items from AM/AI or custom-added items count.

## Result
- Radio buttons will be clickable in all states (unless submitted/locked)
- Switching types from read-only states will auto-transition to editing mode
- Confirmation dialog only appears when there's real data at risk

