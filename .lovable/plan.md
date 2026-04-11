

## Fix: Formalize Reward Type Lock Persistence

### Current State
The lock **does** persist today — the hook writes `isTypeLocked` directly to the serialized object (line 549) and reads it back from the raw JSONB (line 250). However, this bypasses the formal `RewardData` interface and the `serializeRewardData`/`resolveRewardStructure` functions, making the data flow implicit.

### Changes

**1. `src/services/rewardStructureResolver.ts`**

- Add `isTypeLocked?: boolean` to the `RewardData` interface (line 82)
- In `serializeRewardData`, add `_typeLocked` to the base object when `data.isTypeLocked` is true (before the return branches, ~line 498)
- In `resolveRewardStructure`, set `resolved.isTypeLocked = raw?._typeLocked === true` so the resolver formally surfaces it

**2. `src/hooks/useRewardStructureState.ts`**

- Initialize `isTypeLocked` from `resolved.isTypeLocked` instead of reading raw JSONB directly (line 247-251)
- Add `isTypeLocked` to the `RewardData` object in `getSerializedData` (line 536-544) so `serializeRewardData` handles it
- Remove the post-serialization `serialized.isTypeLocked = isTypeLocked` line (549) since the serializer now handles it

**Migration note:** The serializer will write `_typeLocked` going forward. For backward compatibility, the resolver will also check for the old `isTypeLocked` key in raw data.

### Files changed

| File | Action |
|------|--------|
| `src/services/rewardStructureResolver.ts` | Add `isTypeLocked` to interface, serialize/resolve it |
| `src/hooks/useRewardStructureState.ts` | Use resolved value, add to RewardData, remove post-hoc write |

