

## Plan: Gate LC Queue by Phase Completion

### Problem
`LcChallengeQueuePage` filters only by `role_codes?.includes('LC')` — it shows challenges at **any** phase, including Phase 1 where spec review hasn't happened yet. This violates the lifecycle sequence.

### Fix

**File: `src/pages/cogniblend/LcChallengeQueuePage.tsx`**

Update the `lcChallenges` filter to only include challenges where `current_phase >= 2` (spec review completed, now ready for legal work):

```ts
const lcChallenges = useMemo(() => {
  if (!challengeRows) return [];
  return challengeRows.filter((row) =>
    row.role_codes?.includes('LC') && row.current_phase >= 2
  );
}, [challengeRows]);
```

This ensures:
- Phase 1 challenges (spec not reviewed) are hidden from LC
- Phase 2+ challenges (spec approved, ready for legal) are visible
- No backend changes needed — purely a UI filter

### Files Modified
- `src/pages/cogniblend/LcChallengeQueuePage.tsx` (one-line filter change)

