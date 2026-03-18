

# Reward Structure Enhancement — Step 3

## What the Reference Shows (image-377)

The reference image shows a complete Step 3 "Rewards & Payment" with these sections:

1. **Reward Category**: Monetary / Non-Monetary radio buttons
2. **Number of Rewarded Solutions**: Top 1 / Top 2 / Top 3 radio buttons
3. **Reward Tiers**: Platinum (1st), Gold (2nd), Silver (3rd) — each with amount input + currency dropdown side-by-side. Tiers shown/hidden based on "Number of Rewarded Solutions" selection
4. **Total Reward Pool**: Calculated sum displayed in a highlighted box (e.g., "₹ 17,50,000 INR")
5. **Payment Mode**: Platform Escrow (mandatory, with checkmark) vs Direct Pay (locked/disabled)
6. **Payment Schedule (Milestone-based)**: Table with columns — Milestone name, % of Award, Trigger Event — with "+ Add Milestone" button and "Running Total: 100% ✓" footer
7. **Platform Provider Fee**: Info banner explaining consulting + management + success fee
8. **Bottom bar**: "Save as Draft" (red) + "Next: Timeline & Phase Schedule →" (blue)

## Gaps in Current StepRewards.tsx

| Gap | Current | Needed |
|-----|---------|--------|
| No "Number of Rewarded Solutions" selector | Silver is just "optional" | Top 1/2/3 radio controlling which tiers show |
| No Total Reward Pool display | Missing | Sum of all tiers in highlighted box |
| No Payment Mode section | Missing | Escrow (mandatory) vs Direct Pay (locked) |
| No Payment Schedule milestones | Missing | Milestone table with name, %, trigger event |
| No Platform Provider Fee banner | Missing | Info card at bottom |
| Enterprise tier layout | Vertical stack with circle badges | Horizontal 3-column layout matching reference |

## Changes

### 1. Schema (`challengeFormSchema.ts`)
Add 3 new fields:
- `num_rewarded_solutions`: `z.enum(['1','2','3']).default('3')`
- `payment_mode`: `z.enum(['escrow','direct']).default('escrow')`
- `payment_milestones`: array of `{ name, pct, trigger }` with defaults (Abstract Shortlisted 10%, Full Solution Submitted 30%, Solution Selected 60%)

### 2. StepRewards.tsx — Full Rewrite
- **Reward Category**: Keep existing monetary/non-monetary toggle (Lightweight) + show for Enterprise as radio buttons
- **Number of Rewarded Solutions**: 3 radio buttons (Top 1/2/3) — controls visibility of Gold/Silver tiers
- **Reward Tiers (Enterprise)**: Horizontal 3-column layout with currency dropdown per tier. Show/hide Gold and Silver based on selection
- **Total Reward Pool**: Computed box showing sum formatted with locale + currency
- **Payment Mode**: Two radio cards — Escrow (checked, with info tooltip) and Direct Pay (disabled with lock icon)
- **Payment Schedule**: Editable table with Milestone, % of Award, Trigger Event columns. "+ Add Milestone" button. Running Total footer with 100% validation
- **Platform Provider Fee**: Info banner at bottom
- **Rejection Fee Slider**: Keep existing (Enterprise only)

### 3. `buildFieldsFromForm` in ChallengeWizardPage.tsx
Update `reward_structure` to include `num_rewarded`, `payment_mode`, and `payment_milestones` in the JSONB.

### 4. Default Values
Add defaults for `num_rewarded_solutions: '3'`, `payment_mode: 'escrow'`, `payment_milestones` with 3 default milestones.

## Files to Modify

| File | Action |
|------|--------|
| `challengeFormSchema.ts` | Add 3 new fields + defaults |
| `StepRewards.tsx` | Full rewrite with all 7 sections |
| `ChallengeWizardPage.tsx` | Update `buildFieldsFromForm` reward_structure + step 3 field list |

