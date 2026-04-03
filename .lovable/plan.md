

# Governance + Pipeline Fix — Implementation Plan

## Summary
Fix convergence matrices (STRUCTURED: 3 blocks, CONTROLLED: 9 blocks), update `initialize_challenge` to remove ENTERPRISE fallback, give STRUCTURED creators CR+LC auto-assign, add compliance pre-check to `complete_phase` recursion, and seed pool entries for demo users.

## What's Wrong Today

| Issue | Current | Correct |
|-------|---------|---------|
| **role_conflict_rules** | 8 rows (2 STR + 6 CTRL) | 12 rows (3 STR + 9 CTRL) |
| STRUCTURED missing | `ER+FC` block | Must block ER+FC (kickback prevention) |
| CONTROLLED missing | `CU+LC`, `CU+FC`, `ER+LC` blocks | All 9 pairs blocked |
| **initialize_challenge** | Falls back to `'ENTERPRISE'` | Must fall back to `'STRUCTURED'` |
| **auto_assign** STRUCTURED | CR only | CR+LC (creator handles template legal) |
| **complete_phase** | Escrow: only `not_applicable` auto-sets FC | Must also auto-set for `optional` |
| **complete_phase** recursion | No compliance pre-check before Phase 2 recursion | Must check lc+fc flags before recursing into Phase 2 |
| **Demo pool** | No CU/ER/FC pool entries | Casey, Evelyn, Frank must be in pool |

## Changes

### 1. Database Migration (single new migration)

**FIX A: role_conflict_rules — add 4 missing rows**
- DELETE all existing, re-INSERT 12 correct rows:
  - STRUCTURED (3): CR+CU, CR+ER, ER+FC
  - CONTROLLED (9): CR+CU, CR+ER, CR+FC, CU+ER, CU+LC, CU+FC, ER+LC, ER+FC, LC+FC

**FIX B: initialize_challenge — ENTERPRISE → STRUCTURED**
- `CREATE OR REPLACE` with `COALESCE(v_governance, 'STRUCTURED')` replacing `'ENTERPRISE'`
- Must `DROP FUNCTION IF EXISTS` the 4-param overload first (already dropped in prior migration, but safe to re-drop)

**FIX C: auto_assign_roles_on_creation — CR+LC for STRUCTURED**
- STRUCTURED: `ARRAY['CR','LC']` instead of `ARRAY['CR']`
- CONTROLLED: stays `ARRAY['CR']` (strict separation)

**FIX D: complete_phase — escrow optional + compliance pre-check**
- Step 7: Add `'optional'` to escrow auto-set condition: `IF v_escrow_mode IN ('not_applicable', 'optional')`
- Step 11 (new): Before recursing into Phase 2, re-read compliance flags. If either is FALSE, return gracefully with `waiting_for: 'Compliance review'` instead of crashing on the gate.
- Must `DROP FUNCTION IF EXISTS` before `CREATE OR REPLACE` due to param order (p_challenge_id, p_user_id)

### 2. Edge Function Update — setup-test-scenario

After the user creation loop (Step 5), add **Step 5b**: Insert pool entries for:
- Casey Underwood (CU) → role_codes: `['R5_MP', 'R5_AGG']`
- Evelyn Rhodes (ER) → role_codes: `['R7_MP', 'R7_AGG']`  
- Frank Coleman (FC) → role_codes: `['R8']`

Uses `upsert` on `email` conflict. Links `user_id` from the `userIds` array created in Step 2. Empty `domain_scope` arrays = match all challenges.

### 3. Frontend Convergence Update

Update `src/lib/convergenceUtils.ts` and any hardcoded conflict expectations if needed — but since the convergence matrix is DB-driven, the frontend Role Convergence admin page will reflect the new 12-row matrix automatically after migration.

### 4. Supabase Types Regeneration

The `user_id` column already exists on `platform_provider_pool` from a prior migration. Types may already include it. Verify after migration and regenerate if needed.

## Technical Details

- The `pool_email_unique` UNIQUE constraint already exists from prior migrations — the new migration will use `ADD CONSTRAINT IF NOT EXISTS` pattern or skip if already present.
- `complete_phase` parameter order is `(p_challenge_id, p_user_id)` — matching the latest migration. The proposed SQL in the user's prompt uses this order correctly.
- The `validate_role_assignment` function is already binary (HARD_BLOCK/ALLOWED) and filters by `governance_profile` — it will automatically use the new 12-row matrix.
- No frontend hook changes needed — `useAutoAssignChallengeRoles.ts` already queries `user_id` from `platform_provider_pool`.

## Files Changed

1. **New migration SQL** — All 4 DB fixes (conflict rules, initialize_challenge, auto_assign, complete_phase)
2. **`supabase/functions/setup-test-scenario/index.ts`** — Add pool entries after user creation
3. **`src/integrations/supabase/types.ts`** — Auto-regenerated (if needed)

