

# Update Summary Tab to Match Marketplace/Aggregator Tabs

The Summary tab currently only shows 4 cards (Access Matrix, Platform Fees, Billing Discounts, Complexity Multipliers). It is missing several sections that appear in the model-specific tabs. This update adds the missing comparison matrices and passes the required data.

## Changes (single file: `PricingOverviewPage.tsx`)

### 1. Pass missing data to SummaryTab

Add these props: `countryPricing`, `baseFees`, `shadowPricing`, `membershipTiers`, `features`

### 2. Add missing comparison cards to SummaryTab

The following cards will be added after the existing ones, in this order:

| Card | Content |
|------|---------|
| **Subscription Pricing** | Table with columns: Country, then each tier's monthly USD price. Grouped from `countryPricing` data. |
| **Challenge Base Fees** | Table per country showing Consulting Fee and Management Fee columns for each tier. Note at bottom: "Applicable to Marketplace model only. Aggregator model does not use consulting/management fees." |
| **Shadow Pricing** | Matrix: Tier columns, single row showing shadow charge per challenge. |
| **Membership Discounts** | Table: Tier name, Duration, Fee Discount %, Commission %. Same as the per-tier section but consolidated. |
| **Tier Features Comparison** | Matrix: Feature name rows, tier columns with Check/X icons matching the included/not_available styling (checkmark for included, X with strikethrough for not available). Description notes shown as footer per tier. |

### 3. Update Complexity Multipliers card

Add a note: "Applicable to Marketplace model only" to match the Aggregator tab behavior.

### 4. Visual consistency

- All tables use the existing `Table` component wrapped in `overflow-auto`
- Badges, Check/X icons, and styling match exactly what the Marketplace and Aggregator tabs display
- Feature comparison uses the same two-tone (green check / red X with strikethrough) pattern

## Technical Details

- `SummaryTab` props interface expands to include `countryPricing`, `baseFees`, `shadowPricing`, `membershipTiers`, `features`
- Country pricing grouped by country using a reduce/map pattern, with tier prices as columns
- Features grouped by `feature_name` across tiers for side-by-side comparison
- No new hooks or files needed -- all data is already fetched in the parent component

