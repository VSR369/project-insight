

# Fix: Challenge Base Fees -- Filter by Engagement Model

## Problem

The Challenge Base Fees summary table shows management fees as 0 because the code doesn't filter base fees by engagement model. The database has two rows per country+tier combination:
- **Marketplace**: has both consulting AND management fees (e.g., India Basic: consulting 20,000 / management 8,000)
- **Aggregator**: has consulting fees only, management = 0 (e.g., India Basic: consulting 14,000 / management 0)

When the `baseFeesByCountry` reducer processes both rows for the same country+tier, whichever is processed last wins. Depending on data order, the Aggregator row (management=0) can overwrite the Marketplace row.

## Solution

Two fixes in `PricingOverviewPage.tsx`:

### Fix 1: TierCard -- Filter base fees by engagement model

In the `TierCard` component (around line 120), the `tierBaseFees` filter currently only matches by `tier_id`. It needs to also match the engagement model being viewed.

**Current:**
```typescript
const tierBaseFees = baseFees.filter((bf: any) => bf.tier_id === tier.id);
```

**New:**
```typescript
const marketplaceModel = engagementModels?.find((m: any) => m.code?.toLowerCase() === 'marketplace');
const tierBaseFees = baseFees.filter((bf: any) => 
  bf.tier_id === tier.id && 
  (isAggregator ? false : bf.engagement_model_id === marketplaceModel?.id)
);
```

This requires passing `engagementModels` into TierCard (it's already available via the `allTiers`-style pattern -- we'll pass it through).

Wait -- actually TierCard already receives the model code via `modelCode` prop, but not the models list. We need a simpler approach: pass the filtered baseFees from the parent. The parent (line 815) passes ALL baseFees to every TierCard. Instead, filter at the parent level or pass the model ID.

**Simpler approach -- add engagementModels prop to TierCard:**

Add `engagementModels` to `TierCardProps` and use it to find the Marketplace model ID for filtering. For Aggregator tabs, the existing `isAggregator` check already shows "Not Applicable", so the filter only matters for Marketplace.

### Fix 2: SummaryTab -- Filter to Marketplace fees only

In the `SummaryTab` component (lines 379-385), the `baseFeesByCountry` reducer processes all base fees. It should filter to Marketplace model only, since the summary note already states "Applicable to Marketplace model only."

**Current:**
```typescript
const baseFeesByCountry = baseFees.reduce((acc, bf) => { ... }, {});
```

**New:**
```typescript
const marketplaceModel = engagementModels.find((m: any) => m.code?.toLowerCase() === 'marketplace');
const marketplaceBaseFees = baseFees.filter((bf: any) => bf.engagement_model_id === marketplaceModel?.id);
const baseFeesByCountry = marketplaceBaseFees.reduce((acc, bf) => { ... }, {});
```

## Files Changed

Only one file: `src/pages/admin/pricing-overview/PricingOverviewPage.tsx`

- **TierCard** (line ~120): Add engagement model filtering to `tierBaseFees`
- **TierCardProps** (line ~96): Add `engagementModels` prop
- **TierCard invocation** (line ~807): Pass `engagementModels` prop
- **SummaryTab** (line ~379): Filter base fees to Marketplace only before grouping

## Expected Result

After fix:
- **Marketplace tab tier cards**: Show only Marketplace base fees (consulting + management, both non-zero)
- **Aggregator tab tier cards**: Continue showing "Not Applicable" (unchanged)
- **Summary tab "Challenge Base Fees" table**: Shows Marketplace fees only with correct management fee values (e.g., India Basic: consulting 20,000 / management 8,000)

No database changes, no hook changes, no navigation or UX disruptions.

