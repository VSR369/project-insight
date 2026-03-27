

# Fix: Non-Monetary Items Overwritten by Defaults After AI Acceptance

## Root Cause

In `useRewardStructureState.ts`, the `setRewardType` callback (line 272-279) populates default NM items (Certificate, Memento, Gift Vouchers, Movie Sponsorship, Others) whenever `nmItems.length === 0` — but it doesn't check WHETHER the empty state is because the section is brand-new vs. items failing to load from a stale cache after remount.

When the component remounts (e.g., user navigates between sections, or React Query invalidation triggers a re-render cycle), if the cache briefly has stale data without NM items, `nmItems` initializes as `[]`. Any subsequent call to `setRewardType('both')` or `setRewardType('non_monetary')` then overwrites with defaults, replacing the saved AI items.

Additionally, `sectionState` is not consulted — defaults are injected even for `'saved'` sections where the empty list may be intentional or transient.

## Fix

### File: `src/hooks/useRewardStructureState.ts`

**Change 1**: Guard default population in `setRewardType` — only inject defaults for brand-new sections:

```typescript
const setRewardType = useCallback((type: RewardType) => {
  if (isSubmitted || isTypeLocked) return;
  setRewardTypeState(type);
  setSectionState('curator_editing');
  // Only populate defaults for brand-new sections, never for saved/loaded data
  if ((type === 'non_monetary' || type === 'both') && nmItems.length === 0 && sectionState === 'empty_no_source') {
    setNMItems(defaultNMItems('curator'));
  }
}, [isSubmitted, isTypeLocked, nmItems.length, sectionState]);
```

Adding `sectionState === 'empty_no_source'` ensures defaults are only set when the curator is creating a reward structure from scratch — never when loading saved data (even if items transiently appear empty due to cache/remount timing).

## Files

| File | Change |
|------|--------|
| `src/hooks/useRewardStructureState.ts` | Add `sectionState === 'empty_no_source'` guard to default NM item population in `setRewardType` |

