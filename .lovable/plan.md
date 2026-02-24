
# Fix: Membership Pricing, Activation State, and Org Context Banner

## Status: ✅ COMPLETED

All four parts implemented:

1. **Database Migration** — `annual_fee_usd` column added to `md_membership_tiers`, seeded with $500 (annual) and $900 (multi_year)
2. **useMembershipTiers Hook** — SELECT updated to include `annual_fee_usd, duration_months, fee_discount_pct, commission_rate_pct`
3. **MembershipTierSelector** — Now shows price (e.g. "$500/year"), checkmark "Selected" badge, currencySymbol prop, and uses DB columns for discount/commission rates
4. **PlanSelectionForm** — Org context banner added above plan selection, currencySymbol passed to MembershipTierSelector
