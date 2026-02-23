

# Integrate Membership Selection into Plan Selection (Step 4)

## Overview

Currently, membership enrollment happens separately after registration. This change embeds membership tier selection (Annual / Multi-Year) directly into the Plan Selection screen (Step 4) for Basic, Standard, and Premium tiers. Users will see how membership discounts reduce their per-challenge fees right on the same screen, creating a unified "Choose Your Plan + Membership" experience.

Enterprise tier is excluded -- it uses custom sales agreements.

## What Changes

### 1. Add Membership Tier Selector to Step 4

After a user selects a subscription tier (Basic/Standard/Premium), a new "Membership" section appears below the tier cards showing:
- **Annual Membership** -- 12 months, 10% fee discount, 5% commission reduction
- **Multi-Year Membership** -- 24 months, 15% fee discount, 7% commission reduction
- **No Membership** option (proceed without discount)

Each option will display the discount benefits clearly so users understand the value.

### 2. Show Discount Impact

When a membership is selected, each tier card's pricing area will show a note like:
- "10% off per-challenge fees with Annual Membership"

This gives immediate visual feedback on the value of membership.

### 3. Carry Membership Selection to Billing (Step 5)

The selected membership tier ID will be stored in the registration context (Step 4 data) and reflected in the Billing Order Summary as a line item.

### 4. Skip Membership for Enterprise and Internal Departments

- Enterprise tier: No membership selector shown (custom agreements)
- Internal departments (zero_fee_eligible): No membership selector shown (auto-bypass per BR-MEM-003)

---

## Technical Details

### Files to Modify

**`src/types/registration.ts`** -- Add `membership_tier_id` to `PlanSelectionData`:
```typescript
export interface PlanSelectionData {
  tier_id: string;
  billing_cycle_id: string;
  engagement_model_id?: string;
  membership_tier_id?: string;        // NEW
  estimated_challenges_per_month: number;
}
```

**`src/lib/validations/planSelection.ts`** -- Add optional `membership_tier_id` field to Zod schema:
```typescript
export const planSelectionSchema = z.object({
  tier_id: z.string().min(1, 'Please select a subscription tier'),
  billing_cycle_id: z.string().min(1, 'Please select a billing cycle'),
  engagement_model_id: z.string().optional(),
  membership_tier_id: z.string().optional(),   // NEW
});
```

**`src/components/registration/PlanSelectionForm.tsx`** -- Main changes:
- Import `useMembershipTiers` hook
- Add a "Membership Plan" section that appears when a non-Enterprise tier is selected and user is not an internal department
- Display two styled cards (Annual / Multi-Year) with discount details, plus a "No Membership" option
- Pass `membership_tier_id` into `setStep4Data()`
- Use `calculateMembershipDiscount()` from membershipService to show accurate discount percentages

**`src/components/registration/BillingForm.tsx`** -- Add membership line in Order Summary:
- Read `membership_tier_id` from `state.step4`
- If set, show a line: "Membership: Annual (10% challenge fee discount)" or similar
- No price impact on subscription fee -- membership discounts apply to per-challenge fees

### Data Flow

```text
Step 4 (Plan Selection)
  |-- User selects Subscription Tier (Basic/Standard/Premium)
  |-- User selects Billing Cycle (Monthly/Annual)
  |-- User selects Membership Tier (Annual/Multi-Year/None)  <-- NEW
  |-- All saved to registration context
  v
Step 5 (Billing)
  |-- Order Summary shows:
  |     Subscription: $X/mo
  |     Billing discount: -Y%
  |     Membership: Annual (10% off challenge fees)  <-- NEW
  |     Due Today: $Z
```

### Business Rules Applied
- **BR-MEM-001**: Membership discounts by tier (Annual: 10% fee / 5% commission; Multi-Year: 15% fee / 7% commission)
- **BR-MEM-003**: Internal departments skip membership (zero-fee bypass)
- Enterprise tier excluded from membership selection (custom agreements)

