

# Seed Master Data for All Fee Categories (10 Countries x 3 Tiers x 2 Models)

## Reference Data Summary

**10 Countries:**

| Country | Currency | Symbol |
|---------|----------|--------|
| United States | USD | $ |
| United Kingdom | GBP | £ |
| India | INR | ₹ |
| Australia | AUD | A$ |
| Canada | CAD | CA$ |
| Germany | EUR | € |
| Singapore | SGD | S$ |
| United Arab Emirates | AED | د.إ |
| Japan | JPY | ¥ |
| Brazil | BRL | R$ |

**3 Subscription Tiers:** Basic, Standard, Premium
**2 Engagement Models:** Marketplace, Aggregator

## Seed Data Design

### 1. Base Fees (`md_challenge_base_fees`) -- Consulting + Management Fees

Base fees apply per engagement model. Marketplace has both consulting and management fees; Aggregator has consulting fee only (management = 0).

| Country | Tier | Model | Consulting Fee | Management Fee | Currency |
|---------|------|-------|---------------|----------------|----------|
| US | Basic | Marketplace | 500 | 200 | USD |
| US | Standard | Marketplace | 400 | 150 | USD |
| US | Premium | Marketplace | 300 | 100 | USD |
| US | Basic | Aggregator | 350 | 0 | USD |
| US | Standard | Aggregator | 275 | 0 | USD |
| US | Premium | Aggregator | 200 | 0 | USD |
| UK | Basic | Marketplace | 400 | 160 | GBP |
| UK | Standard | Marketplace | 320 | 120 | GBP |
| UK | Premium | Marketplace | 240 | 80 | GBP |
| ... | ... | ... | ... | ... | ... |

**Pattern for all countries:** Fees are scaled relative to USD using approximate purchasing power ratios:
- USD: 1.0x
- GBP: 0.8x
- EUR: 0.85x
- AUD: 1.5x
- CAD: 1.35x
- INR: 40x (e.g., USD 500 -> INR 20000)
- SGD: 1.35x
- AED: 3.67x
- JPY: 150x (e.g., USD 500 -> JPY 75000)
- BRL: 5x

**Total rows: 10 countries x 3 tiers x 2 models = 60 rows**

### 2. Platform Fees (`md_platform_fees`) -- Platform Usage Percentage

Platform fee is a percentage, so values are similar across countries but can vary slightly by market.

| Country | Tier | Model | Fee % | Currency |
|---------|------|-------|-------|----------|
| US | Basic | Marketplace | 12% | USD |
| US | Standard | Marketplace | 10% | USD |
| US | Premium | Marketplace | 8% | USD |
| US | Basic | Aggregator | 10% | USD |
| US | Standard | Aggregator | 8% | USD |
| US | Premium | Aggregator | 6% | USD |
| India | Basic | Marketplace | 10% | INR |
| India | Standard | Marketplace | 8% | INR |
| India | Premium | Marketplace | 6% | INR |
| ... | ... | ... | ... | ... |

**Pattern:** Developing markets (India, Brazil) get 2% discount across tiers. Premium always gets the lowest rate.

**Total rows: 10 x 3 x 2 = 60 rows** (existing 1 row will be cleaned up)

### 3. Shadow Pricing (`md_shadow_pricing`) -- Internal Cost Allocation

Shadow pricing is per-challenge cost for internal departments. Scaled by country currency.

| Country | Tier | Charge/Challenge | Currency | Symbol |
|---------|------|-----------------|----------|--------|
| US | Basic | 150 | USD | $ |
| US | Standard | 100 | USD | $ |
| US | Premium | 0 | USD | $ |
| India | Basic | 6000 | INR | ₹ |
| India | Standard | 4500 | INR | ₹ |
| India | Premium | 0 | INR | ₹ |
| Japan | Basic | 22500 | JPY | ¥ |
| Japan | Standard | 15000 | JPY | ¥ |
| Japan | Premium | 0 | JPY | ¥ |
| ... | ... | ... | ... | ... |

**Pattern:** Premium tier always has 0 shadow charge (all-inclusive). Values scaled by currency ratio.

**Total rows: 10 x 3 = 30 rows** (existing 3 rows will be cleaned up)

## Execution Plan

### Step 1: Clean up existing incomplete data
- Delete the 1 existing platform fee row (no country_id)
- Delete the 3 existing shadow pricing rows (no country_id)
- Base fees table is empty, no cleanup needed

### Step 2: Insert Base Fees (60 rows)
Insert via SQL using the actual UUIDs for countries, tiers, and engagement models.

### Step 3: Insert Platform Fees (60 rows)
Insert with `country_id` and `currency_code` populated from country reference data.

### Step 4: Insert Shadow Pricing (30 rows)
Insert with `country_id`, `currency_code`, and `currency_symbol` populated from country reference data.

## Total Seed Data
- **Base Fees:** 60 rows (10 countries x 3 tiers x 2 models)
- **Platform Fees:** 60 rows (10 countries x 3 tiers x 2 models)
- **Shadow Pricing:** 30 rows (10 countries x 3 tiers)
- **Grand Total:** 150 rows

