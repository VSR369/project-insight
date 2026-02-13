

# Add Pricing and Configuration Summary Page to Admin

## Problem

There is currently no place in the admin panel where you can see a consolidated view of how subscription tiers, engagement models, pricing, fees, discounts, and features all connect together. Each configuration is managed on its own separate page, but there is no summary screen that shows the complete picture -- for example: "Basic tier gets Marketplace only at $199/month, with 10% membership discount for annual members, and Simple/Moderate/Complex fee multipliers of 1x/1.5x/2x."

## What Will Be Built

A new **"Pricing Overview"** page at `/admin/seeker-config/pricing-overview` that displays a read-only, consolidated summary of all pricing and configuration relationships across these 8 tables:

### Section 1: Tier Comparison Matrix

A side-by-side card layout showing each subscription tier (Basic, Standard, Premium) with:
- Tier name, code, description
- Max challenges and max users limits
- Enterprise flag

### Section 2: Engagement Model Access per Tier

A matrix/grid showing which engagement models (Marketplace, Aggregator) are available for each tier:

```
                  | Basic      | Standard   | Premium    |
Marketplace       | Included   | Included   | Included   |
Aggregator        | Not Avail  | Included   | Included   |
```

### Section 3: Tier Pricing by Country

A table showing subscription pricing per country per tier:

```
Country | Currency | Basic  | Standard | Premium |
USA     | USD      | $199   | $299     | $399    |
UK      | GBP      | £159   | £239     | £319    |
India   | INR      | ₹9,999 | ₹14,999  | ₹19,999 |
Brazil  | BRL      | R$999  | R$1,499  | R$1,999 |
```

### Section 4: Billing Cycle Discounts

A simple table showing billing cycle options and their discounts:
- Monthly: 0% discount
- Quarterly: 8% discount
- Annual: 17% discount

### Section 5: Challenge Fee Multipliers (Complexity)

A table showing how challenge complexity affects fees:
- Simple: 1.0x consulting, 1.0x management
- Moderate: 1.5x consulting, 1.25x management
- Complex: 2.0x consulting, 1.5x management

### Section 6: Membership Tier Discounts

Shows membership tiers and their benefits:
- Annual (12 months): 10% fee discount, 8% commission
- Multi-Year (24 months): 15% fee discount, 7% commission

### Section 7: Shadow Pricing (Internal)

Shows per-tier internal shadow charges:
- Basic: ₹100/challenge
- Standard: ₹75/challenge
- Premium: ₹0/challenge

### Section 8: Tier Features Checklist

A feature comparison matrix showing included/not-available features per tier (Marketplace Access, Aggregator Access, Account Manager, Analytics, API, etc.)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/admin/pricing-overview/PricingOverviewPage.tsx` | **New** -- Read-only summary dashboard |
| `src/pages/admin/pricing-overview/index.ts` | **New** -- Barrel export |
| `src/components/admin/AdminSidebar.tsx` | **Modify** -- Add "Pricing Overview" as first item in Seeker Config group |
| `src/App.tsx` | **Modify** -- Add lazy-loaded route |

## Technical Details

- This is a **read-only** page -- no create/edit/delete operations
- Reuses existing query hooks from `usePlanSelectionData.ts` (`useSubscriptionTiers`, `useTierFeatures`, `useTierPricingForCountry`, `useBillingCycles`, `useEngagementModels`, `useTierEngagementAccess`, `useShadowPricing`) plus `useMembershipTiers` and a new hook for challenge complexity
- Country names resolved by joining `md_tier_country_pricing` with `countries` table
- Uses Card components for sections, Table components for matrices
- Responsive: stacks vertically on mobile, grid layout on desktop
- Icon: `BarChart3` or `LayoutGrid` from lucide-react
- Positioned as the first item in the "Seeker Config" sidebar group for quick access

## Sidebar Change

```
Seeker Config
  - Pricing Overview            << NEW (first item)
  - Subscription Tiers
  - Membership Tiers
  - Engagement Models
  - Challenge Complexity
  - Base Fee Config
  - Shadow Pricing
  - Challenge Statuses
  - Export Control
  - Data Residency
  - Blocked Domains
  - Platform Terms
```

