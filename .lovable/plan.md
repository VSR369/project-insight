

# Fix: Curator Queue Permission Gate (Chicken-and-Egg Problem)

## Root Cause

The `CurationQueuePage` permission check (lines 200-215) queries `user_challenge_roles` for any row where `role_code = 'CU'` and `is_active = true`. Since no CU has ever been assigned to the challenge (only CR exists), the query returns empty and the page shows "You do not have the Curator (CU) role."

This is a chicken-and-egg problem: the Curator needs to see the queue to claim challenges, but the queue blocks them because they haven't been assigned to any challenge yet.

## Fix

### File: `src/pages/cogniblend/CurationQueuePage.tsx`

**Replace** the database-based permission check (lines 200-215) with the existing `useCogniPermissions()` hook:

```typescript
// BEFORE (broken):
const { data: hasPermission, isLoading: permLoading } = useQuery({
  queryKey: ["curation-permission", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("user_challenge_roles")
      .select("challenge_id")
      .eq("user_id", user!.id)
      .eq("role_code", "CU")
      .eq("is_active", true)
      .limit(1);
    return (data ?? []).length > 0;
  },
  ...
});

// AFTER (fixed):
const { canSeeCurationQueue } = useCogniPermissions();
```

Then update the conditional return (line 359) from `if (!hasPermission)` to `if (!canSeeCurationQueue)`, and remove the `permLoading` reference from the loading check.

This uses the platform-level role context (`availableRoles` from `CogniRoleContext`) which checks if the user holds the CU capability at the org level — independent of whether they're assigned to any specific challenge yet.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationQueuePage.tsx` | Replace DB permission query with `useCogniPermissions().canSeeCurationQueue`; remove `permLoading` |

### No Other Changes Needed

- The data query (lines 220-235) already fetches all org challenges in phases 1-3 regardless of CU assignment — correct as-is
- The challenge row shows "Unassigned" badge when no CU is assigned — correct as-is
- The existing `useCogniPermissions` hook and `CogniRoleContext` already provide the right permission model

