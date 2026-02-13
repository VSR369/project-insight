

# Add Missing Admin Config Pages: Membership Tiers, Base Fees, Shadow Pricing

## Root Cause

The database tables for membership, fee calculations, and discounts already exist (`md_membership_tiers`, `md_challenge_base_fees`, `md_shadow_pricing`), and services like `membershipService.ts` and `challengePricingService.ts` reference them. However, **no admin CRUD pages exist** to manage these configurations. They were never created -- only the org-facing consumption pages (MembershipPage, ChallengeCreatePage) were built.

The Seeker Config section in the Admin sidebar currently has 8 items but is missing these 3 critical configuration screens.

## What Will Be Built

Three new admin CRUD pages following the exact same pattern as existing pages like `SubscriptionTiersPage`, `ChallengeComplexityPage`, etc.

### 1. Membership Tiers Page (`/admin/seeker-config/membership-tiers`)

Manages the `md_membership_tiers` table. Fields:
- `code` (text, unique) -- e.g., "annual", "multi_year"
- `name` (text) -- display name
- `description` (text) -- tier description
- `duration_months` (number) -- membership duration
- `fee_discount_pct` (number) -- percentage discount on challenge fees
- `commission_rate_pct` (number) -- commission rate percentage
- `display_order` (number)
- `is_active` (boolean toggle)

### 2. Base Fee Configuration Page (`/admin/seeker-config/base-fees`)

Manages the `md_challenge_base_fees` table. Fields:
- `country_id` (select from countries)
- `tier_id` (select from subscription tiers)
- `consulting_base_fee` (number) -- base consulting fee
- `management_base_fee` (number) -- base management fee
- `currency_code` (text) -- e.g., "USD"
- `is_active` (boolean toggle)

### 3. Shadow Pricing Page (`/admin/seeker-config/shadow-pricing`)

Manages the `md_shadow_pricing` table. Fields:
- `tier_id` (select from subscription tiers)
- `shadow_charge_per_challenge` (number) -- charge per challenge
- `currency_code` (text)
- `currency_symbol` (text)
- `is_active` (boolean toggle)

## Files to Create/Modify

| # | File | Action |
|---|------|--------|
| 1 | `src/pages/admin/membership-tiers/MembershipTiersPage.tsx` | **New** -- CRUD page for `md_membership_tiers` |
| 2 | `src/pages/admin/membership-tiers/index.ts` | **New** -- barrel export |
| 3 | `src/pages/admin/base-fees/BaseFeesPage.tsx` | **New** -- CRUD page for `md_challenge_base_fees` |
| 4 | `src/pages/admin/base-fees/index.ts` | **New** -- barrel export |
| 5 | `src/pages/admin/shadow-pricing/ShadowPricingPage.tsx` | **New** -- CRUD page for `md_shadow_pricing` |
| 6 | `src/pages/admin/shadow-pricing/index.ts` | **New** -- barrel export |
| 7 | `src/components/admin/AdminSidebar.tsx` | **Modify** -- Add 3 new menu items to `seekerConfigItems` |
| 8 | `src/App.tsx` | **Modify** -- Add 3 lazy-loaded routes under `/admin/seeker-config/*` |

## Admin Sidebar Changes

The `seekerConfigItems` array will grow from 8 to 11 items, adding:

```
Seeker Config (existing group)
  - Subscription Tiers        (existing)
  - Membership Tiers           << NEW
  - Engagement Models          (existing)
  - Challenge Complexity       (existing)
  - Base Fee Config            << NEW
  - Shadow Pricing             << NEW
  - Challenge Statuses         (existing)
  - Export Control             (existing)
  - Data Residency             (existing)
  - Blocked Domains            (existing)
  - Platform Terms             (existing)
```

## Technical Details

- Each new page follows the exact CRUD pattern used by `SubscriptionTiersPage` and `ChallengeComplexityPage` (AdminLayout wrapper, data table, create/edit dialog with Zod validation)
- Routes use `AdminGuard` + `LazyRoute` wrappers, consistent with all other admin routes
- Icons: `Crown` for Membership Tiers, `DollarSign` for Base Fees, `Calculator` for Shadow Pricing
- No database migrations needed -- all three tables already exist

