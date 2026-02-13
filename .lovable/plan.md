

# Plan: Fix All Seeker Master Data Gaps

## Overview

This plan addresses all 5 identified gaps in a safe, incremental manner. No existing tables, pages, or logic will be modified -- only new data inserts and new CRUD screens are added.

---

## Phase 1: Data Fixes (No Code Changes)

### 1A. Fix Organization Types

**Problem**: Duplicate "College" (codes `COL` and `COLLEGE`), missing "Academic" and "Internal Department" types.

**Actions**:
- Deactivate `COL` (keep `COLLEGE` as the canonical entry)
- Insert `ACADEMIC` org type ("Academic Institution") -- unified entry per BR-REG-002
- Insert `INTDEPT` org type ("Internal Department")
- Insert matching `org_type_seeker_rules` rows for both new types:
  - Academic: `subsidized_eligible=true`, `tier_recommendation='basic'`, `zero_fee_eligible=true`
  - Internal Department: `subsidized_eligible=false`, `tier_recommendation='standard'`, `compliance_required=false`

### 1B. Seed md_tax_formats (BR-REG-008)

Insert tax format records for key countries:

| Country | Tax Name | Example | Regex |
|---------|----------|---------|-------|
| United States | EIN | 12-3456789 | `^\d{2}-\d{7}$` |
| United Kingdom | UTR | 1234567890 | `^\d{10}$` |
| India | GST | 22AAAAA0000A1Z5 | `^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$` |
| Germany | Steuernummer | 123/456/78901 | `^\d{3}/\d{3}/\d{5}$` |
| (8-10 more countries) | ... | ... | ... |

### 1C. Seed md_subsidized_pricing

Link to `org_type_seeker_rules` for eligible org types:

| Org Type Rule | Discount % | Max Duration (months) |
|---------------|-----------|----------------------|
| Academic (ACADEMIC + UNI + COLLEGE + SCHOOL) | 50 | 12 |
| NGO | 30 | 12 |
| Start-up | 25 | 12 |
| MSME | 15 | 12 |

### 1D. Seed md_postal_formats

Insert postal/zip code formats for key countries:

| Country | Label | Example | Regex |
|---------|-------|---------|-------|
| United States | ZIP Code | 12345 | `^\d{5}(-\d{4})?$` |
| United Kingdom | Postcode | SW1A 1AA | pattern |
| India | PIN Code | 110001 | `^\d{6}$` |
| (8-10 more countries) | ... | ... | ... |

---

## Phase 2: Build 5 Missing CRUD Admin Screens

Each screen follows the exact same pattern as `DepartmentsPage.tsx` -- using `DataTable`, `MasterDataForm`, `DeleteConfirmDialog`, `StatusBadge`, and `MasterDataViewDialog`. Each gets its own hooks file.

### 2A. Tax Formats CRUD

- **Route**: `/admin/seeker-config/tax-formats`
- **Hooks**: `src/hooks/queries/useTaxFormatsAdmin.ts`
- **Page**: `src/pages/admin/tax-formats/TaxFormatsPage.tsx`
- **Columns**: Country (joined), Tax Name, Example, Required, Status
- **Form fields**: Country (select from countries), Tax Name, Format Regex, Example, Is Required (switch), Active (switch)

### 2B. Subsidized Pricing CRUD

- **Route**: `/admin/seeker-config/subsidized-pricing`
- **Hooks**: `src/hooks/queries/useSubsidizedPricingAdmin.ts`
- **Page**: `src/pages/admin/subsidized-pricing/SubsidizedPricingPage.tsx`
- **Columns**: Org Type Rule (joined to org_type_seeker_rules -> organization_types.name), Discount %, Max Duration, Status
- **Form fields**: Org Type Rule (select), Discount Percentage, Max Duration Months, Description, Active

### 2C. Postal Formats CRUD

