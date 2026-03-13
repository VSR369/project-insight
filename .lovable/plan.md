

# Wire Resolved Shadow Pricing Into Billing Flows

## Problem
`useResolvedShadowPricing(orgId)` exists but is never called. All consumers still use `useShadowPricing()` which only reads platform defaults from `md_shadow_pricing`. Org overrides saved to `org_shadow_pricing` are ignored during billing.

## Changes

### 1. `src/components/registration/PlanSelectionForm.tsx`
Replace `useShadowPricing()` with `useResolvedShadowPricing(orgId)`. The org ID is available from `state.step2` (organization created in step 2). During initial registration where no org exists yet, passing `undefined` returns platform defaults — same behavior as today.

### 2. `src/pages/admin/pricing-overview/PricingOverviewPage.tsx`
Replace `useShadowPricing()` with `useResolvedShadowPricing()` (no orgId — shows platform defaults, which is correct for the platform admin overview).

### 3. `src/hooks/queries/useBillingData.ts`
When creating a subscription (`useCreateSubscription`), resolve the shadow charge using the org's override if one exists. This requires:
- Import `supabase` query inline to check `org_shadow_pricing` for the org+tier+country combo before falling back to the payload value
- Or: ensure the calling component passes the already-resolved value (cleaner — push resolution to the UI layer)

**Recommended approach**: Keep resolution in the UI layer. The `PlanSelectionForm` and `BillingForm` already pass shadow pricing data into the subscription creation payload. If they consume `useResolvedShadowPricing(orgId)` instead of `useShadowPricing()`, the correct (org-overridden or platform-default) value flows through naturally.

### 4. `src/services/challengePricingService.ts` — `calculateShadowFee`
No change needed — it's a pure function that takes `shadowChargePerChallenge` as input. As long as callers pass the resolved value, it works correctly.

### 5. `src/services/membershipService.ts`
Check how `totalShadowCharges` is calculated. If it reads from `saas_agreements.shadow_charge_rate`, that's a per-agreement snapshot — no change needed. If it reads from `md_shadow_pricing` directly, update to use resolved pricing.

## Summary of file changes

| File | Change |
|---|---|
| `PlanSelectionForm.tsx` | `useShadowPricing()` → `useResolvedShadowPricing(orgId)` |
| `PricingOverviewPage.tsx` | `useShadowPricing()` → `useResolvedShadowPricing()` |
| `BillingForm.tsx` | Verify it passes resolved shadow data (likely no change if PlanSelectionForm feeds it via wizard state) |
| `useBillingData.ts` | No change (receives already-resolved values from UI) |

This is a focused wiring change — no new tables, no new hooks, just connecting the existing resolution logic to the consumers that need it.

