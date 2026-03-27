

# Reward Structure UX Overhaul — Corrected Plan

## Critical Analysis of Your Requirements

Before the plan, here are corrections and challenges I found in your proposed requirements:

### Correction 1: "Both" reward type is valid and common
Your instinct to add "Both" is correct. Many global innovation platforms (InnoCentive, HeroX, Kaggle) support combined monetary + non-monetary rewards. The current mutual-exclusivity rule (`validateRewardStructure` line 189-196 explicitly rejects having both) is overly restrictive. **Your proposal is aligned with industry practice.**

### Correction 2: Radio buttons are the right pattern
Current toggle buttons allow ambiguous state. Radio buttons (Monetary / Non-Monetary / Both) make it explicit and prevent confusion. This is a valid UX improvement.

### Correction 3: Free navigation without data loss — needs a nuance
You said "free navigation between monetary and non-monetary without losing data." This works perfectly with the "Both" option — both tabs retain data. But when the user explicitly locks to "Monetary only," the non-monetary data MUST be cleared (as you stated). The nuance: **during editing, both tabs always retain data. Data cleanup only happens at lock time, not during navigation.**

### Correction 4: Non-monetary items — editable is correct
Fixed 5 items was too rigid. Global practice: provide default suggestions but allow custom items. Certificate/Memento are fine defaults, but curators should add domain-specific items (e.g., "Patent filing support", "Conference speaking slot"). **Your proposal is correct.**

### Correction 5: AI Review integration gap
Currently `RewardStructureDisplay` is rendered at line 2359 of `CurationReviewPage.tsx` **without** `onReviewWithAI` prop. The `CurationAIReviewInline` panel IS built at line 2586-2613 and passed to `CuratorSectionPanel`, so the standard AI review infrastructure exists — but the reward section doesn't receive it properly. The reward component has its own separate "Review with AI" buttons that call `onReviewWithAI('reward_structure_monetary')` — but this prop is never passed. **This is a bug, not a design issue.**

### One challenge with your proposal
You want AI to "limit itself to suggested 1, 2, 3 level rewards with amounts and justification." This is a **prompt engineering** concern for the edge function, not a frontend change. The triage system already has section-specific prompts configurable by supervisors. The fix is to ensure the `reward_structure` section prompt in the AI config instructs the LLM to output structured tier recommendations + innovative NM items.

---

## Plan

### 1. Wire AI Review into Reward Section (Bug Fix)

**Problem:** `CurationReviewPage.tsx` line 2359 renders `RewardStructureDisplay` without passing AI handlers.

**Fix:** Pass `onReviewWithAI` as a callback that triggers `handleSingleSectionReview` for key `reward_structure`. When AI review returns a suggested version, `handleAcceptRefinement` (line 1523) already handles `reward_structure` as a JSON field — it will parse the AI's structured output and save to DB.

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` — update line 2359 case block to pass the handler.

### 2. Replace Toggle with Radio Buttons: Monetary / Non-Monetary / Both

**File:** `src/components/cogniblend/curation/rewards/RewardTypeToggle.tsx`

Replace the two toggle buttons with a `RadioGroup` (already in `src/components/ui/radio-group.tsx`):
- **Monetary** — show monetary tab only
- **Non-Monetary** — show non-monetary tab only  
- **Both** — show both tabs with a tab switcher between them

**File:** `src/services/rewardStructureResolver.ts` — extend `RewardType` to include `'both'`.

### 3. Both-Type Tab Navigation with Data Persistence

When "Both" is selected, render both editors with a lightweight tab bar (Monetary | Non-Monetary) for navigation. Both tabs always retain their data — no clearing on switch.

**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
- Add `activeTab` state for "Both" mode
- Render both editors but show one at a time
- Remove the auto-save on type switch (no data clearing during navigation)

### 4. Make Non-Monetary Items Editable (Add/Edit/Delete)

Replace fixed 5-checkbox model with an editable list:
- Keep the 5 defaults as pre-populated suggestions
- Add "Add item" button to create custom NM items
- Each item gets an edit (inline text field) and delete button
- Items have: title (editable text), source badge

**Files:**
- `src/hooks/useRewardStructureState.ts` — change `NonMonetarySelections` from fixed Record to dynamic array model
- `src/components/cogniblend/curation/rewards/NonMonetaryRewardEditor.tsx` — add/edit/delete UI
- `src/components/cogniblend/curation/rewards/NonMonetaryItemCard.tsx` — editable mode
- `src/lib/rewardValidation.ts` — update validation for dynamic items

**New model:**
```typescript
interface NonMonetaryItem {
  id: string;
  title: string;
  src: FieldSource;
  isDefault?: boolean; // true for the 5 preset items
}
```

### 5. Explicit "Lock Reward Type" Action

Replace current "Submit & Lock" with a two-step flow:
1. **Lock Reward Type** button — freezes the radio selection, cleans up irrelevant data:
   - If "Monetary" locked → clear NM items from DB
   - If "Non-Monetary" locked → clear tier data from DB
   - If "Both" locked → save everything
2. After locking, inputs remain editable for corrections
3. Show lock badge + note on the radio group

**Files:**
- `src/components/cogniblend/curation/RewardStructureDisplay.tsx` — add lock handler
- `src/hooks/useRewardStructureState.ts` — `lockRewardType()` action that cleans irrelevant data

### 6. AI Acceptance Populates Fields

When the curator accepts AI suggestions from `CurationAIReviewInline`:
- Parse the AI's structured JSON (monetary tiers + NM items)
- Populate both monetary tier states and NM item list
- Mark all populated fields with `src: 'ai'`

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` — in `handleAcceptRefinement`, add reward-specific parsing that calls back into `RewardStructureDisplay` state.

**File:** `src/components/cogniblend/curation/RewardStructureDisplay.tsx` — expose `applyAIReviewResult(data)` that accepts parsed AI output and populates both sections.

### 7. Validation Updates

**File:** `src/lib/rewardValidation.ts`
- For `'both'` type: validate monetary tiers AND at least one NM item
- For `'monetary'`: existing tier hierarchy rules
- For `'non_monetary'`: at least one item with non-empty title
- Remove the mutual exclusivity check (line 189-196)

---

## Files Summary

| File | Change |
|------|--------|
| `CurationReviewPage.tsx` | Pass `onReviewWithAI` to RewardStructureDisplay; reward-specific acceptance parsing |
| `RewardTypeToggle.tsx` | Rewrite as RadioGroup with 3 options |
| `RewardStructureDisplay.tsx` | Both-mode tab navigation, lock handler, AI result acceptance |
| `useRewardStructureState.ts` | Dynamic NM items array, `lockRewardType()`, `'both'` type support |
| `NonMonetaryRewardEditor.tsx` | Add/edit/delete item UI |
| `NonMonetaryItemCard.tsx` | Editable title, delete button |
| `rewardValidation.ts` | Both-type validation, remove mutual exclusivity |
| `rewardStructureResolver.ts` | Extend `RewardType` to include `'both'` |
| `RewardTypeChooser.tsx` | Add "Both" option card |

