

## Plan: Fix Admin Account Seeding and Ensure Role-Based Access Works

### Root Cause

All 3 auth users and `user_roles` records exist, but **`platform_admin_profiles` is empty** for all 3 accounts. The insert fails silently because the `fn_validate_industry_expertise` trigger rejects rows without at least one industry expertise entry (`BR-MPA-003`).

Without a profile, `useAdminTier` returns `null`, so:
- Dashboard shows no tier badge
- All tier-gated cards are hidden
- TierGuard redirects everything
- The admin experience is broken for all three accounts

### Fix

**File: `supabase/functions/seed-admin-test-accounts/index.ts`**

Add `industry_expertise` (a text array) to the profile insert with a default value like `['Technology']`. This satisfies the trigger:

```typescript
.insert({
  user_id: userId,
  email: account.email,
  full_name: `${account.firstName} ${account.lastName}`,
  admin_tier: account.adminTier,
  industry_expertise: ['Technology'],
})
```

That's the only change needed. After redeploying, the user clicks "Seed Admin Accounts" on the Smoke Test page, and all 3 profiles will be created with the correct tiers.

### Verification

Once seeded, logging in as each account will show:
- **Basic Admin** (`basicadmin@test.local`): Dashboard with core cards only (Master Data, Taxonomy, etc.). No Seeker Config, Platform Admins, or Settings in sidebar or dashboard.
- **Senior Admin** (`senioradmin@test.local`): Everything Basic Admin sees + Seeker Config, Platform Admins (view-only), Settings, Enterprise Agreements.
- **Supervisor** (`admin@test.local`): Everything Senior Admin sees + Compliance Config, full CRUD on Platform Admins.

### Files Modified
- `supabase/functions/seed-admin-test-accounts/index.ts` — Add `industry_expertise` to profile insert

