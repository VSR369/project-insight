

## Plan: Fix Curator Permission Check on Curation Queue Page

### Problem
The Curation Queue page (`/cogni/curation`) checks for CU role access by querying the `challenge_role_assignments` table (resource pool assignments). But the actual CU role is stored in the `user_challenge_roles` table. This causes the page to incorrectly deny access to valid Curators.

The network logs confirm: `challenge_role_assignments` returns `[]`, while `user_challenge_roles` has an active CU record for the logged-in user.

### Fix

**File: `src/pages/cogniblend/CurationQueuePage.tsx`** — Lines 133-149

Replace the permission query to check `user_challenge_roles` instead of `challenge_role_assignments`:

```typescript
const { data: hasPermission, isLoading: permLoading } = useQuery({
  queryKey: ["curation-permission", user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_challenge_roles")
      .select("challenge_id")
      .eq("user_id", user!.id)
      .eq("role_code", "CU")
      .eq("is_active", true)
      .limit(1);
    if (error) return false;
    return (data ?? []).length > 0;
  },
  enabled: !!user?.id,
  staleTime: 60_000,
});
```

This is the correct table — it matches the same source used by `get_user_all_challenge_roles` RPC and `useCogniUserRoles` hook.

### Files Modified
- `src/pages/cogniblend/CurationQueuePage.tsx` (single query fix)

