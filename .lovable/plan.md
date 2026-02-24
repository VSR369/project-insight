

## Analysis

The Registration Preview page currently shows **raw IDs** instead of resolved display names for Steps 4 and 5. Specifically:

**Step 4 (Plan Selection) — Missing:**
- Tier name (only `estimated_challenges_per_month: 0` is shown)
- Billing cycle name
- Engagement model name
- Membership tier name
- Full order summary (base price, discounts, due today)

**Step 5 (Billing) — Missing:**
- Country and state names (raw IDs stored)
- Payment method label (raw code like `credit_card`)

**Step 1 (Organization) — Missing:**
- Organization type name, country name, state name, industry names (all stored as IDs)

## Root Cause

The preview page reads `state.step4.tier_id`, `state.step4.billing_cycle_id`, etc. but never queries the database to resolve these IDs into human-readable names. The BillingForm already has all this resolution logic in its order summary sidebar — but the preview page doesn't use any query hooks.

## Implementation Plan

### Change 1: Rewrite `src/pages/registration/RegistrationPreviewPage.tsx`

Add query hooks to resolve all IDs to display names, and add a full Order Summary card:

**Hooks to add:**
- `useSubscriptionTiers()` — resolve `tier_id` → tier name/code
- `useBillingCycles()` — resolve `billing_cycle_id` → cycle name
- `useEngagementModels()` — resolve `engagement_model_id` → model name
- `useMembershipTiers()` — resolve `membership_tier_id` → membership name, fee, discount
- `useTierPricingForCountry()` + `useAllTierPricing()` — get base price for the tier
- `useCountries()` — resolve `hq_country_id`, `billing_country_id`
- `useOrganizationTypes()` — resolve `organization_type_id`
- `useStatesForCountry()` — resolve `state_province_id`

**New sections:**

1. **Step 1 card** — Add resolved country, state, org type names
2. **Step 3 card** — Add resolved export control status and data residency names
3. **Step 4 card** — Show tier name, billing cycle, engagement model, membership tier with full pricing breakdown
4. **Step 5 card** — Show resolved payment method label, country/state names
5. **Order Summary card** — Replicate the BillingForm's order summary: base price, cycle discount, subsidized discount, membership fee, due today total

**Pricing computation** (same as BillingForm lines 149-183):
- Build `pricingArray` with country fallback to USD
- Calculate `baseMonthly`, `cycleDiscount`, `subsidizedPct`, `effectiveMonthly`, `membershipFee`, `dueToday`
- Display with currency symbol from `localeInfo`

**Loading state:** Show skeleton while any query is loading.

No other files need changes. The preview page is self-contained — it reads from context and resolves via queries.

