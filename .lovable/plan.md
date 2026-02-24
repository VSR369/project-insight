

# Fix All Plan Selection Problems — Final Implementation

## What Will Be Done

All 8 fixes applied to `src/components/registration/PlanSelectionForm.tsx` in a single file write. The database fix will be proposed as a migration.

## Fix 1: Database Cleanup
Delete Enterprise tier pricing rows from `md_tier_country_pricing` (tier_id `7bf7f040-5d05-4c75-b26c-182cb4113c62`). Enterprise pricing is negotiated, not a rate card.

## Fix 2: Dynamic Currency Symbol
Replace all hardcoded `$` with `state.localeInfo?.currency_symbol || '$'`.

## Fix 3: 3-Option Billing Cycle Selector
- Remove `isAnnual` boolean state and `Switch` import
- Add `selectedCycleId` state initialized from saved step4 data or monthly default
- Add `useEffect` to initialize cycle when billing cycles load
- Render segmented button group from `billingCycles` array with discount badges (e.g., "Annual -17%")

## Fix 4: Sync Billing Cycle ID
- `handleCycleChange` updates both `selectedCycleId` state and `form.setValue('billing_cycle_id', ...)`
- `handleSelectTier` uses `selectedCycleId` instead of `isAnnual`

## Fix 5: Refactor getEffectivePrice
- Derive `cycleDiscount` from the selected cycle's `discount_percentage`
- Apply: `base * (1 - cycleDiscount/100) * (1 - subsidizedPct/100)`
- No more hardcoded `annualDiscount` constant

## Fix 6: Price Breakdown
When discounts active, show stacked breakdown on each tier card:
```text
$299/mo base (strikethrough)
-17% Annual billing
-30% subsidized discount
= $171/mo effective
```

## Fix 7: Membership Discount Note
Replace static "per-challenge fees apply" with dynamic text showing membership discount when selected (e.g., "10% off with Annual Membership") using `calculateMembershipDiscount` from membershipService.

## Fix 8: Enterprise Card Text
- Title: "Custom Pricing" (larger)
- Subtitle: "Negotiated per Enterprise Agreement"
- Footer: "Custom contract -- pricing negotiated per agreement"

## Files Modified

| File | Changes |
|------|---------|
| `src/components/registration/PlanSelectionForm.tsx` | Complete rewrite with all 8 fixes |
| Database | DELETE Enterprise pricing rows |

## Technical Details

### Imports Changed
- Added: `useEffect` from React, `calculateMembershipDiscount` from membershipService
- Removed: `Switch` from ui/switch

### Hook Order (React Rules Compliance)
1. `useState` (selectedCycleId)
2. Context + navigation (useRegistrationContext, useNavigate)
3. `useForm`
4. All `useQuery`/`useMutation` hooks
5. `useEffect` (cycle initialization)
6. Derived values and event handlers
7. Conditional return (loading skeleton) -- AFTER all hooks
8. Render

### Price Calculation
```text
selectedCycle = billingCycles.find(c => c.id === selectedCycleId)
cycleDiscount = selectedCycle.discount_percentage ?? 0

getEffectivePrice(tierId):
  base = tp.local_price ?? tp.monthly_price_usd
  price = base * (1 - cycleDiscount / 100)
  price = price * (1 - subsidizedPct / 100)
  return price
```

