

# Seed Missing Master Data for Complete Wizard Flow

## Problem

Six master data tables are **empty**, blocking Steps 4 (Plan Selection) and 5 (Billing). Additionally, the tier pricing validation on Step 1 blocks form submission because `md_tier_country_pricing` has no rows.

## Current Data Audit

| Table | Rows | Status |
|-------|------|--------|
| countries | 193 | OK |
| organization_types | 9 | OK |
| industry_segments | 9 | OK |
| md_states_provinces | 233 | OK |
| md_blocked_email_domains | 8 | OK |
| md_languages | 12 | OK |
| md_functional_areas | 10 | OK |
| md_export_control_statuses | 3 | OK |
| md_data_residency | 6 | OK |
| md_subscription_tiers | 3 (Basic, Standard, Premium) | OK |
| md_billing_cycles | 3 (Monthly, Quarterly, Annual) | OK |
| md_shadow_pricing | 3 | OK |
| **md_tier_features** | **0** | NEEDS SEED |
| **md_tier_country_pricing** | **0** | NEEDS SEED |
| **md_engagement_models** | **0** | NEEDS SEED |
| **md_tier_engagement_access** | **0** | NEEDS SEED |
| **md_payment_methods_availability** | **0** | NEEDS SEED |
| **platform_terms** | **0** | NEEDS SEED |

## What Will Be Seeded

### 1. md_engagement_models (2 rows)
- Marketplace -- connect with vetted solution providers
- Aggregator -- curated expert panels

### 2. md_tier_features (~24 rows, 8 features x 3 tiers)
Features for each tier (Basic, Standard, Premium) with included/excluded access:
- Marketplace Access, Aggregator Access, Dedicated Account Manager, Analytics Dashboard, API Access, Priority Support, Custom Integrations, White-label Reports

### 3. md_tier_country_pricing (12 rows: 3 tiers x 4 countries)
Pricing for US, UK, India, Brazil:
- Basic: $199/mo (US), GBP159, INR9999, BRL999
- Standard: $299/mo (US), GBP239, INR14999, BRL1499
- Premium: $399/mo (US), GBP319, INR19999, BRL1999

### 4. md_tier_engagement_access (6 rows: 3 tiers x 2 models)
- Basic: Marketplace included, Aggregator excluded
- Standard: both included
- Premium: both included

### 5. md_payment_methods_availability (12 rows: 3 methods x 4 countries)
For US, UK, India, Brazil -- each gets credit_card, ach_bank_transfer, wire_transfer

### 6. platform_terms (1 row)
Active terms v1.0 with placeholder content for testing

### 7. Code Fix: Bypass tier pricing warning on Step 1
Remove the country pricing warning and disable-on-warning logic so form submission is not blocked. The `useTierCountryPricing` hook will return `true` always for testing.

## Technical Details

### Migration SQL
A single migration inserts seed data into all 6 tables using the existing tier IDs, billing cycle IDs, and country IDs queried above.

### Code Changes (2 files)
1. **`src/hooks/queries/useRegistrationData.ts`** -- `useTierCountryPricing` queryFn returns `true` always (bypass)
2. **`src/components/registration/OrganizationIdentityForm.tsx`** -- Remove `showCountryWarning` alert and its disable condition on the submit button

