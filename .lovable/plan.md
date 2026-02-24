

# Fix All Plan Selection Problems: Pricing, Currency, Billing Cycles, Discounts, and Enterprise

## Problems Identified (Root Cause Analysis)

| # | Problem | Root Cause (File:Line) |
|---|---------|----------------------|
| 1 | Currency hardcoded as `$` | `PlanSelectionForm.tsx:391,402` — uses `$${Math.round(price)}` instead of `state.localeInfo?.currency_symbol` |
| 2 | Quarterly billing cycle (8% discount) invisible | `PlanSelectionForm.tsx:114,318-331` — binary `Switch` toggle only supports Monthly/Annual; the Quarterly cycle (DB row exists with 8% discount) has no UI |
| 3 | Billing cycle ID desyncs after tier selection | `PlanSelectionForm.tsx:200-207` — `handleSelectTier` sets `billing_cycle_id` based on toggle, but toggling the cycle afterward does NOT update the form field |
| 4 | No price breakdown showing discount stacking | `PlanSelectionForm.tsx:406-410` — only a small badge for subsidized %; no visible breakdown of Base -> Cycle Discount -> Subsidy -> Final |
| 5 | Membership impact not shown on tier cards | `PlanSelectionForm.tsx:451-453` — generic "per-challenge fees apply" text; no mention of selected membership discount |
| 6 | Enterprise card has incorrect fixed pricing rows in DB | `md_tier_country_pricing` has 4 rows for Enterprise tier (`7bf7f040-...`) with $999/mo — architecturally wrong since Enterprise pricing is negotiated per agreement |
| 7 | Enterprise card text is generic | `PlanSelectionForm.tsx:498,522-524` — "Tailored to your needs" and "Custom contract & pricing" don't reflect the Enterprise Agreement governance model |
| 8 | `getEffectivePrice` uses hardcoded annual discount | `PlanSelectionForm.tsx:165,172` — uses `isAnnual` boolean and `annualDiscount` constant instead of the selected cycle's actual `discount_percentage` |

## Database Verified

- **Billing Cycles**: Monthly (0%), Quarterly (8%), Annual (17%) -- all 3 exist and are active
- **Tier Pricing**: Basic ($199), Standard ($299), Premium ($399) with GBP/INR/BRL local prices -- correct
- **Enterprise Pricing**: 4 rows with $999/mo -- these must be deleted (Enterprise is negotiated)
- **`localeInfo.currency_symbol`**: Available in registration context, set during Step 1 country selection

## Fixes

### Fix 1: Database Migration -- Remove Enterprise Pricing Rows

Delete the 4 incorrectly seeded rows from `md_tier_country_pricing` where `tier_id = '7bf7f040-5d05-4c75-b26c-182cb4113c62'` (Enterprise tier).

Enterprise pricing is negotiated per Enterprise Agreement, not a fixed rate card. The card will correctly show "Custom Pricing" with no dollar amounts.

### Fix 2: Dynamic Currency Symbol

Replace all hardcoded `$` with a derived currency symbol:

```text
const currencySymbol = state.localeInfo?.currency_symbol || '$';
```

Applied at:
- Line 391: Tier card effective price
- Line 402: Strikethrough base price
- Line 587: Shadow pricing note (already uses `currency_code`, but symbol consistency)

### Fix 3: Replace Binary Toggle with 3-Option Billing Cycle Selector

Replace the `Switch` component (lines 318-331) with a segmented button group rendering all database-driven cycles:

```text
[ Monthly ] [ Quarterly -- Save 8% ] [ Annual -- Save 17% ]
```

Changes:
- Remove `isAnnual` useState (line 114)
- Add `selectedCycleId` useState, initialized from `state.step4?.billing_cycle_id` or the monthly cycle's ID
- Render `billingCycles` array as styled toggle buttons with discount badges
- On cycle click, update both `selectedCycleId` state and `form.setValue('billing_cycle_id', cycleId)`

### Fix 4: Sync Billing Cycle ID on Every Change

The new cycle selector from Fix 3 always calls `form.setValue('billing_cycle_id', ...)` on every click, eliminating the desync. The `handleSelectTier` function is also updated to use `selectedCycleId` instead of the removed `isAnnual` boolean.

### Fix 5: Refactor `getEffectivePrice` for Dynamic Cycle Discount

Replace the `isAnnual` boolean logic (line 172) with the selected cycle's actual `discount_percentage`:

```typescript
const selectedCycle = billingCycles?.find(c => c.id === selectedCycleId);
const cycleDiscount = selectedCycle?.discount_percentage ?? 0;

const getEffectivePrice = (tierId: string): number | null => {
  const tp = pricingArray.find(p => p.tier_id === tierId);
  if (!tp) return null;
  const base = tp.local_price ?? tp.monthly_price_usd ?? 0;
  let price = base * (1 - cycleDiscount / 100);
  if (subsidizedPct > 0) price = price * (1 - subsidizedPct / 100);
  return price;
};
```

### Fix 6: Transparent Price Breakdown on Tier Cards

When at least one discount is active (cycle discount > 0 or subsidized discount > 0), show a compact breakdown below the effective price:

```text
$299/mo base
-17% annual billing
-30% NGO subsidy
= $171/mo effective
```

Stacking order follows the documented rule: Base Price -> Billing Cycle Discount -> Subsidized Discount -> Final. Only displayed when discounts are active (monthly cycle with no subsidy shows just the price).

### Fix 7: Membership Discount Note on Tier Cards

Replace the generic "per-challenge fees apply" text (line 451-453) with a dynamic note:
- No membership selected: `"+ per-challenge fees apply"`
- Membership selected: `"+ per-challenge fees apply (10% off with Annual Membership)"` -- percentage from `calculateMembershipDiscount`

### Fix 8: Enterprise Card Text Update

- Line 496: Keep `"Custom"` as the price display (correct after removing DB rows)
- Line 498: Change `"Tailored to your needs"` to `"Negotiated per Enterprise Agreement"`
- Line 522-524: Change `"Custom contract & pricing"` to `"Custom contract -- pricing negotiated per agreement"`

## Files Modified

| File | Changes |
|------|---------|
| New migration SQL | DELETE 4 Enterprise rows from `md_tier_country_pricing` |
| `src/components/registration/PlanSelectionForm.tsx` | All 8 fixes: currency symbol, billing cycle selector, price breakdown, membership note, Enterprise text, effective price calc, cycle sync |

## Files NOT Changed (Verified Correct)

| File | Reason |
|------|--------|
| `MembershipTierSelector.tsx` | Already correctly displays fee/commission discounts |
| `membershipService.ts` | `calculateMembershipDiscount` works as designed |
| `usePlanSelectionData.ts` | All hooks fetch correct data |
| `planSelection.ts` (validation) | Schema already has all required fields |
| `registration.ts` (types) | Already has `membership_tier_id` field |

## Data Flow After Fix

```text
Billing Cycles DB:  Monthly (0%) | Quarterly (8%) | Annual (17%)
                         |
         User picks cycle via segmented selector
                         |
         form.billing_cycle_id = selectedCycle.id  (always synced)
                         |
         getEffectivePrice() uses selectedCycle.discount_percentage
                         |
         Price breakdown shows: Base -> Cycle % -> Subsidy % -> Final
                         |
         Membership note shows fee discount if membership selected
                         |
         Enterprise card: "Custom Pricing" (no amount), "Contact Sales"
```

