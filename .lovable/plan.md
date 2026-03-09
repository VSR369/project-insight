

# Plan: Add "Primary SO Admin" Quick Login Test Account

## What Needs to Happen

1. **Update the seed edge function** to also provision a Primary Seeking Org Admin test account (`soadmin@test.local` / `SOAdmin123!`):
   - Create auth user
   - Create a `seeker_organizations` record (verified) if none exists for testing
   - Insert `org_users` record linking user to org
   - Insert `seeking_org_admins` record with `admin_tier = 'PRIMARY'`, `status = 'active'`
   - Assign `seeker` role in `user_roles`

2. **Add the account to `DEV_ACCOUNTS`** in `Login.tsx` with `portal: 'organization'` so it appears under "Portal Accounts" section with a Building2 icon.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/seed-admin-test-accounts/index.ts` | Add SO Admin provisioning block after platform admin loop — creates org, org_users, seeking_org_admins records |
| `src/pages/Login.tsx` | Add `{ role: 'Primary SO Admin', email: 'soadmin@test.local', password: 'SOAdmin123!', icon: Building2, description: 'Org admin portal', color: 'text-teal-600', portal: 'organization' }` to `DEV_ACCOUNTS` array |
| `supabase/config.toml` | Already has `seed-admin-test-accounts` with `verify_jwt = false` — no change needed |

## Seed Function Logic for SO Admin

```
1. Create/find auth user: soadmin@test.local / SOAdmin123!
2. Upsert seeker_organizations: "Test Seeking Org" (verified status, using existing org or creating one)
3. Upsert org_users: link user_id to organization_id, role='admin', is_active=true
4. Upsert seeking_org_admins: admin_tier='PRIMARY', status='active', designation_method='SELF', domain_scope='{}'
5. Assign user_roles: role='seeker'
```

Uses the first existing `seeker_organizations` record if available, otherwise creates a new one. The `tenant_id` for `org_users` will match the org's `tenant_id`.

