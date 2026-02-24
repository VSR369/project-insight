

# Fix All Plan Selection Problems — Complete Implementation

## Overview
All 8 fixes to the Plan Selection page, covering database cleanup, dynamic currency, billing cycle selector, price breakdown, membership notes, and Enterprise card corrections.

## Fix 1: Database — Remove Enterprise Pricing Rows

Run a SQL migration to delete the 4 incorrectly seeded fixed-price rows for the Enterprise tier:

```sql
DELETE FROM public.md_tier_country_pricing 
WHERE tier_id = '7bf7f040-5d05-4c75-b26c-182cb4113c62';
```

These rows ($999 USD, 799 GBP, 49999 INR, 4999 BRL) are architecturally wrong — Enterprise pricing is negotiated per agreement.

## Fix 2: Dynamic Currency Symbol

Add a derived `currencySymbol` variable using `state.localeInfo?.currency_symbol` and replace all hardcoded `$` in price displays (effective price, strikethrough, breakdown, shadow pricing).

## Fix 3: Replace Binary Toggle with 3-Option Billing Cycle Selector

- Remove `isAnnual` useState and the `Switch` component
- Add `selectedCycleId` useState, initialized from saved state or monthly default
- Add `useEffect` to initialize the cycle ID when billing cycles load
- Render a segmented button group showing all DB-driven cycles (Monthly, Quarterly 8%, Annual 17%) with discount badges

## Fix 4: Sync Billing Cycle ID

- New `handleCycleChange` function that updates both `selectedCycleId` state AND `form.setValue('billing_cycle_id', ...)`
- `handleSelectTier` uses `selectedCycleId` instead of `isAnnual` boolean

## Fix 5: Refactor `getEffectivePrice`

- Derive `selectedCycle` and `cycleDiscount` from `selectedCycleId`
- Apply: `price = base * (1 - cycleDiscount / 100)`, then `* (1 - subsidizedPct / 100)`
- No more hardcoded `annualDiscount` constant

## Fix 6: Transparent Price Breakdown

When cycle discount > 0 or subsidized discount > 0, show a compact stacked breakdown on each tier card:
```
$299/mo base
-17% annual billing
-30% NGO subsidy
= $171/mo effective
```

## Fix 7: Membership Discount Note

Replace generic "per-challenge fees apply" with dynamic text that shows the membership discount percentage when a membership is selected (e.g., "10% off with Annual Membership").

## Fix 8: Enterprise Card Text

- Price display: "Custom Pricing" (larger text)
- Subtitle: "Negotiated per Enterprise Agreement"
- Footer: "Custom contract -- pricing negotiated per agreement"

## Files Modified

| File | What |
|------|------|
| Database migration | DELETE 4 Enterprise rows from `md_tier_country_pricing` |
| `src/components/registration/PlanSelectionForm.tsx` | All 8 UI/logic fixes |

## Technical Details

### Key State Changes
- `isAnnual` boolean removed, replaced with `selectedCycleId` string
- `Switch` import removed (no longer needed)
- `useEffect` added to initialize billing cycle from saved state or default to monthly
- `handleCycleChange` added to keep form and state in sync

### Price Calculation Logic (After Fix)
```typescript
const selectedCycle = billingCycles?.find(c => c.id === selectedCycleId);
const cycleDiscount = selectedCycle?.discount_percentage ?? 0;

const getEffectivePrice = (tierId) => {
  const base = tp.local_price ?? tp.monthly_price_usd ?? 0;
  let price = base;
  if (cycleDiscount > 0) price = price * (1 - cycleDiscount / 100);
  if (subsidizedPct > 0) price = price * (1 - subsidizedPct / 100);
  return price;
};
```

### Billing Cycle Selector UI
Segmented button group rendered from `billingCycles` array with active state styling and discount badges for cycles with `discount_percentage > 0`.

### Hook Order Compliance
All hooks (useState, useForm, useQuery, useEffect) are called before any conditional returns, per React Rules of Hooks.

