

# Correction Plan: Aggregator Fee Model and Visible Per-Challenge Pricing on Tier Cards

## Current Problem

1. **Aggregator model is wrongly configured** -- The database has consulting fees ($200-$350) seeded for Aggregator rows, but the business rule states Aggregator has NO consulting and NO management fees. Aggregator only charges the **Platform Usage Fee %** (a percentage taken from the provider award). Per-challenge base fees should be $0 for Aggregator.

2. **Users cannot see per-challenge fees** -- The tier cards only say "per-challenge fees apply" in small text. Users have no visibility into what those fees are or how membership discounts affect them.

3. **Membership impact is invisible** -- Selecting a membership plan shows a generic "10% off per-challenge fees" badge but no actual dollar amounts change, making it feel pointless.

## How the Fee Structure Actually Works

```text
                     MARKETPLACE MODEL              AGGREGATOR MODEL
                     ─────────────────              ────────────────
Subscription Fee:    Fixed monthly price             Same fixed monthly price
                     (Basic $199, Standard $299,     (unchanged by model)
                      Premium $399)

Per-Challenge Fee:   Consulting + Management         $0 (no base fees)
                     (e.g. Basic: $500 + $200 = $700)

Platform Usage Fee:  % of provider award             % of provider award
                     (e.g. Basic: 12%)               (e.g. Basic: 10%)

Membership Discount: Applies to Per-Challenge Fee    Nothing to discount
                     (10% Annual / 15% Multi-Year)   (base fee is already $0)
```

**Summary: Membership discounts are only meaningful for Marketplace users**, because Aggregator has no per-challenge base fees to discount.

## Complete Fee Matrix (USD, What Users Should See)

### Without Membership

| Tier | Subscription | Marketplace Per-Challenge | Aggregator Per-Challenge | Marketplace Platform % | Aggregator Platform % |
|------|-------------|--------------------------|-------------------------|----------------------|---------------------|
| Basic | $199/mo | $700 | $0 | 12% | 10% |
| Standard | $299/mo | $550 | $0 | 10% | 8% |
| Premium | $399/mo | $400 | $0 | 8% | 6% |

### With Annual Membership (10% off per-challenge)

| Tier | Subscription | Marketplace Per-Challenge | Aggregator Per-Challenge |
|------|-------------|--------------------------|-------------------------|
| Basic | $199/mo | ~~$700~~ $630 | $0 (no change) |
| Standard | $299/mo | ~~$550~~ $495 | $0 (no change) |
| Premium | $399/mo | ~~$400~~ $360 | $0 (no change) |

### With Multi-Year Membership (15% off per-challenge)

| Tier | Subscription | Marketplace Per-Challenge | Aggregator Per-Challenge |
|------|-------------|--------------------------|-------------------------|
| Basic | $199/mo | ~~$700~~ $595 | $0 (no change) |
| Standard | $299/mo | ~~$550~~ $467.50 | $0 (no change) |
| Premium | $399/mo | ~~$400~~ $340 | $0 (no change) |

## Correction Plan (3 Parts)

### Part 1: Database Fix -- Zero Out Aggregator Base Fees

Set `consulting_base_fee = 0` and `management_base_fee = 0` for all Aggregator rows in `md_challenge_base_fees`. This corrects the seed data to match the business rule that Aggregator has no per-challenge base fees.

**Migration SQL:**
- UPDATE `md_challenge_base_fees` SET `consulting_base_fee = 0, management_base_fee = 0` WHERE `engagement_model_id` = (Aggregator model ID)
- Affects all countries (Brazil, Australia, USA, India, UK, Singapore)

### Part 2: New Data Hooks -- Fetch Per-Challenge and Platform Fees

Add two new hooks to `src/hooks/queries/usePlanSelectionData.ts`:

- `useBaseFeesByCountry(countryId)` -- Fetches `md_challenge_base_fees` rows for the user's country, joined with tier and engagement model codes
- `usePlatformFeesByCountry(countryId)` -- Fetches `md_platform_fees` rows for the user's country, joined with tier and engagement model codes

Both hooks return arrays keyed by tier + engagement model so the UI can look up fees per card.

### Part 3: Tier Card UI -- Show Per-Challenge Fee Breakdown

Update `src/components/registration/PlanSelectionForm.tsx` to display per-challenge fees on each tier card:

**What each tier card will show (below the subscription price):**

For Marketplace model:
```text
Per-Challenge Fee:
  Consulting: $500 + Management: $200 = $700
  (with membership: ~~$700~~ $630 -- "10% off")
Platform Fee: 12% of provider award
```

For Aggregator model:
```text
Per-Challenge Fee: None (platform-mediated)
Platform Fee: 10% of provider award
```

**Display logic:**
- Show both models side-by-side in a compact two-tab or two-column mini-section within each card
- When membership is selected, show strikethrough original + green discounted amount for Marketplace
- For Aggregator, show "No per-challenge fees" with a note that only the platform fee applies
- If no engagement model selected yet, default to showing both

**Remove:** The current generic "per-challenge fees apply" text and the small emerald discount badge (lines 522-529 and 569-577) -- replaced by the actual fee display.

### Files Modified

| File | Change |
|------|--------|
| New migration SQL | Zero out Aggregator consulting_base_fee across all countries |
| `src/hooks/queries/usePlanSelectionData.ts` | Add `useBaseFeesByCountry` and `usePlatformFeesByCountry` hooks |
| `src/components/registration/PlanSelectionForm.tsx` | Fetch fees, render per-model pricing on each tier card with membership discount, remove generic text |
| `src/services/engagementModelRulesService.ts` | No changes needed (already correct) |
| `src/services/challengePricingService.ts` | No changes needed (already handles zero fees correctly) |

### Edge Cases Handled

- **No country selected:** Hide per-challenge section, show "Select country to see challenge fees"
- **Enterprise tier:** No per-challenge section (custom pricing)
- **Internal departments:** Show shadow fee instead (already implemented)
- **NGO/Academic (subsidized):** Subsidy applies to subscription price (already working), membership discount applies additionally to per-challenge fees

