

# Fix: Tier Limit System + Registration Type Gap

## Problem

1. **Tier limit blocks all challenges**: `max_concurrent_active` is hardcoded to `1` for ALL organizations (set by migration `20260317040036`). Even "premium" orgs with unlimited challenges get blocked. The `check_tier_limit` RPC reads from these hardcoded columns instead of the actual `md_subscription_tiers` table.

2. **Registration type gap**: `website_url` is missing from the `OrganizationIdentityData` TypeScript interface (accessed via `as any` cast in the form — works but is a type hole).

## Root Cause

The `check_tier_limit` function reads `max_concurrent_active` and `max_cumulative_quota` directly from `seeker_organizations`, which default to `1` and `5` respectively. Meanwhile, `md_subscription_tiers.max_challenges` has the correct values: Basic=3, Standard=15, Premium=NULL (unlimited), Enterprise=NULL (unlimited).

## Fix Plan

### Step 1: Database Migration — Fix the RPC function + update existing data

**Single migration** that:

1. **Updates all existing orgs** to sync `max_concurrent_active` from their tier's `max_challenges`:
```sql
UPDATE seeker_organizations so
SET max_concurrent_active = COALESCE(t.max_challenges, 999999),
    max_cumulative_quota = COALESCE(t.max_challenges * 10, 999999)
FROM md_subscription_tiers t
WHERE so.subscription_tier = t.code;
```

2. **Replaces `check_tier_limit` function** to read from `md_subscription_tiers` directly (via join on `subscription_tier = code`), falling back to generous defaults if no tier match. This makes the function tier-aware and decouples it from the hardcoded columns.

### Step 2: Fix TypeScript type

**File: `src/types/registration.ts`** — Add `website_url?: string` to `OrganizationIdentityData` interface.

### Step 3: Remove `as any` cast

**File: `src/components/registration/OrganizationIdentityForm.tsx`** — Change `(state.step1 as any)?.website_url` to `state.step1?.website_url`.

## Files Changed

| File | Action |
|------|--------|
| Database migration | **New** — Update org limits + replace `check_tier_limit` RPC |
| `src/types/registration.ts` | **Modified** — Add `website_url` to interface |
| `src/components/registration/OrganizationIdentityForm.tsx` | **Modified** — Remove `as any` cast |

## Impact

- All existing orgs get correct limits matching their tier
- Premium/Enterprise orgs get unlimited challenges
- Future tier changes automatically reflected via the join
- No more "Challenge Limit Reached" false positives

