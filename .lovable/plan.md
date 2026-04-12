

## Fix: Digest Not Cleared on "Clear All"

### Root Cause

The `challenge_context_digest` table has RLS enabled but **no DELETE policy** for authenticated users. Current policies:
- `auth_read_context_digest` — SELECT only
- `curator_can_update_digest` — UPDATE only  
- `svc_manage_context_digest` — ALL (likely service_role only)

When `useClearAllSources` calls `.delete().eq('challenge_id', challengeId)`, Supabase silently returns 0 rows affected (no error thrown) because RLS blocks the delete. The attachments table likely has a DELETE policy, which is why sources clear but the digest doesn't.

### Fix

**1. Migration: Add DELETE policy on `challenge_context_digest`**

Add a policy allowing authenticated users who are curators/creators of the challenge to delete the digest:

```sql
CREATE POLICY "curator_can_delete_digest"
ON public.challenge_context_digest
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_context_digest.challenge_id
    AND (c.created_by = auth.uid() OR c.curator_id = auth.uid())
  )
);
```

**2. `useClearAllSources` — throw on digest delete failure**

Currently the digest delete has no error check (line 489-492). Add error handling so failures are visible:

```typescript
const { error: digestErr } = await supabase
  .from('challenge_context_digest')
  .delete()
  .eq('challenge_id', challengeId);
if (digestErr) throw new Error(digestErr.message);
```

### Files

| # | File | Change |
|---|------|--------|
| 1 | New migration | Add DELETE RLS policy on `challenge_context_digest` |
| 2 | `useContextLibrary.ts` | Add error check on digest delete (1 line) |

