

# Implementation Plan: Fix All Plan Selection Problems

## Overview
Eight fixes to `PlanSelectionForm.tsx` plus one database cleanup. All changes are concrete and ready to implement.

## Fix 1: Database -- Remove Enterprise Pricing Rows
Delete the incorrectly seeded fixed-price rows for the Enterprise tier from `md_tier_country_pricing`. Enterprise pricing is negotiated per agreement, not a rate card.

## Fix 2: Dynamic Currency Symbol (Lines 391, 402)
Add a derived `currencySymbol` variable and replace all hardcoded `$`:
- Line 160 area: add `const currencySymbol = state.localeInfo?.currency_symbol || '$';`
- Line 391: `${currencySymbol}${Math.round(price).toLocaleString()}`
- Line 402: `${currencySymbol}${Math.round(basePrice).toLocaleString()}/mo`

## Fix 3: Replace Binary Toggle with 3-Option Billing Cycle Selector (Lines 114, 318-331)
- Remove `const [isAnnual, setIsAnnual] = useState(false);` (line 114)
- Add `const [selectedCycleId, setSelectedCycleId] = useState(state.step4?.billing_cycle_id || '');`
- Add a `useEffect` to initialize `selectedCycleId` to the monthly cycle ID when billing cycles load (if not already set from saved state)
- Replace the Switch toggle (lines 318-331) with a segmented button group rendering all `billingCycles` entries as styled buttons with discount badges

## Fix 4: Sync Billing Cycle ID (Lines 200-207)
- The new cycle selector always calls `form.setValue('billing_cycle_id', cycleId)` on click
- Update `handleSelectTier` to use `selectedCycleId` instead of the removed `isAnnual` boolean

## Fix 5: Refactor getEffectivePrice (Lines 162-175)
- Remove `annualDiscount` constant and `isAnnual` references
- Derive `selectedCycle` and `cycleDiscount` from `selectedCycleId`
- Apply: `price = base * (1 - cycleDiscount / 100)`, then subsidized discount

## Fix 6: Add Price Breakdown on Tier Cards (After line 410)
When cycle discount > 0 or subsidized discount > 0, show a compact stacked breakdown:
```
{symbol}{base}/mo base
-{cycleDiscount}% {cycleName} billing
-{subsidizedPct}% subsidized discount
= {symbol}{final}/mo effective
```

## Fix 7: Membership Discount Note (Lines 451-453)
Replace generic text with dynamic note based on whether a membership tier is selected. Show the membership discount percentage when applicable.

## Fix 8: Enterprise Card Text (Lines 498, 522-524)
- Line 498: "Tailored to your needs" becomes "Negotiated per Enterprise Agreement"
- Lines 522-524: "Custom contract & pricing" becomes "Custom contract -- pricing negotiated per agreement"

## Files Modified

| File | What |
|------|------|
| Database migration | DELETE Enterprise rows from `md_tier_country_pricing` |
| `src/components/registration/PlanSelectionForm.tsx` | All 8 UI/logic fixes |

## Technical Notes
- No new dependencies needed
- No changes to hooks, services, types, or validation schemas
- The `Switch` import can be removed after replacing with the segmented button group
- All billing cycle data is already fetched by `useBillingCycles()` hook

