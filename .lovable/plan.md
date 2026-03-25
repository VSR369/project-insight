

# Fix: Reward Data Not Persisting After AI Generation

## Problem
When the user generates monetary tiers (AI Breakup) or non-monetary suggestions (Generate with AI), the data only lives in React state. The user must manually click "Save Reward Structure" — but this isn't obvious, and navigating away loses everything.

## Root Cause
`MonetaryRewardEditor` and `NonMonetaryRewardEditor` call `onUpdate` (which updates hook state), but no auto-save happens. The Save button is at the bottom of the editing section and easy to miss.

## Fix: Auto-save after AI generation + explicit save after manual edits

### 1. `src/components/cogniblend/curation/RewardStructureDisplay.tsx`

Add auto-save logic that triggers after AI-generated data is accepted:

**`handleAIBreakup`** — after tiers are returned and applied via `setMonetary`, immediately call `handleSave()`:

```typescript
const handleAIBreakup = useCallback(async (amount: number, currency: string) => {
  setAiLoading(true);
  try {
    const result = await requestAITierBreakup(amount, currency, challengeContext);
    if (result) {
      // Update state with AI result
      setMonetary({
        currency,
        totalPool: amount,
        tiers: result,
        payment_mode: rewardData.monetary?.payment_mode,
      });
      // Auto-save after a tick so state is committed
      setTimeout(() => handleSaveInternal(), 0);
      toast.success('AI tier breakup saved.');
    }
    return result;
  } finally {
    setAiLoading(false);
  }
}, [...]);
```

**`handleAINonMonetary`** — same pattern: after suggestions are returned and added to items, auto-save:

```typescript
const handleAINonMonetary = useCallback(async () => {
  setAiLoading(true);
  try {
    const result = await requestAINonMonetarySuggestions(challengeContext);
    if (result && result.length > 0) {
      const currentItems = rewardData.nonMonetary?.items ?? [];
      setNonMonetary({ items: [...currentItems, ...result] });
      setTimeout(() => handleSaveInternal(), 0);
      toast.success('AI reward suggestions saved.');
    }
    return result;
  } finally {
    setAiLoading(false);
  }
}, [...]);
```

The problem with `setTimeout` is the state won't be updated yet. Better approach:

### 2. Add a `pendingSave` flag + `useEffect` for deferred auto-save

```typescript
const [pendingSave, setPendingSave] = useState(false);

// After AI data is applied to state, set pendingSave
// In the AI handlers: setPendingSave(true) after setMonetary/setNonMonetary

useEffect(() => {
  if (pendingSave && rewardData.type) {
    setPendingSave(false);
    // Save directly using current rewardData
    const doSave = async () => {
      try {
        const serialized = serializeRewardData(rewardData);
        const { error } = await supabase
          .from('challenges')
          .update({ reward_structure: serialized as unknown as Json })
          .eq('id', challengeId);
        if (error) throw new Error(error.message);
        queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
        markSaved();
      } catch (err: any) {
        toast.error(`Auto-save failed: ${err.message}`);
      }
    };
    doSave();
  }
}, [pendingSave, rewardData]);
```

### 3. Move AI result handling into the orchestrator

Currently `handleAIBreakup` returns tiers to `MonetaryRewardEditor` which calls `updateField` internally. This is a two-hop update. Instead, handle the AI result directly in the orchestrator:

In `handleAIBreakup`:
```typescript
const result = await requestAITierBreakup(amount, currency, challengeContext);
if (result) {
  setMonetary({
    currency,
    totalPool: amount,
    tiers: result,
  });
  setPendingSave(true);
}
return result;
```

In `handleAINonMonetary`:
```typescript
const result = await requestAINonMonetarySuggestions(challengeContext);
if (result?.length) {
  setNonMonetary({
    items: [...(rewardData.nonMonetary?.items ?? []), ...result],
  });
  setPendingSave(true);
}
return result;
```

### 4. Also auto-save on type selection from the wizard

When user picks Monetary or Non-Monetary in `RewardTypeChooser`, save the type immediately so it persists:

```typescript
const handleTypeSelect = useCallback((type: RewardType) => {
  setRewardType(type);
  // Don't auto-save yet — no data to save, just the type
  // But save once they add content (handled by pendingSave above)
}, [setRewardType]);
```

### 5. `serializeRewardData` fix for non-monetary

Currently `serializeRewardData` stores non-monetary as `{ type: 'non_monetary', items: [...] }`. On reload, `migrateRawReward` checks for `explicitType === 'non_monetary'` but then only looks for `tiered_perks` and `non_monetary_perks` — it never reads `raw.items`. So non-monetary data is **lost on reload**.

Fix in `src/services/rewardStructureResolver.ts`, `migrateRawReward`:
```typescript
// After tiered_perks and non_monetary_perks handling, add:
if (Array.isArray(raw.items)) {
  for (const item of raw.items) {
    if (item && typeof item === 'object' && item.title) {
      items.push({
        id: item.id ?? crypto.randomUUID(),
        type: item.type ?? 'other',
        title: item.title,
        description: item.description ?? '',
        isAISuggested: item.isAISuggested ?? false,
        isFromSource: item.isFromSource ?? false,
      });
    }
  }
}
```

## Summary of changes

| File | Change |
|------|--------|
| `RewardStructureDisplay.tsx` | Add `pendingSave` state + `useEffect` for auto-save after AI generation; move AI result handling into orchestrator |
| `rewardStructureResolver.ts` | Fix `migrateRawReward` to read `raw.items` for non-monetary data on reload |

## Result
- AI-generated monetary tiers → auto-saved to DB immediately
- AI-generated non-monetary items → auto-saved to DB immediately
- Manual edits still require explicit Save click (intentional — prevents partial saves)
- On page reload, both monetary and non-monetary data restore correctly from DB

