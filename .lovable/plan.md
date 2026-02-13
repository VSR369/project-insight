

# Add Country-Based Scoping to Platform Fees and Shadow Pricing

## Current State

| Table | Has `country_id`? | Has currency? |
|-------|-------------------|---------------|
| `md_challenge_base_fees` | Yes | Yes (`currency_code`) |
| `md_platform_fees` | **No** | **No** |
| `md_shadow_pricing` | **No** | Yes (manual `currency_code` + `currency_symbol`) |

## Database Changes (2 migrations)

### Migration 1: Add `country_id` and `currency_code` to `md_platform_fees`

```sql
ALTER TABLE md_platform_fees
  ADD COLUMN country_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN currency_code VARCHAR(5) NOT NULL DEFAULT 'USD';

ALTER TABLE md_platform_fees
  ADD CONSTRAINT fk_platform_fees_country FOREIGN KEY (country_id) REFERENCES countries(id);

CREATE INDEX idx_platform_fees_country ON md_platform_fees(country_id);

-- Remove the default after adding constraint
ALTER TABLE md_platform_fees ALTER COLUMN country_id DROP DEFAULT;
```

### Migration 2: Add `country_id` to `md_shadow_pricing`

```sql
ALTER TABLE md_shadow_pricing
  ADD COLUMN country_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE md_shadow_pricing
  ADD CONSTRAINT fk_shadow_pricing_country FOREIGN KEY (country_id) REFERENCES countries(id);

CREATE INDEX idx_shadow_pricing_country ON md_shadow_pricing(country_id);

ALTER TABLE md_shadow_pricing ALTER COLUMN country_id DROP DEFAULT;
```

## UI and Hook Changes

### 1. Platform Fees (`usePlatformFees.ts` + `PlatformFeesPage.tsx`)

- **Hook**: Update the `select` to join `countries(name, currency_code, currency_symbol)` alongside existing joins.
- **Form**: Add a Country dropdown as the first field. When a country is selected, auto-populate the `currency_code` from the country record.
- **Table columns**: Add "Country" and "Currency" columns to the data table.
- **View dialog**: Add Country and Currency to the detail view.
- **Schema**: Add `country_id` (required) and `currency_code` (auto-set from country) to the Zod schema.

### 2. Shadow Pricing (`useShadowPricing.ts` + `ShadowPricingPage.tsx`)

- **Hook**: Update the `select` to join `countries(name, currency_code, currency_symbol)`.
- **Form**: Add a Country dropdown. When a country is selected, auto-populate `currency_code` and `currency_symbol` from the country record (removing the manual text inputs for these fields).
- **Table columns**: Add "Country" column.
- **View dialog**: Add Country field.
- **Schema**: Add `country_id` (required), keep `currency_code`/`currency_symbol` but auto-fill them on country change.

### 3. Base Fees (`BaseFeesPage.tsx`) -- minor enhancement

- **Currency auto-fill**: When a country is selected, auto-populate the `currency_code` field from the country's `currency_code` instead of requiring manual entry. The field becomes read-only but visible.

### 4. Auto-Fill Behavior (all three pages)

When the user selects a country from the dropdown:
1. Look up the selected country object from the loaded countries data.
2. Call `form.setValue("currency_code", country.currency_code)`.
3. For Shadow Pricing, also set `form.setValue("currency_symbol", country.currency_symbol)`.
4. The currency fields become read-only (displayed but not editable) to prevent mismatches.

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/...` | Two new migration files for schema changes |
| `src/hooks/queries/usePlatformFees.ts` | Add `country_id`, `currency_code` to types; update select join to include `countries(name, currency_code, currency_symbol)` |
| `src/hooks/queries/useShadowPricing.ts` | Add `country_id` to types; update select join to include `countries(name, currency_code, currency_symbol)` |
| `src/pages/admin/platform-fees/PlatformFeesPage.tsx` | Add Country dropdown, Currency column, auto-fill logic |
| `src/pages/admin/shadow-pricing/ShadowPricingPage.tsx` | Add Country dropdown, auto-fill currency from country, make currency fields read-only |
| `src/pages/admin/base-fees/BaseFeesPage.tsx` | Add auto-fill for currency_code when country changes |

