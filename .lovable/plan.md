

# Fix: Save Button Visible When No Edits Made

## Problem

After saving reward structure data, when navigating back or switching between Monetary/Non-Monetary/Both tabs, the Save/Cancel/Lock footer is always visible. This is because:

1. **`sectionState` stays as `curator_editing`** — once editing mode is entered (e.g., by selecting a reward type), the footer always shows Save/Cancel regardless of whether anything changed.
2. **`isModified` exists but is never used** to gate the Save button visibility.
3. **After `markSaved()`, state goes to `saved`** which shows read-only + Edit button — but re-entering editing via type switch immediately shows Save again.

## When Should Save Be Visible?

| Scenario | Save Visible? | Reason |
|----------|:---:|--------|
| First time choosing reward type (empty → type selected) | Yes | New data being created |
| Editing tier amounts, NM items, currency | Yes | Data changed |
| After saving, viewing saved state | No | Read-only view with Edit button |
| After saving, clicking Edit but no changes yet | No | Nothing to save |
| Switching tabs (Monetary ↔ Non-Monetary) within Both | No | Tab switch ≠ data change |

## Implementation Plan

### 1. Track dirty state with a `isDirty` flag

Instead of relying on `sectionState === 'curator_editing'` alone, add a `isDirty` computed value that compares current data against last-saved snapshot.

**In `RewardStructureDisplay.tsx`:**
- Track a `savedSnapshot` ref that captures serialized data after each save
- Compute `isDirty` by comparing current serialized data against the snapshot
- On mount/hydration, set snapshot to initial data

### 2. Conditionally show Save button only when dirty

**Change the footer section (lines 403-436):**
- Save button: show only when `isDirty` is true (data has actually changed)
- Cancel button: show only when `isDirty` is true (revert makes sense only if changes exist)
- Lock Reward Type: keep visible when in editing mode (this is an intentional action, not a "save changes" action)

### 3. Ensure type selection from empty state counts as dirty

When going from `empty_no_source` → selecting a type, that IS a change worth saving. The `isDirty` check handles this naturally since the snapshot starts as empty/null.

### 4. After save completes, update snapshot

`markSaved()` already transitions to `saved` state. Additionally, update the snapshot ref so re-entering edit mode starts clean.

## Technical Details

```text
File: src/components/cogniblend/curation/RewardStructureDisplay.tsx

Changes:
1. Add savedSnapshotRef = useRef<string>(JSON.stringify(getSerializedData()))
2. Compute isDirty = JSON.stringify(getSerializedData()) !== savedSnapshotRef.current
3. Update savedSnapshotRef.current in handleSave success path
4. Gate Save + Cancel buttons on isDirty
5. Keep Lock Reward Type independent of isDirty (intentional action)
```

This is a focused fix — no changes to the state machine, hooks, or store sync logic.

