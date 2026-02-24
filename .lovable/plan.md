

# Fix All Plan Selection Problems — Implementation Plan

## Root Cause of Previous Failures
The implementation kept getting stuck in a loop of proposing database migrations that required separate approval clicks. This time, the database fix (Fix 1) will be presented as a simple SQL statement for you to run manually, and all 7 code fixes will be applied in a single file write.

## Fix 1: Database — Remove Enterprise Pricing Rows
You will need to run this SQL in your Supabase SQL Editor:
```sql
DELETE FROM public.md_tier_country_pricing 
WHERE tier_id = '7bf7f040-5d05-4c75-b26c-182cb4113c62';
```

## Fixes 2-8: PlanSelectionForm.tsx (Single File Rewrite)

All changes are in `src/components/registration/PlanSelectionForm.tsx`:

### Fix 2: Dynamic Currency Symbol
- Add `const currencySymbol = state.localeInfo?.currency_symbol || '$';`
- Replace all hardcoded `$` with `currencySymbol` in price displays

### Fix 3: 3-Option Billing Cycle Selector
- Remove `isAnnual` useState, remove `Switch` import
- Add `selectedCycleId` useState initialized from saved state
- Add `useEffect` to default to monthly cycle when data loads
- Render segmented button group from `billingCycles` array with discount badges

### Fix 4: Sync Billing Cycle ID
- `handleCycleChange` updates both state and form value
- `handleSelectTier` uses `selectedCycleId` instead of `isAnnual`

### Fix 5: Refactor getEffectivePrice
- Derive `cycleDiscount` from `selectedCycleId` lookup
- Apply: `base * (1 - cycleDiscount/100) * (1 - subsidizedPct/100)`
- Remove hardcoded `annualDiscount` constant

### Fix 6: Price Breakdown
- When discounts are active, show stacked breakdown:
  - `{symbol}{base}/mo base`
  - `-{cycleDiscount}% {cycleName}`
  - `-{subsidizedPct}% subsidized`
  - `= {symbol}{final}/mo effective`

### Fix 7: Membership Discount Note
- Replace "per-challenge fees apply" with dynamic text
- When membership selected: show "({feeDiscountPct}% off with {membershipName})"
- Uses `calculateMembershipDiscount` from membershipService

### Fix 8: Enterprise Card Text
- Subtitle: "Negotiated per Enterprise Agreement"
- Footer: "Custom contract -- pricing negotiated per agreement"

## Files Modified

| File | Changes |
|------|---------|
| `src/components/registration/PlanSelectionForm.tsx` | All 7 code fixes (Fixes 2-8) |
| Database (manual SQL) | DELETE Enterprise pricing rows |

## Hook Order Compliance
All hooks called before conditional returns:
1. `useState` (selectedCycleId)
2. Context + navigation
3. `useForm`
4. All `useQuery`/`useMutation` hooks
5. `useEffect` (cycle initialization)
6. Conditional return (loading skeleton)
7. Event handlers
8. Render
