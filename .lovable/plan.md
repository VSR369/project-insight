

# Fix Plan: Pool Constraint + Seed Robustness

## Problem

The demo seed fails to create/update pool entries because `onConflict: 'email'` requires a full UNIQUE constraint, but only a partial index (`WHERE is_active = TRUE`) exists. This means Casey, Evelyn, and Frank never get pool entries — breaking auto-assignment entirely.

## Changes

### 1. Migration: Add proper UNIQUE constraint on `platform_provider_pool.email`

```sql
DROP INDEX IF EXISTS idx_pool_email_unique;
ALTER TABLE public.platform_provider_pool
  ADD CONSTRAINT platform_provider_pool_email_key UNIQUE (email);
```

This replaces the partial index with a real constraint that PostgREST can resolve for upsert operations.

### 2. Edge function: Replace upsert with defensive SELECT + INSERT/UPDATE

**File:** `supabase/functions/setup-test-scenario/index.ts` (~lines 436-462)

Replace the `.upsert(...)` call with:
- `SELECT id FROM platform_provider_pool WHERE email = ?` via `.maybeSingle()`
- If exists: `.update({...}).eq('id', existing.id)`
- If not: `.insert({...})`

This works regardless of constraint configuration and is fully idempotent.

### 3. Fix phase labels in seed log messages

**File:** `supabase/functions/setup-test-scenario/index.ts` (lines 355, 394)

Replace `"Phase 2 — SPEC_REVIEW"` with `"Phase 2 — COMPLIANCE"` (2 occurrences).

---

## Technical Notes

- Steps 2-5 from the original pipeline fix plan are already implemented and verified (catch blocks have logging, governance mode resolution works, `pool_member_id` is nullable, org_users fallback exists).
- The UNIQUE constraint change means deactivated pool members with the same email cannot be re-added. This is acceptable — email should be globally unique in the pool regardless of active status.
- Edge function will be redeployed after code changes.

## Verification

After applying: re-seed and confirm all three pool entries show `✅ Pool: ... user_id=linked` with zero `⚠️` warnings.

