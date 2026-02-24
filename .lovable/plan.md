

# Fix: Order Summary Not Reflecting Selected Plans

## Root Cause

There are **two distinct problems** causing the Order Summary to show no data:

### Problem 1: Session Data Lost (the "Session Data Not Found" guard fires)
The user completed Steps 1-4 **before** the sessionStorage persistence code was deployed. Their in-memory state was wiped when the code hot-reloaded to apply the persistence fix. Now `state.organizationId`, `state.step4`, and `state.step1` are all undefined.

**This is a one-time issue** — going forward, the persistence works. But right now the user cannot reach the billing form at all because the guard blocks them.

### Problem 2: BillingForm has no pricing fallback
Even when `state.step1` IS available, the `BillingForm` only calls `useTierPricingForCountry(state.step1?.hq_country_id)` on line 126. If `state.step1` is missing (or the country has no pricing rows), `baseMonthly` = 0 and the Order Summary shows $0.00 everywhere. Unlike the `PlanSelectionForm` which was fixed to use `useAllTierPricing` as a fallback, the `BillingForm` never got that same fallback.

## Fix Plan

### Part 1: Rehydrate Context from Database (BillingForm)

Instead of just showing "Session Data Not Found" and forcing the user back to Step 1, the `BillingForm` should attempt to **reload the organization's data from the database** when context is missing but the user has a valid session.

Add a new hook `useRehydrateRegistration` that:
1. Checks if `state.organizationId` is missing
2. Queries `seeker_organizations` using the authenticated user's ID to find their org
3. If found, dispatches `setOrgId`, `setStep1Data` (country, name), and `setStep4Data` (from the latest draft subscription or the org's `registration_step`)
4. This removes the hard blocker — the user can proceed

**File: `src/hooks/queries/useRehydrateRegistration.ts`** (new file)

This hook will:
- Query `seeker_organizations` filtered by `created_by = auth.uid()` and `registration_step >= 4`
- Fetch the org's `hq_country_id`, `legal_entity_name`, `tenant_id`
- Query `seeker_subscriptions` for the org to get `tier_id`, `billing_cycle_id`, `engagement_model_id`
- If no subscription exists yet (Step 4 saved to context only), query the org's `registration_step` to confirm they reached Step 4
- Populate the context with the recovered data

### Part 2: Add Pricing Fallback to BillingForm

**File: `src/components/registration/BillingForm.tsx`**

Add the same fallback pattern used in `PlanSelectionForm`:
- Import and call `useAllTierPricing()` alongside `useTierPricingForCountry`
- If country-specific pricing is empty, fall back to USD rows from `useAllTierPricing`
- This ensures Order Summary shows real prices even if the country data is temporarily unavailable

Changes:
```text
Line 126: const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
Add:      const { data: allPricing } = useAllTierPricing();

Line 144: const pricingArray = Array.isArray(pricing) ? pricing : [];
Change to: Build pricingArray with fallback (same dedup pattern as PlanSelectionForm)
```

### Part 3: Update the Missing Data Guard

**File: `src/components/registration/BillingForm.tsx`**

Change the guard (lines 251-269) to:
1. First, attempt rehydration via the new hook
2. Show a loading state while rehydrating ("Restoring your session...")
3. Only show the "Session Data Not Found" card if rehydration fails (no org found for this user)

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/queries/useRehydrateRegistration.ts` | New hook: queries DB to restore org + plan data into context |
| `src/components/registration/BillingForm.tsx` | (1) Call rehydration hook, (2) add `useAllTierPricing` fallback for pricing, (3) update guard to show loading during rehydration |
| `src/hooks/queries/usePlanSelectionData.ts` | No change needed -- `useAllTierPricing` already exists |

### Edge Cases

- **User not authenticated**: Rehydration query returns nothing, guard shows "Return to Step 1"
- **Multiple orgs for same user**: Query uses `order by created_at desc limit 1` to get the most recent
- **Org exists but no subscription yet**: Step 4 data saved to context only -- rehydrate from context's `step4` if available, otherwise show guard
- **Country pricing missing**: Falls back to USD via `useAllTierPricing`
- **Future sessions**: Persistence works normally, rehydration is only needed as a recovery mechanism

