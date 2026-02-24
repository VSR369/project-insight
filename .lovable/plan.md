

# Fix Plan: Plan Selection — 5-WHY Root Cause Resolution

## 5-WHY Analysis Summary

| # | Why? | Answer |
|---|------|--------|
| 1 | Why do Basic/Standard/Premium show "Contact us"? | `getEffectivePrice()` returns `null` |
| 2 | Why does it return null? | `pricingArray` is empty (no pricing rows found) |
| 3 | Why is pricingArray empty? | `useTierPricingForCountry(state.step1?.hq_country_id)` called with `undefined` |
| 4 | Why is `hq_country_id` undefined? | Registration context is in-memory (`useReducer`). Direct navigation to Step 4 or page refresh loses Step 1 data |
| 5 | Why is there no fallback? | Code shows "Contact us" whenever pricing is null -- zero fallback logic exists |

**Membership invisible:** Line 649 requires `watchedTierId` (a tier must be selected first). Since all tiers say "Contact us", users never select one, so the membership section never renders.

## Three Fixes Required (All in PlanSelectionForm.tsx)

### Fix A: Fallback Pricing When Country Is Missing

**Problem:** `useTierPricingForCountry` is `enabled: !!countryId` -- returns `[]` when no country.

**Solution:** Add a second query that fetches ALL pricing rows (no country filter) as a fallback. Use USD `monthly_price_usd` from any row when country-specific pricing is unavailable.

```text
Logic:
  countryPricing = useTierPricingForCountry(state.step1?.hq_country_id)  // existing
  allPricing = useAllTierPricing()  // NEW fallback query

  pricingArray = countryPricing has data ? countryPricing : deduplicated fallback from allPricing
```

A new hook `useAllTierPricing` will be added to `usePlanSelectionData.ts`:
- Fetches `md_tier_country_pricing` with no country filter
- Groups by `tier_id`, takes first row per tier (USD preferred)
- Only used when country-specific pricing returns empty

In `PlanSelectionForm.tsx`, the derived `pricingArray` becomes:
```text
if countryPricing has rows -> use countryPricing (existing behavior)
else -> build fallback array from allPricing, using monthly_price_usd, currency='USD', symbol='$'
```

This ensures every non-enterprise tier ALWAYS shows a price.

### Fix B: Show Membership Section Without Requiring Tier Selection

**Problem:** Line 649 condition: `watchedTierId && !isEnterpriseTier && ...`

**Solution:** Remove the `watchedTierId` gate. Membership selection is independent of tier choice -- users should see it and select a membership before or after choosing a tier.

New condition:
```text
!isEnterpriseTier && !isInternalDept && membershipTiers?.length > 0
```

But `isEnterpriseTier` depends on `selectedTier` which is null when no tier is selected. So the condition simplifies to:
```text
!isInternalDept && membershipTiers?.length > 0 && !selectedTier?.is_enterprise
```

### Fix C: Allow Tier Selection Even Without Country Pricing

**Problem:** The "Select {tier}" button works fine, but users don't click it because they see "Contact us" instead of a price, making them think the tier isn't available.

**Solution:** This is fully solved by Fix A -- once prices show, users will click "Select" naturally.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/queries/usePlanSelectionData.ts` | Add `useAllTierPricing()` fallback hook |
| `src/components/registration/PlanSelectionForm.tsx` | Use fallback pricing array; remove `watchedTierId` gate on membership section |

## Technical Details

### New Hook: useAllTierPricing

```text
Location: src/hooks/queries/usePlanSelectionData.ts

Query: SELECT id, tier_id, monthly_price_usd, local_price, currency_code
       FROM md_tier_country_pricing
       WHERE is_active = true

Purpose: Fallback when hq_country_id is not set
Cache: Same MASTER_CACHE (5min stale, 30min gc)
```

### PlanSelectionForm.tsx Changes

1. Import `useAllTierPricing` from hooks
2. Call `useAllTierPricing()` hook (placed with other query hooks, before useEffect)
3. Derive `pricingArray`:
   - If `pricing` (country-specific) has rows, use it
   - Else deduplicate `allPricing` by tier_id (prefer USD rows), map to same shape using `monthly_price_usd`
   - When using fallback, set `currencySymbol = '$'` (USD default)
4. Line 649: Change membership condition from `watchedTierId && !isEnterpriseTier && ...` to `!isInternalDept && membershipTiers?.length > 0 && !(selectedTier?.is_enterprise)`

### Hook Order (unchanged, compliant)
1. useState
2. useRegistrationContext, useNavigate
3. useForm
4. All useQuery hooks (including new useAllTierPricing)
5. useEffect
6. Derived values + handlers
7. Conditional return
8. Render

