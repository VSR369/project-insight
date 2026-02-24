

# Fix: Membership Activation, Pricing Display, and Org Context Header

## Problems Identified

1. **No membership price shown** -- The `md_membership_tiers` table lacks a `membership_fee` column. Users see "10% off per-challenge fees" but have no idea what the membership itself costs (e.g., $500/year for Annual, $900/2yr for Multi-Year).
2. **No activate/confirm action** -- Clicking a membership card toggles selection but there is no explicit "Activate Membership" confirmation or visual confirmation state.
3. **No org name or country at top** -- The page header says "Choose Your Plan" with no context about which organization is being configured. Users lose context, especially when navigating directly.

## Solution

### Part 1: Database -- Add membership fee columns

Add `annual_fee_usd` and `description` columns to `md_membership_tiers` so each tier has a price:

```text
ALTER TABLE md_membership_tiers ADD COLUMN annual_fee_usd NUMERIC(10,2);

UPDATE md_membership_tiers SET annual_fee_usd = 500.00 WHERE code = 'annual';
UPDATE md_membership_tiers SET annual_fee_usd = 900.00 WHERE code = 'multi_year';
```

These are placeholder values -- adjust as needed for actual pricing.

### Part 2: MembershipTierSelector -- Show price and activation

Update `src/components/registration/MembershipTierSelector.tsx`:

- Accept a `currencySymbol` prop (default `$`)
- Display the membership fee prominently on each card (e.g., "$500/year", "$900/2 years")
- Show a clear selected state with a checkmark badge and "Selected" label
- Add descriptive text: "Billed separately from your subscription"

The `useMembershipTiers` hook query already selects all columns, so `annual_fee_usd` will be available after the migration.

### Part 3: Org Context Banner at Top

Update `src/components/registration/PlanSelectionForm.tsx`:

- Add an info banner above the "Choose Your Plan" header showing:
  - Organization name from `state.step1?.legal_entity_name` or fallback "Your Organization"
  - Country from `state.localeInfo?.country_name` or fallback "Country not set"
  - Current registration step context
- Styled as a subtle info bar (not a card) with Building icon

### Part 4: Update useMembershipTiers query

Update `src/hooks/queries/useMembershipTiers.ts` to include `annual_fee_usd` and `duration_months` in the select statement so pricing data flows to the component.

## Files Modified

| File | Changes |
|------|---------|
| Database migration | Add `annual_fee_usd` to `md_membership_tiers`, seed values |
| `src/hooks/queries/useMembershipTiers.ts` | Add `annual_fee_usd, duration_months` to select |
| `src/components/registration/MembershipTierSelector.tsx` | Show fee, duration, selected state with checkmark |
| `src/components/registration/PlanSelectionForm.tsx` | Add org context banner at top, pass `currencySymbol` to MembershipTierSelector |

## Technical Details

### Database Migration

```sql
ALTER TABLE public.md_membership_tiers
  ADD COLUMN IF NOT EXISTS annual_fee_usd NUMERIC(10,2);

UPDATE public.md_membership_tiers SET annual_fee_usd = 500.00 WHERE code = 'annual';
UPDATE public.md_membership_tiers SET annual_fee_usd = 900.00 WHERE code = 'multi_year';
```

### MembershipTierSelector Changes

Props interface update:
```text
interface MembershipTierSelectorProps {
  tiers: MembershipTier[];          // now includes annual_fee_usd, duration_months
  selectedTierId: string | undefined;
  onSelect: (tierId: string | undefined) => void;
  currencySymbol?: string;          // NEW
}
```

Each card will render:
```text
Annual Membership
$500/year  (large, bold)
12-month commitment
- 10% off per-challenge fees
- 5% less commission rate
[checkmark badge when selected]
```

### Org Context Banner (PlanSelectionForm.tsx)

Inserted above the "Choose Your Plan" heading:
```text
[Building icon]  Registering: {org name}  |  Country: {country}
```

Uses `state.step1?.legal_entity_name` and `state.step1?.hq_country_name` or `state.localeInfo?.country_name`.

### Hook Order Compliance

No new hooks added. Only the select string in `useMembershipTiers` changes and props flow through existing render. All hooks remain in correct order.

