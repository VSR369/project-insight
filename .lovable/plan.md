

## Holistic Analysis: Login & Data Fetching Across All User Types

### Investigation Summary

I examined the RLS policies, database functions, and login flow for all four user types: **Platform Admin, Reviewer, Provider, and Seeking Organization**.

---

### Finding 1: Login Detection Works for ALL User Types

The `Login.tsx` (lines 239-260) queries four tables in parallel after authentication. Each has proper self-access policies:

| Table | Self-Access Policy | Login Detection |
|---|---|---|
| `user_roles` | `user_id = auth.uid()` | Admin detection works |
| `panel_reviewers` | `user_id = auth.uid()` | Reviewer detection works |
| `solution_providers` | `user_id = auth.uid()` | Provider detection works |
| `org_users` | **No self-access policy** | Relies on `get_user_tenant_id()` |

For `org_users`, the tenant isolation policy calls `get_user_tenant_id()`, which is `SECURITY DEFINER` owned by `postgres` (with `BYPASSRLS`). This means the function **can** resolve the tenant internally. So login detection technically works, but it depends on a fragile chain. Adding a direct self-access policy is essential defense-in-depth.

---

### Finding 2: The REAL Bug — Wrong Table Name in `useCurrentOrg`

**This is the primary cause of seeking org failures after login.**

In `src/hooks/queries/useCurrentOrg.ts` (line 38), the PostgREST embedded query references `org_subscriptions`:

```
seeker_organizations!org_users_organization_id_fkey (
  ...
  org_subscriptions (           ← THIS TABLE DOES NOT EXIST
    md_subscription_tiers ( code )
  )
)
```

The actual table is **`seeker_subscriptions`**, not `org_subscriptions`. PostgREST returns a 400 error ("Could not find a relationship between seeker_organizations and org_subscriptions"), which causes the entire `useCurrentOrg` query to fail. The `OrgProvider` then shows "No Organization Found."

**This is a seeking-org-specific problem.** Providers, reviewers, and admins do not go through `useCurrentOrg` / `OrgProvider`, so they are unaffected.

---

### Finding 3: "Failed to Fetch" Errors Are Transient

All console errors show `TypeError: Failed to fetch` on `signInWithPassword`. The auth logs are empty (no requests reached Supabase). This is a transient network/CORS issue in the Lovable preview environment, not a code bug. Refreshing the preview and retrying resolves it.

---

### Fix Plan

#### Change 1: Fix embedded resource name in `useCurrentOrg.ts`

Replace `org_subscriptions` with `seeker_subscriptions` in two places:

**Line 38** — PostgREST query:
```typescript
// BEFORE
org_subscriptions (
  md_subscription_tiers ( code )
)

// AFTER
seeker_subscriptions (
  md_subscription_tiers ( code )
)
```

**Line 52** — Data access:
```typescript
// BEFORE
const tierCode = org?.org_subscriptions?.[0]?.md_subscription_tiers?.code ?? null;

// AFTER
const tierCode = org?.seeker_subscriptions?.[0]?.md_subscription_tiers?.code ?? null;
```

#### Change 2: Add self-access RLS policy on `org_users` (defense-in-depth)

```sql
CREATE POLICY "Users read own memberships"
  ON public.org_users
  FOR SELECT
  USING (user_id = auth.uid());
```

Even though `get_user_tenant_id()` works via SECURITY DEFINER, this provides a direct, non-fragile access path for users to read their own membership rows.

#### Change 3: Add membership-based RLS policy on `seeker_organizations` (defense-in-depth)

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

---

### Impact Summary

| User Type | Current Status | After Fix |
|---|---|---|
| Platform Admin | Works | Works (unchanged) |
| Panel Reviewer | Works | Works (unchanged) |
| Solution Provider | Works | Works (unchanged) |
| **Seeking Organization** | **Fails** — wrong table name in `useCurrentOrg` | **Fixed** — correct table name + RLS hardening |

### Security Notes

- Self-access policy is secure: users can only see rows where `user_id` matches their own `auth.uid()`
- Existing tenant isolation policy remains for cross-user queries
- No existing policies are modified or removed

