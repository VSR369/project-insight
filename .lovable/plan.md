

# Critical Analysis: Reward Structure Bugs & Fix Plan

## What's Actually Broken (3 root causes)

### Bug 1 — Curator-saved data treated as "auto-populated"
When the curator saves reward data (monetary or non-monetary), the serializer writes `source_role: 'CURATOR'` into the JSONB. On page reload, `resolveRewardSource` sees `embeddedRole = 'CURATOR'` + `hasContent = true` and returns `isAutoPopulated: true`. This forces the section into `populated_from_source` state instead of `saved` — meaning the user sees a "Populated from Curator" banner instead of a normal read view with an Edit button.

**Fix in `src/services/rewardStructureResolver.ts`:**
In `resolveRewardSource`, when `embeddedRole === 'CURATOR'`, return `isAutoPopulated: false` so the hook resolves to `saved` state:

```typescript
// After line 253 (const migrated = migrateRawReward(raw))
if (embeddedRole === 'CURATOR' && hasContent) {
  return {
    ...migrated,
    sourceRole: 'CURATOR',
    isAutoPopulated: false,  // Curator's own data — not upstream
    isEditable: true,
  };
}
```

### Bug 2 — Monetary serializer loses tier detail; reload fails
`serializeRewardData` flattens tiers into `{ platinum: N, gold: N, silver: N }` (top-level keys with just the amount). This loses `count` and `label`. On reload, `migrateRawReward` reconstructs tiers with `count: 1` always — so if the user set `count: 3` for gold, it's lost.

Additionally, `totalPool` is not serialized as a field — it's only derivable from the sum. If the user entered a lump sum of 500,000 but the AI split it into tiers totaling 500,000, on reload the `totalPool` is gone.

**Fix in `src/services/rewardStructureResolver.ts`:**

Update `serializeRewardData` to persist the full `tiers` array and `totalPool`:

```typescript
if (data.type === 'monetary' && data.monetary) {
  const m = data.monetary;
  const tierMap: Record<string, number> = {};
  for (const t of m.tiers) {
    tierMap[t.rank] = t.amount;
  }
  return {
    ...base,
    type: 'monetary',
    currency: m.currency,
    totalPool: m.totalPool,
    // Keep flat keys for backward compat with any legacy readers
    platinum: tierMap.platinum ?? 0,
    gold: tierMap.gold ?? 0,
    silver: tierMap.silver ?? 0,
    // Also persist full tiers for lossless round-trip
    tiers: m.tiers,
    num_rewarded: String(m.tiers.filter(t => t.amount > 0 && t.rank !== 'honorable_mention').length),
    payment_mode: m.payment_mode ?? 'escrow',
    payment_milestones: m.payment_milestones ?? [],
  };
}
```

### Bug 3 — `migrateRawReward` doesn't read serialized `tiers` array
When `tiers` array is now persisted (Bug 2 fix), `migrateRawReward` must prefer it over the flat `platinum`/`gold`/`silver` keys for lossless round-trip.

**Fix in `src/services/rewardStructureResolver.ts`:**

In the monetary path of `migrateRawReward`, check for `raw.tiers` array first:

```typescript
if (explicitType === 'monetary' || hasTierAmounts) {
  let tiers: PrizeTier[] = [];

  // Prefer serialized tiers array (lossless round-trip)
  if (Array.isArray(raw.tiers) && raw.tiers.length > 0) {
    tiers = raw.tiers.map((t: any) => ({
      rank: t.rank,
      amount: Number(t.amount) || 0,
      count: Number(t.count) || 1,
      label: t.label,
    }));
  } else {
    // Fallback: reconstruct from flat keys
    if (platinumAmt > 0) tiers.push({ rank: 'platinum', amount: platinumAmt, count: 1, label: '1st Place' });
    if (goldAmt > 0) tiers.push({ rank: 'gold', amount: goldAmt, count: 1, label: '2nd Place' });
    if (silverAmt > 0) tiers.push({ rank: 'silver', amount: silverAmt, count: 1, label: '3rd Place' });
  }

  return {
    type: 'monetary',
    monetary: {
      currency: raw.currency ?? 'USD',
      totalPool: raw.totalPool ?? totalFromFlat || (Number(raw.amount) || undefined),
      tiers,
      payment_milestones: raw.payment_milestones ?? raw.payment_schedule ?? [],
      payment_mode: raw.payment_mode,
    },
  };
}
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/services/rewardStructureResolver.ts` | 1. `resolveRewardSource`: return `isAutoPopulated: false` for `CURATOR` role |
| | 2. `serializeRewardData`: persist `tiers` array and `totalPool` alongside flat keys |
| | 3. `migrateRawReward`: prefer `raw.tiers` array over flat keys; read `raw.totalPool` |

## What Is NOT Broken
- The DB data is intact (confirmed: non-monetary items with 5 AI-generated rewards exist)
- The component tree (editors, cards, toggle, chooser) is structurally correct
- The auto-save via `pendingSave` + `useEffect` is working (data did persist)
- The confirmation dialog for type switching is wired correctly

## Result After Fix
- Curator-saved data → `saved` state → prominent Edit button
- Monetary tiers with custom counts/labels survive page reload
- Total pool value persists across saves
- Non-monetary items continue to round-trip correctly (already working)

