

## 5 WHY Analysis: Seeking Organization Login Failure

### WHY 1: Why can't the seeking org user log in?
After authentication succeeds (Supabase Auth), the Login page queries `org_users` to check if the user has an active organization membership (line 254-259). This query returns **zero rows**, so the code falls through to "No organization account found" and either signs the user out or redirects to a provider portal.

### WHY 2: Why does the `org_users` query return zero rows?
The `org_users` table has RLS enabled with a single policy:
```text
USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'platform_admin'))
```
This policy calls `get_user_tenant_id()` to determine the user's tenant before allowing the SELECT.

### WHY 3: Why does `get_user_tenant_id()` fail to resolve the tenant?
The function is defined as:
```sql
SELECT tenant_id FROM org_users
WHERE user_id = auth.uid() AND is_active = TRUE
LIMIT 1;
```
This inner query **also reads `org_users`**, which is subject to the same RLS policy. Since no tenant is resolved yet, the inner query returns nothing.

### WHY 4: Why does the inner query also return nothing?
Because PostgreSQL evaluates RLS policies on every query against the table, including queries made *within* RLS policy functions. The inner `SELECT` triggers the same policy, which calls `get_user_tenant_id()` again, creating an infinite loop that Postgres short-circuits by returning empty results.

### WHY 5: Why is there no alternative access path for users to read their own membership?
There is only **one** RLS policy on `org_users` (the tenant isolation policy). There is no self-access policy like `user_id = auth.uid()` that would allow users to read their own rows without needing tenant resolution first. This single-policy design creates a **circular dependency** that blocks all non-admin users.

---

## Root Cause Summary

| Layer | Problem |
|---|---|
| `org_users` RLS | Only policy requires `get_user_tenant_id()` which itself queries `org_users` under RLS — **circular dependency** |
| `seeker_organizations` RLS | SELECT policy also uses `get_user_tenant_id()`, so the join in `useCurrentOrg` also fails |
| `get_user_tenant_id()` function | Defined as `SECURITY INVOKER` (default), so its internal query is subject to caller's RLS |
| No self-access policy | Users cannot read their own `org_users` rows without tenant resolution |

---

## Fix: Two New RLS Policies (Database-Only Change)

### Change 1: Self-access policy on `org_users`

Add a SELECT policy allowing users to always read their own membership rows:

```sql
CREATE POLICY "Users read own memberships"
  ON public.org_users
  FOR SELECT
  USING (user_id = auth.uid());
```

This breaks the circular dependency. When a user queries `org_users`, this policy matches on `user_id = auth.uid()` directly — no need to call `get_user_tenant_id()`.

### Change 2: Membership-based policy on `seeker_organizations`

Add a SELECT policy so org members can read their organization's data (defense-in-depth for the join in `useCurrentOrg`):

```sql
CREATE POLICY "Org members read own org"
  ON public.seeker_organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM org_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );
```

### No Frontend Code Changes

The Login page logic (lines 254-259) and `useCurrentOrg` hook are correct. They simply receive zero rows due to the RLS circular dependency. Once the policies are added, all queries will resolve correctly.

### Security Verification

- The self-access policy is secure: users can only see rows where `user_id` matches their own `auth.uid()`
- The existing tenant isolation policy remains for cross-user queries (e.g., listing all tenant members)
- The `seeker_organizations` policy scopes access to organizations where the user has an active membership
- Platform admin bypass is preserved in both new policies

### Additional Note: "Failed to fetch" Errors

The console logs also show `TypeError: Failed to fetch` on the auth endpoint. This is a **transient network issue** in the Lovable preview environment (CORS/connectivity), not a code bug. The auth request never reaches Supabase (auth logs are empty). Retrying the login should work once the preview iframe is refreshed. This is separate from the RLS root cause.

