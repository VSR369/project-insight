

# Fix `assemble_cpa` Database Function — 5 Bug Fixes

## Problem
The current `assemble_cpa` function crashes on insert due to validation trigger violations and produces incomplete/incorrect assembled CPAs.

## Confirmed Bugs (from DB inspection)

| Bug | Current Code | Constraint | Fix |
|-----|-------------|------------|-----|
| 1. Tier | `'challenge'` | Trigger requires `TIER_1` or `TIER_2` | Use `'TIER_1'` |
| 2. Status | `'DRAFT'` | Trigger requires `ATTACHED/TRIGGERED/SIGNED/EXPIRED/ai_suggested` | Use `'ATTACHED'` |
| 3. Geography | `WHERE challenge_id = ...` | `geography_context` has no `challenge_id` | Resolve via `org.hq_country_id` → `countries.code` → `geography_context.country_codes` |
| 4. Prize | Uses `total_fee` (often 0) | `platinum_award` doesn't exist either | Get Platinum tier from `challenge_prize_tiers` where `tier_name = 'Platinum'` and `rank = 1`, use `COALESCE(fixed_amount, percentage_of_pool * total_fee / 100, total_fee)` |
| 5. Missing variables | Only 10 of 17 replaced | Templates use `{{ip_clause}}`, `{{escrow_terms}}`, `{{anti_disintermediation}}`, `{{seeker_org_name}}`, `{{prize_amount}}`, `{{solver_audience}}`, `{{evaluation_method}}` | Add all 7 missing variables |
| 6. No `lc_status` | Not set | Column exists, trigger validates it | Set `'approved'` for QUICK, `'pending_review'` for others |

**Key schema discovery**: The user's proposed SQL references `platinum_award` on `challenges`, but that column does not exist. Prize must come from `challenge_prize_tiers` table or fall back to `total_fee`.

## Migration SQL

A single migration will `DROP FUNCTION` + `CREATE OR REPLACE FUNCTION` for `assemble_cpa` with:

1. Prize lookup: query `challenge_prize_tiers` for Platinum tier's `fixed_amount`, fall back to `total_fee`
2. Geography: `JOIN countries co ON gc.country_codes @> ARRAY[co.code] WHERE co.id = v_org.hq_country_id`
3. IP clause expansion from `ip_model` code → human-readable text
4. Conditional `escrow_terms` (CONTROLLED only) and `anti_disintermediation` (AGG only)
5. All 11+ template variable replacements
6. `tier = 'TIER_1'`, `status = 'ATTACHED'`, `lc_status` set per governance mode
7. Audit trail entry

## Files Changed

| File | Change |
|------|--------|
| New migration | `DROP + CREATE OR REPLACE FUNCTION assemble_cpa` |

No edge function or frontend changes.