- **Route**: `/admin/seeker-config/postal-formats`
- **Hooks**: `src/hooks/queries/usePostalFormatsAdmin.ts`
- **Page**: `src/pages/admin/postal-formats/PostalFormatsPage.tsx`
- **Columns**: Country (joined), Label, Example, Status
- **Form fields**: Country (select), Label, Format Regex, Example, Active

### 2D. Billing Cycles CRUD

- **Route**: `/admin/seeker-config/billing-cycles`
- **Hooks**: `src/hooks/queries/useBillingCyclesAdmin.ts`
- **Page**: `src/pages/admin/billing-cycles/BillingCyclesPage.tsx`
- **Columns**: Code, Name, Months, Discount %, Status
- **Form fields**: Code, Name, Months, Discount Percentage, Active
- **Note**: Already has 3 seeded records (Monthly/Quarterly/Annual)

### 2E. Payment Methods Availability CRUD

- **Route**: `/admin/seeker-config/payment-methods`
- **Hooks**: `src/hooks/queries/usePaymentMethodsAdmin.ts`
- **Page**: `src/pages/admin/payment-methods/PaymentMethodsPage.tsx`
- **Columns**: Country (joined), Tier (joined), Payment Method, Status
- **Form fields**: Country (select), Tier (select), Payment Method (select from enum), Active
- **Note**: Already has 36 seeded records

---

## Phase 3: Wiring (Sidebar, Routes, Prefetch)

### 3A. AdminSidebar.tsx

Add 5 new items to the `seekerConfigItems` array:
- Tax Formats, Subsidized Pricing, Postal Formats, Billing Cycles, Payment Methods

### 3B. App.tsx

Add 5 lazy-loaded routes under the admin route group.

### 3C. routePrefetch.ts

Register the 5 new routes for prefetching.

---

## Phase 4: md_tier_country_pricing Coverage (Deferred)

The current 12 records (4 countries x 3 tiers) are adequate for testing. The registration flow already bypasses tier pricing validation (`useTierCountryPricing` returns `true` unconditionally). Expanding to 193 countries is a bulk data operation best handled via an import tool or dedicated seeding script -- **not part of this plan** to keep scope manageable.

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Deactivate COL org type | Low | Soft deactivate only; no data deleted |
| New org types | Zero | Additive inserts |
| Seed 3 empty tables | Zero | Tables are currently empty |
| 5 new CRUD screens | Zero | New files only; follows proven pattern |
| Sidebar/route additions | Zero | Additive entries to existing arrays |

---

## Technical Details

### Files Created (15 new files)
- `src/hooks/queries/useTaxFormatsAdmin.ts`
- `src/hooks/queries/useSubsidizedPricingAdmin.ts`
- `src/hooks/queries/usePostalFormatsAdmin.ts`
- `src/hooks/queries/useBillingCyclesAdmin.ts`
- `src/hooks/queries/usePaymentMethodsAdmin.ts`
- `src/pages/admin/tax-formats/TaxFormatsPage.tsx`
- `src/pages/admin/tax-formats/index.ts`
- `src/pages/admin/subsidized-pricing/SubsidizedPricingPage.tsx`
- `src/pages/admin/subsidized-pricing/index.ts`
- `src/pages/admin/postal-formats/PostalFormatsPage.tsx`
- `src/pages/admin/postal-formats/index.ts`
- `src/pages/admin/billing-cycles/BillingCyclesPage.tsx`
- `src/pages/admin/billing-cycles/index.ts`
- `src/pages/admin/payment-methods/PaymentMethodsPage.tsx`
- `src/pages/admin/payment-methods/index.ts`

### Files Modified (3 existing files)
- `src/components/admin/AdminSidebar.tsx` -- add 5 items to `seekerConfigItems`
- `src/App.tsx` -- add 5 lazy routes
- `src/lib/routePrefetch.ts` -- register 5 new prefetch entries

### Execution Order
1. Data inserts (org types, tax formats, subsidized pricing, postal formats)
2. Create all 5 hook files and 10 page files in parallel
3. Update sidebar, routes, and prefetch

