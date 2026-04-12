

## Fix: Digest Delete RLS + Regenerate Error Handling

### Problem Summary

1. **DELETE RLS policy is wrong** — current policy allows only `created_by` (challenge creator), but creators don't use the Context Library. Only **curators** and **platform admins** should have delete access.
2. **Regenerate shows cryptic error** — when "Generate Context" is clicked with no accepted sources, the edge function returns `NO_SOURCES` / `NO_EXTRACTABLE_CONTENT`, but the frontend displays the raw error message instead of a user-friendly toast.

### Changes

**1. Migration: Replace DELETE policy on `challenge_context_digest`**

Drop the wrong `creator_can_delete_digest` policy. Create a new `curator_can_delete_digest` policy matching the same pattern as the existing `curator_can_update_digest` — checking `challenge_role_assignments` via `platform_provider_pool` for curator/admin roles:

```sql
DROP POLICY IF EXISTS "creator_can_delete_digest" ON public.challenge_context_digest;

CREATE POLICY "curator_can_delete_digest"
ON public.challenge_context_digest
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_role_assignments cra
    WHERE cra.challenge_id = challenge_context_digest.challenge_id
      AND cra.pool_member_id IN (
        SELECT pp.id FROM public.platform_provider_pool pp WHERE pp.user_id = auth.uid()
      )
      AND cra.role_code IN ('CU', 'SA', 'PA')
      AND cra.status = 'active'
  )
);
```

**2. `useRegenerateDigest` — friendly error messages for no-source cases**

Update the `onError` handler to detect `NO_SOURCES` and `NO_EXTRACTABLE_CONTENT` error codes from the edge function response and show a helpful message like "No accepted sources available. Accept some sources first, then generate the digest." instead of the raw error string.

**3. `useClearAllSources` — verify digest was actually deleted**

Add a post-delete check: after the `.delete()` call, query for the row. If it still exists, throw an explicit error so the user sees the failure instead of a false success toast. Also explicitly set the digest query cache to `null` on success.

### Files

| # | File | Change |
|---|------|--------|
| 1 | New migration `.sql` | Drop creator policy, add curator/admin DELETE policy |
| 2 | `src/hooks/cogniblend/useContextLibrary.ts` | Friendly error in `useRegenerateDigest.onError`; verify delete in `useClearAllSources` |

