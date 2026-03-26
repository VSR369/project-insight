

# Final Corrected Plan: Reward Structure Redesign

## Corrections Applied from Review

All 7 corrections from the review are incorporated below. Changes marked with **[CORRECTION]**.

---

## 1. Source State Detection on Mount (`RewardStructureDisplay.tsx`)

Detect `AMRewardPayload` scenario and configure UI automatically:

| # | Condition | Action |
|---|-----------|--------|
| 1 | Payload null | Set `rewardType = 'monetary'` (default). Auto-trigger inline AI for both tabs. |
| 2 | `monetary.totalPool` set, no tiers | Set `rewardType = 'monetary'`. Show AM badge on pool field. **[CORRECTION]** Auto-trigger inline AI to suggest tier split. |
| 3 | `nonMonetary` set, no monetary | **[CORRECTION]** Programmatically set `rewardType = 'non_monetary'` before first render so curator lands on correct tab. Mark AM items with badge. |
| 4 | Both present | **[CORRECTION]** Default to `rewardType = 'monetary'`. Show banner: "AM defined both reward types. Review each tab independently before submitting." Both tabs independently accessible. |

**Auto-trigger condition (tightened):**
```typescript
const shouldAutoTriggerAI =
  !amPayload ||
  (amPayload.monetary?.totalPool && !amPayload.monetary?.tiers);
```

---

## 2. Monetary Tab — Toggle-switch Tier Cards

Replace current lump-sum + free-form tiers with three fixed tier cards:

- **Platinum** (always required when monetary active), **Gold**, **Silver** — each with enable/disable switch + amount input
- Per-field source tracking: `FieldSource { src: 'am' | 'ai' | 'curator'; modified?: boolean }`
- Inline AI suggestion chips per tier: "AI suggests: $5,000" + Accept button
- AI Recommendations panel at bottom with "Apply tiers" / "Apply amounts" / "Accept all"

**[CORRECTION] Tier hierarchy validation** — add to `rewardValidation.ts`:
- Gold enabled & `gold.amount >= platinum.amount` → error
- Silver enabled & `silver.amount >= gold.amount` → error
- **Silver enabled without Gold enabled → error** (new rule)

**[CORRECTION] Source badge colors:**
- AM → amber/warning (pre-filled, needs review)
- AI → blue/info (suggested, not confirmed)
- Curator → gray/secondary (curator-owned)
- Modified → amber + pencil icon (overridden from AM/AI)

### Files
| File | Action |
|------|--------|
| `rewards/PrizeTierCard.tsx` | Rewrite — toggle switch, amount input, inline AI chip, source badge |
| `rewards/MonetaryRewardEditor.tsx` | Rewrite — 3 fixed tier cards, remove lump-sum mode |
| `rewards/AIRecommendationsPanel.tsx` | New — AI panel with Apply tiers/amounts |
| `rewards/SourceBadge.tsx` | New — AM (amber), AI (blue), Curator (gray), Modified (amber+pencil) |

---

## 3. Non-Monetary Tab — 5-Item Checkbox Grid

Replace free-form item cards with five fixed checkbox cards in 2-column grid:
- Certificate, Memento, Gift vouchers, Movie sponsorship, Others
- Each card: bordered card + checkbox + label + source badge
- Pre-checked AM items show amber AM badge
- AI can recommend items (blue AI badge + individual Accept)

### Files
| File | Action |
|------|--------|
| `rewards/NonMonetaryRewardEditor.tsx` | Rewrite — 5 checkbox cards, 2-col grid |
| `rewards/NonMonetaryItemCard.tsx` | Rewrite — checkbox card with source badge |

---

## 4. AI Review — Two Distinct Flows

**[CORRECTION]** Explicitly separate two AI mechanisms:

### Flow A: Inline AI (lightweight, structured)
- **Trigger:** Auto on mount when `shouldAutoTriggerAI` is true; otherwise via small "✨ Suggest" button per section
- **Monetary:** Returns suggested tier count + amounts as chips on each tier card
- **Non-monetary:** Returns recommended items to check
- **Actions:** Individual Accept per suggestion + "Accept all" at panel level

### Flow B: Review with AI (full review panel)
- **Trigger:** "Review with AI" button per tab
- **Mechanism:** Calls `handleSingleSectionReview` — same as all other curator sections
- **Output:** Narrative AI comments + AI Suggested Version + Accept/Keep original
- **Location:** Renders in `CurationAIReviewInline` wrapper (unchanged, stays in `CuratorSectionPanel`)

### Files
| File | Action |
|------|--------|
| `rewards/MonetaryRewardEditor.tsx` | Add "Review with AI" button triggering Flow B |
| `rewards/NonMonetaryRewardEditor.tsx` | Add "Review with AI" button triggering Flow B |
| `rewards/AIRecommendationsPanel.tsx` | Handles Flow A inline suggestions |

---

## 5. Submission Lock

**[CORRECTION]** Full lock after submission — nothing editable:

- `isSubmitted = true` → type toggle disabled with lock badge
- **All tier amounts locked** (inputs become read-only)
- **All non-monetary checkboxes locked** (disabled)
- Lock note displayed: "Reward structure is locked after submission."
- No post-submission edits permitted

### Files
| File | Action |
|------|--------|
| `rewards/RewardTypeToggle.tsx` | Add `disabled` + lock badge when `isSubmitted` |
| `useRewardStructureState.ts` | Add `isSubmitted` state + `markSubmitted` action |
| `RewardStructureDisplay.tsx` | Pass `isSubmitted` to all child editors |

---

## 6. Validation Updates (`rewardValidation.ts`)

**Monetary** (updated):
- Platinum amount > 0 when monetary active
- Gold < Platinum when Gold enabled
- Silver < Gold when Gold enabled
- **[CORRECTION]** Silver cannot be active without Gold
- Total pool must match tier sum (if pool defined)

**Non-monetary** (new checkbox model):
- At least one item selected
- No per-item title/type validation needed (fixed items)

---

## 7. State Hook Updates (`useRewardStructureState.ts`)

- Add `isSubmitted` boolean + `markSubmitted()` action
- Add per-field `FieldSource` tracking in `TierState`
- Add `NonMonetarySelections` model (5 fixed checkboxes with source tracking)
- On `markSubmitted`, freeze all state permanently

---

## 8. Serializer Backward Compatibility (`rewardStructureResolver.ts`)

- Serialize new checkbox model as `items[]` array for DB compatibility
- On migration/read, map old `items[]` titles to the 5 fixed checkboxes
- Persist `tiers` array + `totalPool` + flat keys (already done)
- Persist `fieldSources` in JSONB for source attribution round-trip

---

## Execution Order

1. `SourceBadge.tsx` (new) — shared dependency
2. `rewardValidation.ts` — add Silver-without-Gold rule
3. `useRewardStructureState.ts` — add `isSubmitted`, source tracking, checkbox model
4. `rewardStructureResolver.ts` — AMRewardPayload detection, serializer updates
5. `PrizeTierCard.tsx` — rewrite with toggle + AI chip + badge
6. `MonetaryRewardEditor.tsx` — rewrite with 3 fixed tiers + AI panel
7. `AIRecommendationsPanel.tsx` (new)
8. `NonMonetaryItemCard.tsx` — rewrite as checkbox card
9. `NonMonetaryRewardEditor.tsx` — rewrite as 5-item grid
10. `RewardTypeToggle.tsx` — add lock badge
11. `RewardStructureDisplay.tsx` — orchestrator updates (source detection, submission lock, auto-trigger)

