

# Remove "Submit & Lock" — Consolidate into "Lock Reward Type"

## Rationale

Currently there are two overlapping actions:
1. **Lock Reward Type** — freezes radio selection, cleans irrelevant data, auto-saves
2. **Submit & Lock** — validates, saves, then calls `markSubmitted()` which makes everything read-only

These are redundant. The flow should be: **Save** (draft saves) → **Lock Reward Type** (final action that freezes type + saves + marks as submitted). No separate "Submit & Lock" needed.

## Changes

### File: `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

1. **Remove** `handleSubmit` function (lines 227-251) entirely
2. **Remove** the "Submit & Lock" button (lines 500-507)
3. **Enhance `handleLockRewardType`** to also call `markSubmitted()` after successful save — making it the single finalization action
4. **Move "Lock Reward Type" button** to where "Submit & Lock" was (primary position), keeping validation check (`!isValid` disables it)
5. Keep the **Save** button as-is for draft saves

### File: `src/hooks/useRewardStructureState.ts`

No changes needed — `markSubmitted()` and `lockRewardType()` already exist. The lock handler will simply call both.

### Result

The editing toolbar becomes: **Cancel | Save | Lock Reward Type**

- **Save** = draft save, can keep editing
- **Lock Reward Type** = validates → saves → locks type → cleans irrelevant data → marks submitted (fully read-only)

