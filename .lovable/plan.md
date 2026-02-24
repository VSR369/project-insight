

# Fix All Plan Selection Problems: Pricing, Currency, Billing Cycles, Discounts, and Enterprise

## Problems Summary

| # | Problem | Root Cause |
|---|---------|-----------|
| 1 | Currency hardcoded as `$` | Line 391/402: `${Math.round(price)}` ignores `localeInfo.currency_symbol` |
| 2 | Quarterly billing cycle (8% discount) missing | Binary `Switch` toggle only supports Monthly/Annual; Quarterly is invisible |
| 3 | Billing cycle ID desyncs when toggling after tier selection | Toggle updates `isAnnual` state but does not update `form.billing_cycle_id` |
| 4 | No price breakdown showing discount stacking | Only a small badge for subsidized %; users cannot see Base -> Cycle discount -> Subsidized -> Final |
| 5 | Membership impact not shown on tier cards | Generic "per-challenge fees apply" note; no mention of membership discount effect |
| 6 | Enterprise card wrongly has fixed pricing data seeded | Incorrectly inserted $999/mo rows in `md_tier_country_pricing`; Enterprise pricing is fully negotiated per agreement, not "starting from" |

## Fixes

### Fix 1: Remove Enterprise Pricing Seed Data (Database Migration)

**Why:** Enterprise pricing is negotiated per Enterprise Agreement, not a fixed rate card. The seed data we inserted is architecturally wrong.

**Action:** Create a migration that deletes the 4 Enterprise pricing rows from `md_tier_country_pricing` where `tier_id = '7bf7f040-5d05-4c75-b26c-182cb4113c62'`.

The Enterprise card will correctly show "Custom Pricing" with "Negotiated per Enterprise Agreement" and the "Contact Sales" CTA -- no price figures displayed.

### Fix 2: Dynamic Currency Symbol (PlanSelectionForm.tsx)

Replace all hardcoded `$` with a derived currency symbol:

```typescript
const currencySymbol = state.localeInfo?.currency_symbol || pricingArray[0]?.currency_symbol || '$';
```

Apply in:
- Tier card effective price (line 391)
- Strikethrough base price (line 402)
- Shadow pricing note (line 587)

### Fix 3: Replace Binary Toggle with 3-Option Billing Cycle Selector (PlanSelectionForm.tsx)

Replace the `Switch` component with a segmented button group showing all 3 database-driven cycles:

```text
[ Monthly ] [ Quarterly  Save 8% ] [ Annual  Save 17% ]
```

**Changes:**
- Remove `isAnnual` useState; replace with `selectedCycleId` useState initialized from `state.step4?.billing_cycle_id` or the monthly cycle ID
- Render all `billingCycles` as styled buttons
- Show discount badge on Quarterly and Annual options
- On cycle selection, immediately update `form.setValue('billing_cycle_id', cycleId)`

### Fix 4: Sync Billing Cycle ID on Every Change (PlanSelectionForm.tsx)

Currently `handleSelectTier` sets the cycle ID, but toggling the cycle after tier selection does not. The new cycle selector from Fix 3 will always call `form.setValue('billing_cycle_id', ...)` on every change, eliminating the desync.

### Fix 5: Add Transparent Price Breakdown (PlanSelectionForm.tsx)

When discounts apply (billing cycle discount > 0 or subsidized discount > 0), show a compact breakdown below the effective price on each tier card:

```text
$299/mo base
-17% annual billing
-30% NGO subsidy
= $171/mo effective
```

This implements the documented stacking order: Base Price -> Billing Cycle Discount -> Subsidized Discount -> Final.

Only shown when at least one discount is active (monthly cycle with no subsidy shows just the price, no breakdown).

### Fix 6: Membership Discount Note on Tier Cards (PlanSelectionForm.tsx)

Replace the generic "+ per-challenge fees apply" text with a dynamic note:
- No membership selected: `"+ per-challenge fees apply"`
- Membership selected: `"+ per-challenge fees apply (10% off with Annual Membership)"` (percentage from `calculateMembershipDiscount`)

### Fix 7: Enterprise Card Text Update (PlanSelectionForm.tsx)

Update the Enterprise card subtitle from "Tailored to your needs" to "Negotiated per Enterprise Agreement" and change the footer text from "Custom contract & pricing" to "Custom contract -- pricing negotiated per agreement" to accurately reflect the governance model.

### Fix 8: Update `getEffectivePrice` for Dynamic Cycle Discount (PlanSelectionForm.tsx)

Currently the function uses `isAnnual` boolean and hardcoded `annualDiscount`. Refactor to use the selected billing cycle's actual `discount_percentage`:

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

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| New migration SQL | DELETE Enterprise rows from `md_tier_country_pricing` |
| `src/components/registration/PlanSelectionForm.tsx` | Fixes 2-8: currency symbol, billing cycle selector, price breakdown, membership note, Enterprise text, effective price calc |

### No Changes Needed

| File | Reason |
|------|--------|
| `src/components/registration/MembershipTierSelector.tsx` | Already correct -- displays fee/commission discounts properly |
| `src/services/membershipService.ts` | Already correct -- `calculateMembershipDiscount` works as designed |
| `src/types/registration.ts` | Already has `membership_tier_id` field |
| `src/lib/validations/planSelection.ts` | Already has `membership_tier_id` as optional |
| `src/hooks/queries/usePlanSelectionData.ts` | All hooks are correct and fetch the right data |

### Data Flow After Fix

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

