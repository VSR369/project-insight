

# Fix Reward Structure AI Review — Holistic Cleanup

## Problems Identified

### Problem 1: Global "Review Sections by AI" produces empty/broken results for reward_structure
The global review flow (Phase 1 triage + Phase 2 deep review) correctly generates AI comments and suggested content for `reward_structure`. However, the `CurationAIReviewInline` panel that renders these results is placed in the `aiReviewSlot` prop of `CuratorSectionPanel` — which renders ALONGSIDE the section content. But for `reward_structure`, the section content case at line 2529 returns a `RewardStructureDisplay` that itself receives `onReviewWithAI` wired to `handleSingleSectionReview(sectionKey, {} as any)`. This is wrong:
- It passes an **empty object** `{} as any` as the review — overwriting any real review with nothing
- The `CurationAIReviewInline` in `aiReviewSlot` IS already rendering, but the standalone button inside the component triggers a competing broken flow

### Problem 2: Redundant "Review with AI" buttons inside MonetaryRewardEditor and NonMonetaryRewardEditor
Every other section relies on the global "Review Sections by AI" button + per-section "Re-review" in the `CurationAIReviewInline` panel. Reward structure has extra standalone buttons that:
- Conflict with the standard flow
- Call `handleSingleSectionReview` with empty data, wiping real review results

## Root Cause
The `onReviewWithAI` prop was added to `RewardStructureDisplay` as a remnant of an earlier design where rewards had their own review flow. Now that the global flow handles it (and `CurationAIReviewInline` already renders in the `aiReviewSlot`), these standalone buttons are redundant and actively harmful.

## Fix Plan

### 1. Remove `onReviewWithAI` prop from RewardStructureDisplay
**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (line 2539)
- Stop passing `onReviewWithAI` to `RewardStructureDisplay`
- The `CurationAIReviewInline` in `aiReviewSlot` already handles review display, accept/keep, and re-review

### 2. Remove "Review with AI" button from MonetaryRewardEditor
**File:** `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx` (lines 135-155)
- Remove the `onReviewWithAI`, `aiLoading`, `hasBeenReviewed` props and the button JSX
- Keep `hasAISuggestions`, `onAcceptAllAI`, `aiRationale` (these are for Flow A inline recommendations, not review)

### 3. Remove "Review with AI" button from NonMonetaryRewardEditor
**File:** `src/components/cogniblend/curation/rewards/NonMonetaryRewardEditor.tsx` (lines 129-149)
- Same cleanup — remove the button and associated props

### 4. Remove `onReviewWithAI` prop and related callbacks from RewardStructureDisplay
**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
- Remove `onReviewWithAI` from props interface
- Remove `handleReviewMonetary` and `handleReviewNonMonetary` callbacks
- Stop passing `onReviewWithAI` to child editors

## How It Works After Fix

```text
Reward Structure section (same as every other section):
├── CuratorSectionPanel wrapper
│   ├── RewardStructureDisplay (section content — editing, tiers, NM items)
│   └── aiReviewSlot → CurationAIReviewInline
│       ├── AI Review comments (from global "Review Sections by AI")
│       ├── AI Suggested Version (from Phase 2 refinement)
│       ├── Accept suggestion → applies via rewardStructureRef.applyAIReviewResult()
│       ├── Keep original
│       └── Re-review this section (triggers per-section deep review)
```

No separate "Review with AI" buttons. The global flow + re-review handles everything. The acceptance flow via `handleAcceptRefinement` → `rewardStructureRef.applyAIReviewResult()` (lines 1632-1648) is already correct and remains unchanged.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove `onReviewWithAI` prop from `RewardStructureDisplay` (line 2539) |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | Remove `onReviewWithAI` prop, `handleReviewMonetary`, `handleReviewNonMonetary`; stop passing to child editors |
| `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx` | Remove `onReviewWithAI`, `aiLoading`, `hasBeenReviewed` props and button JSX |
| `src/components/cogniblend/curation/rewards/NonMonetaryRewardEditor.tsx` | Remove `onReviewWithAI`, `aiLoading`, `hasBeenReviewed` props and button JSX |

