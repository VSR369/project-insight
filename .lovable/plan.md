

# Redesign: Engagement Model-Centric Pricing Overview with Platform Fees

## Summary of Changes

Three things need to happen:

1. **Database**: Create a new `md_platform_fees` table and add `engagement_model_id` to `md_challenge_base_fees`. Update Aggregator + Basic tier access to "included".
2. **Admin UI**: Add a Platform Fees admin page for managing the new table.
3. **Pricing Overview**: Rewrite the page with engagement-model tabs and self-contained tier cards.

---

## Part 1: Database Changes

### 1A. New table: `md_platform_fees`

Stores the platform usage fee percentage per engagement model and tier combination.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| engagement_model_id | UUID FK | References md_engagement_models |
| tier_id | UUID FK | References md_subscription_tiers |
| platform_fee_pct | NUMERIC(5,2) NOT NULL | % of award/fee paid to provider |
| description | TEXT | Optional explanation |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at, created_by, updated_by | Standard audit fields | |
| UNIQUE(engagement_model_id, tier_id) | | One fee per model+tier combo |

RLS: Platform admin only (read/write).

### 1B. Add `engagement_model_id` to `md_challenge_base_fees`

- Add nullable column `engagement_model_id UUID REFERENCES md_engagement_models(id)`
- This allows base fees to be configured per engagement model
- Marketplace rows will have consulting + management fees
- Aggregator rows will have these as NULL or 0 (fees not applicable)
- Update the existing UNIQUE constraint to include engagement_model_id

### 1C. Update Aggregator + Basic access

```sql
UPDATE md_tier_engagement_access
SET access_type = 'included'
WHERE tier_id = 'e3338419-...' AND engagement_model_id = '4321dce0-...';
```

---

## Part 2: Platform Fees Admin Page

A new CRUD admin page at `/admin/seeker-config/platform-fees` following the existing master data pattern (same as Base Fees page).

### Files

| File | Action |
|------|--------|
| `src/hooks/queries/usePlatformFees.ts` | **New** -- CRUD hooks for md_platform_fees |
| `src/pages/admin/platform-fees/PlatformFeesPage.tsx` | **New** -- Admin CRUD page |
| `src/pages/admin/platform-fees/index.ts` | **New** -- Barrel export |
| `src/components/admin/AdminSidebar.tsx` | **Modify** -- Add "Platform Fees" to Seeker Config group |
| `src/App.tsx` | **Modify** -- Add lazy route |

---

## Part 3: Pricing Overview Rewrite

### New Page Structure

```text
+--------------------------------------------------+
| Pricing & Configuration Overview                  |
+--------------------------------------------------+
| [Marketplace]  [Aggregator]  [Summary]            |
+--------------------------------------------------+

Tab: Marketplace
  +-- Basic Tier Card --------------------------+
  | OVERVIEW: Name, limits, enterprise flag     |
  | ACCESS: "Included" badge                    |
  | PLATFORM FEE: X% of award (from new table) |
  | SUBSCRIPTION: Country pricing table         |
  | CHALLENGE FEES:                             |
  |   Consulting Base Fee: per country          |
  |   Management Base Fee: per country          |
  | COMPLEXITY MULTIPLIERS: Simple/Mod/Complex  |
  | BILLING DISCOUNTS: Monthly/Quarterly/Annual |
  | MEMBERSHIP DISCOUNTS: Annual/Multi-Year     |
  | SHADOW PRICING: internal charge             |
  | FEATURES: checklist                         |
  +---------------------------------------------+
  +-- Standard Tier Card (same sections) -------+
  +-- Premium Tier Card (same sections) --------+

Tab: Aggregator
  +-- Basic Tier Card --------------------------+
  | OVERVIEW: Name, limits, enterprise flag     |
  | ACCESS: "Included" badge                    |
  | PLATFORM FEE: X% of award (from new table) |
  | SUBSCRIPTION: Country pricing table         |
  | CHALLENGE FEES: "Not Applicable"            |
  |   (Aggregator has no consulting/mgmt fees)  |
  | COMPLEXITY MULTIPLIERS: "Not Applicable"    |
  | BILLING DISCOUNTS: table                    |
  | MEMBERSHIP DISCOUNTS: table                 |
  | SHADOW PRICING: value                       |
  | FEATURES: checklist                         |
  +---------------------------------------------+
  +-- Standard Tier Card (same sections) -------+
  +-- Premium Tier Card (same sections) --------+

Tab: Summary
  Cross-tier/cross-model comparison matrices
```

### Key Differences Between Tabs

| Section | Marketplace | Aggregator |
|---------|-------------|------------|
| Platform Fee | Shown (% of award) | Shown (% of award) |
| Consulting Base Fee | Shown per country | "Not Applicable" label |
| Management Base Fee | Shown per country | "Not Applicable" label |
| Complexity Multipliers | Shown with calculated examples | "Not Applicable" label |
| Subscription Pricing | Shown per country | Shown per country |
| Billing/Membership/Shadow/Features | Same for both | Same for both |

### Visual Design

- Each tier card has a colored left border (Basic=blue, Standard=purple, Premium=amber)
- Cards are full-width and stacked vertically
- Sections within cards use `Collapsible` components -- key summary visible, details expandable
- "Not Applicable" sections show a muted badge with brief explanation
- Empty/unconfigured data shows "Not configured yet" with a link to the relevant admin page

### Files

| File | Action |
|------|--------|
| `src/pages/admin/pricing-overview/PricingOverviewPage.tsx` | **Rewrite** -- Tab-based engagement model layout |
| `src/hooks/queries/usePricingOverviewData.ts` | **Extend** -- Add hooks for platform fees and base fees with country joins |

### Data Hooks Used

All existing hooks reused plus:
- `usePlatformFees` (new) -- fetches from `md_platform_fees`
- `useBaseFees` (existing) -- already joins with countries and tiers
- Existing: `useSubscriptionTiers`, `useTierFeatures`, `useBillingCycles`, `useEngagementModels`, `useTierEngagementAccess`, `useShadowPricing`, `useMembershipTiers`, `useChallengeComplexityList`, `useAllTierCountryPricing`

---

## Part 4: Update Base Fees Admin Page

The existing Base Fees page (`src/pages/admin/base-fees/BaseFeesPage.tsx`) needs a minor update to show/manage the new `engagement_model_id` column -- adding a dropdown to select which engagement model the fee applies to.

| File | Action |
|------|--------|
| `src/pages/admin/base-fees/BaseFeesPage.tsx` | **Modify** -- Add engagement model selector |

---

## Execution Order

1. Database migration (new table + column + data update)
2. Create Platform Fees hooks and admin page
3. Update Base Fees page for engagement model column
4. Rewrite Pricing Overview page
5. Update sidebar and routes

