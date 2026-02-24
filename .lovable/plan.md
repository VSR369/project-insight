

## Root Cause: Circular RLS Dependency on `org_users`

The `org_users` table has a single RLS policy:

```sql
-- Current policy
USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'platform_admin'))
```

The `get_user_tenant_id()` function is defined as:

```sql
SELECT tenant_id FROM org_users
WHERE user_id = auth.uid() AND is_active = TRUE
LIMIT 1;
```

**This is circular.** To read `org_users`, the policy calls `get_user_tenant_id()`, which itself reads `org_users` — but that inner read is also subject to RLS. Since no `tenant_id` is resolved yet, the inner query returns nothing, so the outer query also returns nothing.

**Result:** After login, both the Login page (`org_users` check at line 258) and `useCurrentOrg` (used by `OrgProvider`) get zero rows back. The user is told "No organization account found" or shown the "No Organization Found" screen — even though a valid `org_users` record exists.

The same circular problem cascades to `seeker_organizations`, which also uses `get_user_tenant_id()` in its SELECT policy, meaning the joined data in `useCurrentOrg` also fails.

## Fix

Add a **self-access policy** to `org_users` that allows a user to read their own rows by `user_id = auth.uid()`, bypassing the tenant resolution entirely. This is secure because users should always be able to see which organizations they belong to.

### Database Change

```sql
-- Allow users to read their own org_users records (breaks circular RLS dependency)
CREATE POLICY "Users read own memberships"
  ON public.org_users
  FOR SELECT
  USING (user_id = auth.uid());
```

The existing tenant isolation policy remains for cross-user queries (e.g., listing all members of a tenant). The new policy adds a second path: "I can always see my own rows."

### Seeker Organizations — Same Fix Needed

`seeker_organizations` SELECT policy also depends on `get_user_tenant_id()`. Once `org_users` is readable, `get_user_tenant_id()` will resolve correctly, so the join in `useCurrentOrg` will also work. However, as defense-in-depth, we should also ensure the `seeker_organizations` read policy allows access for users who are members:

```sql
-- Allow org members to read their organization
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

### No Code Changes Needed

The Login page and `useCurrentOrg` hook logic are correct. The queries simply return no data due to the RLS circular dependency. Once the policies are fixed, everything will work as-is.

### Summary of Changes

| Change | What |
|---|---|
| New RLS policy on `org_users` | `user_id = auth.uid()` for SELECT — breaks circular dependency |
| New RLS policy on `seeker_organizations` | Membership-based SELECT — defense-in-depth for the join in `useCurrentOrg` |
| No frontend changes | Login redirect logic and `OrgProvider` are already correct |

