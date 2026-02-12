
# Plan: Integrate Membership Discounts, Marketplace/Aggregator Pricing, and Wire to Real Org Context

## Overview

There are three categories of gaps to close:

1. **Replace all hardcoded DEMO_ORG_ID / DEMO_TENANT_ID placeholders** with the real authenticated organization context from `useOrgContext()`
2. **Wire membership discounts into challenge pricing** so the fee shown on the Create Challenge page reflects the org's active membership tier discount
3. **Add a Marketplace vs Aggregator pricing comparison** on the Create Challenge page so users can see fee differences between models before selecting one

---

## Gap 1: Replace Hardcoded Placeholders with Real Org Context

Five pages currently use hardcoded `DEMO_ORG_ID` / `DEMO_TENANT_ID` constants instead of reading from the authenticated org context. All five will be updated to use `useOrgContext()`.

### Files to Change

| File | What Changes |
|------|-------------|
| `src/pages/org/MembershipPage.tsx` | Replace `DEMO_ORG_ID` / `DEMO_TENANT_ID` with `useOrgContext()`. Wrap in `OrgLayout` instead of `AdminLayout`. |
| `src/pages/org/ChallengeCreatePage.tsx` | Replace `DEMO_ORG_ID` / `DEMO_TENANT_ID` / `DEMO_COUNTRY_ID` with `useOrgContext()`. Wrap in `OrgLayout`. |
| `src/pages/org/OrgBillingPage.tsx` | Replace `DEMO_ORG_ID` / `DEMO_TENANT_ID` with `useOrgContext()`. Wrap in `OrgLayout`. |
| `src/pages/org/TeamPage.tsx` | Replace `DEMO_ORG_ID` / `DEMO_TENANT_ID` with `useOrgContext()`. |

### OrgContext Enhancement

`useCurrentOrg` hook currently only returns `organizationId`, `tenantId`, `orgRole`, `orgName`, `tierCode`. We need to also return `hqCountryId` (for base fee lookup) and `isInternalDepartment` (derived from `saas_agreements`).

**File: `src/hooks/queries/useCurrentOrg.ts`**
- Add `hqCountryId` to the select query from `seeker_organizations`
- Add a secondary query to check if the org is a child in an active `saas_agreements` record (determines `isInternalDepartment`)
- Update `CurrentOrg` interface to include `hqCountryId: string | null` and `isInternalDepartment: boolean`

**File: `src/contexts/OrgContext.tsx`**
- Update `OrgContextValue` interface to include `hqCountryId` and `isInternalDepartment`

---

## Gap 2: Wire Membership Discounts into Challenge Pricing

Currently, `challengePricingService.ts` calculates fees as `baseFee x complexity` but never applies the membership discount. The membership discount info exists in `membershipService.ts` but is never called from the challenge flow.

### Service Layer Change

**File: `src/services/challengePricingService.ts`**
- Add a new function `applyMembershipDiscount` that takes a `ChallengePricing` result and a `feeDiscountPct` and returns adjusted pricing with both the original and discounted amounts:

```
applyMembershipDiscount(pricing, feeDiscountPct) => {
  ...originalPricing,
  discountPct,
  discountedConsultingFee,
  discountedManagementFee,
  discountedTotalFee,
}
```

### Data Hook Addition

**File: `src/pages/org/ChallengeCreatePage.tsx`**
- Import and call `useOrgMembership(organizationId)` to get the active membership
- Import `calculateMembershipDiscount` from `membershipService`
- After computing base `pricing`, apply `applyMembershipDiscount()` if the org has an active membership
- Update the pricing display to show:
  - Original fee (with strikethrough if discounted)
  - Discount percentage badge
  - Discounted total fee

---

## Gap 3: Marketplace vs Aggregator Pricing Comparison

Currently, the engagement model selector is a plain dropdown with no pricing differentiation. Users cannot see how fees differ between Marketplace and Aggregator before choosing.

### UI Change on ChallengeCreatePage

**File: `src/pages/org/ChallengeCreatePage.tsx`**
- Replace the engagement model dropdown with a **side-by-side card selector** (radio-style cards)
- Each card shows:
  - Model name and description (from `md_engagement_models`)
  - Communication mode label from `engagementModelRulesService` (e.g., "Direct Communication" vs "Platform-Mediated")
  - Key capability badges (e.g., "Provider contacts visible", "Direct messaging")
- When a complexity level is also selected, each card dynamically shows the calculated fee for that model
  - Both models use the same base fees and complexity multipliers (same pricing formula)
  - The difference is in the behavioral rules, not the price, so the cards will highlight the feature differences rather than price differences
- Selected card gets a highlighted border

### New Component

**File: `src/components/org/EngagementModelSelector.tsx`**
- A presentational component that renders the two model cards
- Props: `models`, `selectedId`, `onSelect`, `rules` (from `getEngagementModelRules`)
- Uses `getEngagementModelRules` and `getModelDisplayInfo` from `engagementModelRulesService.ts`

---

## Summary of All Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `src/hooks/queries/useCurrentOrg.ts` | Add `hqCountryId`, `isInternalDepartment` to query and interface |
| 2 | `src/contexts/OrgContext.tsx` | Update interface to include new fields |
| 3 | `src/services/challengePricingService.ts` | Add `applyMembershipDiscount()` function |
| 4 | `src/components/org/EngagementModelSelector.tsx` | **New file** -- card-based model selector |
| 5 | `src/pages/org/ChallengeCreatePage.tsx` | Wire real org context, membership discounts, model selector |
| 6 | `src/pages/org/MembershipPage.tsx` | Replace demo IDs with `useOrgContext()`, use `OrgLayout` |
| 7 | `src/pages/org/OrgBillingPage.tsx` | Replace demo IDs with `useOrgContext()`, use `OrgLayout` |
| 8 | `src/pages/org/TeamPage.tsx` | Replace demo IDs with `useOrgContext()` |

No database migrations are needed -- all required tables and columns already exist.
