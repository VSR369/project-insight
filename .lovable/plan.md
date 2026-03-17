

# Plan: Fix Remaining 5 DB-Dependent Issues

From the M-11 test, the 5 items that could not be live-verified were all dependent on proper database state. After thorough DB inspection, here is the status and fix plan:

## Current State Assessment

All required DB infrastructure **already exists**:
- `initialize_challenge`, `complete_phase`, `check_tier_limit`, `get_tier_usage` RPCs are deployed and functional
- `challenges` table has all needed columns (`problem_statement`, `scope`, `reward_structure`, `phase_schedule`, `eligibility`, `operating_model`, `master_status`, `current_phase`)
- `user_challenge_roles` table exists with proper RLS
- `role_assignments` table exists for architect lookup (R3 role)
- `seeker_organizations` has `phase1_bypass`, `operating_model`, `max_concurrent_active`, `subscription_tier`
- `phase_status` defaults to `'ACTIVE'` -- no mismatch

## The 5 Remaining Items & Fixes

### 1. GATE-01 (Tier Limit Blocking)
**Status**: Code + DB are correct. `check_tier_limit` RPC works. The form correctly shows `TierLimitModal` when `allowed = false`.
**Fix needed**: The org's `max_concurrent_active` and `subscription_tier` columns need **seed data**. Without values, the RPC defaults to 999999 (effectively unlimited), so the gate never triggers.
**Action**: Insert/update the test org's `seeker_organizations` row to set `max_concurrent_active = 3` and `subscription_tier = 'Starter'` so the gate can be tested.

### 2. AGG Model + Phase 1 Bypass Banner
**Status**: Code is correct. `useOrgModelContext` queries `operating_model` and `phase1_bypass`.
**Fix needed**: The test org needs `operating_model = 'AGG'` and `phase1_bypass = true` to see the blue bypass banner.
**Action**: Update the test org's `seeker_organizations` to set these values for testing.

### 3. MP Model + Architect Assignment
**Status**: Code is correct. `useChallengeArchitects` queries `role_assignments` for `role_code = 'R3'`.
**Fix needed**: The test org needs `operating_model = 'MP'` AND at least one user with an active R3 role assignment in `role_assignments`.
**Action**: Set org to MP model and insert an R3 role assignment for a test user.

### 4. Submission Flow (initialize_challenge → update → complete_phase)
**Status**: All RPCs exist and the orchestration in `useSubmitSolutionRequest` is correct. However, `complete_phase` requires the submitting user to have the correct role via `can_perform()` check.
**Fix needed**: The `auto_assign_roles_on_creation` function (called by `initialize_challenge`) must assign the creator the appropriate role for Phase 1 (likely AM for MP or RQ for AGG). If this function doesn't exist or doesn't assign correctly, `complete_phase` will fail with "You do not have permission."
**Action**: Verify `auto_assign_roles_on_creation` exists and correctly assigns roles. If missing, create it.

### 5. Duplicate Detection Query
**Status**: Code is correct. The `.or()` filter with `.ilike()` works on the `challenges` table.
**Fix needed**: Needs at least 2 existing challenges in the org with `master_status IN ('DRAFT', 'ACTIVE')` and matching keywords in `title` or `problem_statement`.
**Action**: Insert 2-3 sample challenges with recognizable problem statements.

## Implementation Plan

### Step 1: Verify `auto_assign_roles_on_creation` function
Check if this function exists and creates the right role entries. If missing, create a migration that defines it to auto-assign AM (for MP) or RQ (for AGG) to the creator.

### Step 2: Seed test data via SQL inserts
Using the Supabase insert tool:
- Update the test org with `operating_model`, `max_concurrent_active`, `subscription_tier`
- Insert R3 role assignments for architect dropdown testing
- Insert sample challenges for duplicate detection testing

### Step 3: Verify `eligibility` column type
The code stores `eligibility` via `JSON.stringify()` but the column type is `text`. This works but is fragile. The list page parses it back. No code change needed but worth noting.

## Summary

**No frontend code changes required.** All 5 issues are caused by missing test/seed data and potentially one missing DB function (`auto_assign_roles_on_creation`). The fix involves:
1. One potential migration (if `auto_assign_roles_on_creation` is missing)
2. Seed data inserts for the test organization

