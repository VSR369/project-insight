

# Fix: Non-Monetary Items Lost After AI Acceptance

## Root Cause (Two Bugs)

### Bug 1: Stale closure in auto-save
When `applyAIReviewResult` runs, it sets NM items via `setNMItems(aiItems)` and then `setPendingSave(true)` in the same synchronous callback. The `pendingSave` effect captures the **old** `getSerializedData` function reference, which closes over the **previous** `nmItems`. The 150ms `setTimeout` delays execution but still uses the stale function — the closure was captured when the effect ran, not when the timeout fires.

### Bug 2: AMPayload effect overwrites loaded NM items
On page reload, the init sequence is:
1. `useRewardStructureState` loads NM items from DB via `legacyToNMItems` → correct AI items
2. `rewardType` initializes to `'both'` from DB → correct
3. AMPayload `useEffect` fires → calls `setRewardType('both')`
4. Inside `setRewardType`, it checks `nmItems.length === 0` — but `nmItems` in the closure is from the **initial render** when `setRewardType` was created. Due to `useCallback` deps (`nmItems.length`), if the callback was created when items existed, this should be fine. **However**, if AMPayload re-triggers or the mount order differs, the defaults overwrite.

The primary culprit is Bug 1 — the auto-save persists stale (empty or default) NM data, so on next reload the DB has no AI items.

## Fix

### File: `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

**Replace the pendingSave effect** to use a ref for `getSerializedData` instead of the closure:

```typescript
// Add a ref that always holds the latest getSerializedData
const getSerializedDataRef = useRef(getSerializedData);
useEffect(() => {
  getSerializedDataRef.current = getSerializedData;
}, [getSerializedData]);

// Auto-save effect uses the ref
useEffect(() => {
  if (!pendingSave || !rewardType) return;
  setPendingSave(false);
  const timer = setTimeout(async () => {
    try {
      const serialized = getSerializedDataRef.current(); // Always latest
      // ... rest of save logic
    }
  }, 150);
  return () => clearTimeout(timer);
}, [pendingSave, rewardType, challengeId, queryClient, markSaved]);
```

This ensures the timeout always calls the latest version of `getSerializedData`, which closes over the updated `nmItems` after React's state batch has flushed.

### File: `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

**Guard the AMPayload effect** to skip when data is already loaded from DB:

Add a check at the top of the AMPayload `useEffect`:
```typescript
useEffect(() => {
  if (!amPayload) return;
  // Skip if data was already loaded from DB (not empty/fresh)
  if (sectionState === 'saved' || sectionState === 'populated_from_source') return;
  // ... rest of AM payload logic
}, []);
```

This prevents AM defaults from overwriting curator-saved or AI-accepted data on reload.

## Files

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Use ref for `getSerializedData` in auto-save; guard AMPayload effect against already-loaded data |

