

# Fix Reward Source Attribution — Curator-Saved Data Misattributed as AM

## Problem

Existing challenges where a curator already set up reward tiers (e.g., platinum: 66000, gold: 39000, silver: 15000) are now incorrectly showing **"Populated from Account Manager"** because:

1. The data was saved **before** the `source_role` fix, so it has no `source_role` field
2. `hasContent` is `true` (tiers exist)
3. The inference fallback assumes all marketplace content without `source_role` came from AM
4. Result: curator's own work is misattributed to the Account Manager

## Root Cause

The inference logic at lines 411-447 in `rewardStructureResolver.ts` blindly assumes that any content in a marketplace challenge without `source_role` came from the AM. But curator-saved data (via `serializeRewardData`) has distinctive markers:
- Explicit `type` field (`'monetary'`, `'non_monetary'`, `'both'`)
- `tiers` array (not flat `platinum`/`gold`/`silver` keys from intake)
- `totalPool`, `payment_mode`, `payment_milestones`

AM/intake-originated data has:
- `budget_min`/`budget_max` (no tier breakup)
- OR flat `platinum`/`gold`/`silver` keys without a `tiers` array
- No explicit `type` field (the intake form didn't set one before the fix)

## Fix: 1 Targeted Change

### `src/services/rewardStructureResolver.ts` — Inference block (~lines 411-447)

Before inferring AM/CR, check if the raw data has **curator serializer fingerprints**:
- If `raw.type` exists AND (`raw.tiers` array exists OR `raw.items` array exists), this data was saved by the curator serializer → default to `CURATOR`, not AM/CR
- Only infer AM/CR when the data lacks these markers (i.e., raw intake data with `budget_min`/`budget_max` or flat tier keys)

```text
// Pseudocode for the heuristic:
if hasContent && no embeddedRole:
  // Check if this looks like curator-serialized data
  if raw.type exists AND (raw.tiers array OR raw.items array):
    → sourceRole: 'CURATOR', isAutoPopulated: false
  else if marketplace:
    → sourceRole: 'AM', isAutoPopulated: true
  else if aggregator:
    → sourceRole: 'CR', isAutoPopulated: true
```

This ensures:
- **Legacy curator-saved data** (with `type` + `tiers`): correctly attributed to Curator, no banner shown
- **Legacy AM intake data** (with `budget_min`/`budget_max` or flat keys, no `type`): correctly attributed to AM
- **New data**: always has explicit `source_role` from intake or curator save, so inference is never reached

## Files Changed

| File | Change |
|------|--------|
| `src/services/rewardStructureResolver.ts` | Add curator-serializer fingerprint check before AM/CR inference (~5 lines) |

## Result

- Challenges with curator-set tiers: **No banner** (correctly identified as curator's work)
- Challenges with AM-provided budget range: **"Populated from Account Manager · Budget: $25K–$75K"**
- New challenges: Always have explicit `source_role` — no inference needed

