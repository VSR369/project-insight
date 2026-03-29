

# Phase 2 Gap Analysis & Remaining Implementation Plan

## What's DONE

| Item | Status |
|------|--------|
| Organization types updated (LARGE/MEDIUM/SMALL/MICRO_ENTERPRISE, STARTUP, ACADEMIC, NGO, GOVT, INTDEPT) | Done |
| `rate_cards` table created + 27 rows seeded (matching spec values exactly) | Done |
| `non_monetary_incentives` table + 6 defaults seeded | Done |
| `challenge_incentive_selections` join table created | Done |
| `useRateCards.ts` hook (CRUD) | Done |
| `useNonMonetaryIncentives.ts` hook (CRUD) | Done |
| `lookupRateCard.ts` utility | Done |
| Rate Cards admin page at `/admin/seeker-config/rate-cards` | Done |
| Incentives admin page at `/admin/seeker-config/incentives` | Done |
| Routes + sidebar entries for both admin pages | Done |

## What's NOT YET BUILT

### 1. `challenge_prize_tiers` table (Migration needed)
- Table does not exist in the database
- No migration has been run
- No auto-seed trigger for default 4 tiers (Platinum 55%, Gold 23%, Silver 13%, Honorable Mention 9%)

### 2. `useChallengePrizeTiers.ts` hook
- Does not exist — needed for CRUD on prize tiers per challenge

### 3. `useChallengeIncentiveSelections.ts` hook
- Does not exist — needed for linking incentives to challenges with seeker commitment

### 4. `PrizeTierEditor` component
- Does NOT exist as described in spec. The existing `PrizeTierCard.tsx` is a simpler toggle/amount card (Platinum/Gold/Silver only) — not the flexible, add/delete/reorder table the spec requires
- Missing: inline editing table, custom tier names, % of pool with running total, drag-to-reorder, "Add Tier" button, percentage validation, warning for Platinum < 40%

### 5. `IncentiveSelector` component
- Does not exist — card-based selector filtered by maturity + complexity
- Missing: seeker commitment input, credibility tooltip, effective solver value summary

### 6. Org type badge in curation header
- Not implemented — should show org type name as badge alongside challenge title

### 7. Effective solver value display
- Not implemented — "Cash + ~Non-monetary = ~Total" summary

---

## Implementation Plan

### Step 1: Migration — `challenge_prize_tiers` table + auto-seed trigger
Create the table with: `challenge_id`, `tier_name`, `rank`, `percentage_of_pool`, `fixed_amount`, `max_winners`, `description`, `created_by_role`, `is_default`, audit fields. Add a trigger function that auto-inserts the 4 default tiers when a new challenge is created.

### Step 2: `useChallengePrizeTiers.ts` hook
Standard React Query CRUD hook following existing patterns. Query by `challenge_id`, support create/update/delete/reorder.

### Step 3: `useChallengeIncentiveSelections.ts` hook
CRUD hook for the join table. Query selections by `challenge_id`, join with `non_monetary_incentives` for display data.

### Step 4: `PrizeTierEditor` component
Replace or augment the current simple `PrizeTierCard` approach with a full inline-editable table:
- Columns: Tier Name | % of Pool | Amount ($) | Max Winners | Description | Actions
- "Add Tier" button, delete per row, drag-to-reorder via rank
- Running total footer: "Allocated: X% of $Y = $Z | Remaining: $R (N%)"
- Validation: total ≤ 100%, each tier > 0%
- Warning banner if top tier < 40%

### Step 5: `IncentiveSelector` component
Card-based selector inside the Reward Structure section:
- Shows available incentives filtered by challenge maturity + complexity
- Click to add, fill seeker commitment field
- Credibility note as tooltip
- Summary list of selected incentives below prize tiers

### Step 6: Org type badge in curation header
In `CurationReviewPage.tsx`, derive org type from `challenge.organization_id → seeker_organizations.organization_type_id → organization_types.name` and display as a badge.

### Step 7: Effective solver value display
Below the prize tiers + incentive selections: "Effective solver value: $X cash + ~$Y non-monetary = ~$Z total"

### Step 8: Integration
- Wire PrizeTierEditor + IncentiveSelector into the Reward Structure curation section
- Ensure existing PrizeTierCard (simple toggle) coexists or is replaced by the new editor

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/queries/useChallengePrizeTiers.ts` | Prize tier CRUD per challenge |
| `src/hooks/queries/useChallengeIncentiveSelections.ts` | Incentive selection CRUD |
| `src/components/cogniblend/curation/rewards/PrizeTierEditor.tsx` | Full prize tier editor |
| `src/components/cogniblend/curation/rewards/IncentiveSelector.tsx` | Incentive card selector |
| `src/components/cogniblend/curation/rewards/EffectiveSolverValue.tsx` | Value summary display |

## Files to Modify
| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Org type badge |
| Reward Structure section component | Integrate PrizeTierEditor + IncentiveSelector |

## Migrations
1. `challenge_prize_tiers` table + auto-seed trigger + RLS

