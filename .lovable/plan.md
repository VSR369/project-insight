

## Fix: Seed Admin Test Accounts — Profile Creation Failing

### Root Cause

The `seed-admin-test-accounts` edge function tries to insert columns that **don't exist** in `platform_admin_profiles`:
- `status` — not a column
- `is_active` — not a column  
- `designation_method` — not a column
- `admin_type` — not a column

The actual table only has: `id, user_id, full_name, email, phone, is_supervisor, industry_expertise, country_region_expertise, org_type_expertise, max_concurrent_verifications, current_active_verifications, availability_status, assignment_priority, leave_start_date, leave_end_date, last_assignment_timestamp, created_at, updated_at, created_by, updated_by, admin_tier`.

Auth users and `user_roles` records were created successfully. Only the `platform_admin_profiles` insert failed. So the accounts exist but have no profile — causing login to work but admin tier detection (`useAdminTier`) to return null, which breaks tier-based navigation.

### Fix

**File: `supabase/functions/seed-admin-test-accounts/index.ts`** (lines 121-133)

Remove the non-existent columns from the insert. Use only valid columns:

```typescript
.insert({
  user_id: userId,
  email: account.email,
  full_name: `${account.firstName} ${account.lastName}`,
  admin_tier: account.adminTier,
})
```

Then redeploy the edge function and invoke it again to create the missing profiles for the two new accounts (and fix admin@test.local's profile if it's also missing one).

### Files Modified
- `supabase/functions/seed-admin-test-accounts/index.ts` — Remove invalid columns from profile insert

