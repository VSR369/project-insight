

# Fix: Membership Pricing, Activation State, and Org Context Banner

## Current Problems

1. **No membership price displayed** -- The `md_membership_tiers` table has no price column (`annual_fee_usd` does not exist). Users see discount percentages but not the actual membership cost.
2. **No "Selected" visual confirmation** -- Clicking a membership card toggles it, but there's no checkmark, no "Selected" label, and no visual confirmation that activation occurred.
3. **No org context at top of page** -- The header just says "Choose Your Plan" with zero context about which organization is being configured.

## Root Cause

The database migration to add `annual_fee_usd` was proposed in a previous plan but **never executed** -- the column does not exist in the database. All downstream UI changes that depended on it were never applied.

## Fix Plan

### Part 1: Database Migration

Add `annual_fee_usd` column to `md_membership_tiers` and seed prices:

```text
ALTER TABLE public.md_membership_tiers
  ADD COLUMN IF NOT EXISTS annual_fee_usd NUMERIC(10,2);

UPDATE public.md_membership_tiers
  SET annual_fee_usd = 500.00 WHERE code = 'annual';
UPDATE public.md_membership_tiers
  SET annual_fee_usd = 900.00 WHERE code = 'multi_year';

NOTIFY pgrst, 'reload schema';
```

### Part 2: Update useMembershipTiers Hook

File: `src/hooks/queries/useMembershipTiers.ts`

Add `annual_fee_usd` and `duration_months` to the SELECT string (line 18):

```text
Current:  "id, code, name, description, display_order, is_active, created_at, ..."
Updated:  "id, code, name, description, display_order, is_active, annual_fee_usd, duration_months, fee_discount_pct, commission_rate_pct, created_at, ..."
```

### Part 3: Rewrite MembershipTierSelector Component

File: `src/components/registration/MembershipTierSelector.tsx`

Changes:
- Add `currencySymbol` prop (default `$`)
- Update `MembershipTier` interface to include `annual_fee_usd`, `duration_months`, `fee_discount_pct`, `commission_rate_pct`
- Display membership fee prominently: e.g., "$500/year" in large bold text
- Show a green checkmark badge + "Selected" label on the active card
- Add note: "Billed separately from your subscription"
- Each card layout becomes:

```text
[Calendar Icon]  Annual Membership
                 $500/year  (large, bold)
                 12-month commitment
                 - 10% off per-challenge fees
                 - 8% commission rate
                 [checkmark "Selected" badge when active]
```

### Part 4: Add Org Context Banner to PlanSelectionForm

File: `src/components/registration/PlanSelectionForm.tsx`

Insert a subtle info banner above the "Choose Your Plan" heading (after the Engagement Models info card):

```text
[Building icon]  Registering: {legal_entity_name}  |  Country: {country from localeInfo or "Not set"}
```

- Uses `state.step1?.legal_entity_name` with fallback "Your Organization"
- Uses `state.localeInfo?.currency_code` or `state.step1?.hq_country_id` for country context, fallback "Country not set"
- Pass `currencySymbol` to `MembershipTierSelector`
- Import `Building` icon from lucide-react

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `annual_fee_usd` column, seed values, reload schema |
| `src/hooks/queries/useMembershipTiers.ts` | Add `annual_fee_usd, duration_months, fee_discount_pct, commission_rate_pct` to select |
| `src/components/registration/MembershipTierSelector.tsx` | Show fee, duration, checkmark selected state, currencySymbol prop |
| `src/components/registration/PlanSelectionForm.tsx` | Add org context banner, pass currencySymbol to MembershipTierSelector |

## Hook Order Compliance

No new hooks are added. Only the select string in `useMembershipTiers` changes and new props flow through existing render paths. All hooks remain in correct order per Section 23 rules.

