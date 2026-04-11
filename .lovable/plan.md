

## Fix: AI Tier Auto-Split from Creator Budget

### Problem
When a Creator provides a total budget (`totalPool`), the curator has no quick way to distribute it across tiers using a standard 50/30/20 split. The `onApplyAITiers` prop exists on `MonetaryRewardEditor` but is only wired to the `AIRecommendationsPanel` — there's no standalone trigger when AI suggestions haven't been generated yet.

### Changes

**1. `src/hooks/useRewardStructureHandlers.ts`**
- Add `handleApplyAITiers` callback that computes 50/30/20 split from `totalPool` and calls `updateTier` for platinum, gold, silver with `enabled: true` and computed amounts
- Show success toast with the split amounts
- Export it in the return object

**2. `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx`**
- Add an "AI Split" banner between the currency selector and tier cards, shown when `totalPool > 0` and `hasAISuggestions === false`
- Banner shows Creator budget amount, suggested split percentages, and an "Apply AI Split" button that calls `onApplyAITiers`

**3. `src/components/cogniblend/curation/RewardDisplayContent.tsx`**
- Add `onApplyAITiers` to the props interface
- Pass it through to `MonetaryRewardEditor` in `renderMonetaryEditor`

**4. `src/components/cogniblend/curation/RewardStructureDisplay.tsx`**
- Pass `handlers.handleApplyAITiers` as `onApplyAITiers` prop to `RewardDisplayContent`

### Files changed

| File | Action |
|------|--------|
| `src/hooks/useRewardStructureHandlers.ts` | Add `handleApplyAITiers` handler |
| `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx` | Add AI Split banner UI |
| `src/components/cogniblend/curation/RewardDisplayContent.tsx` | Thread `onApplyAITiers` prop |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Pass handler to content |

