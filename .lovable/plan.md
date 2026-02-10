
# Fix: Registration Save Hanging and Fields Disappearing

## Root Cause

The **FK constraint** on `seeker_org_industries.tenant_id` references `seeker_organizations.id` (not a separate tenants table). The current code generates two separate UUIDs:

- `orgId` -- inserted as `seeker_organizations.id`
- `tenantId` -- inserted as `seeker_organizations.tenant_id` AND used as `tenant_id` in child tables

But the FK requires `seeker_org_industries.tenant_id` to match an existing `seeker_organizations.id`. Since `tenantId` is a different UUID from `orgId`, the FK check fails with a 409 error.

Similarly, `seeker_organizations.tenant_id` itself has a self-referencing FK (`REFERENCES seeker_organizations(id) DEFERRABLE INITIALLY DEFERRED`), meaning `tenant_id` on the org must also equal the org's own `id`.

The "fields disappearing" and "hanging" are side effects: the mutation throws an error, the form gets stuck in `isPending` state, and on retry the duplicate check finds the already-inserted org.

## Fix (1 file)

### `src/hooks/queries/useRegistrationData.ts`

1. Use a **single UUID** for both `id` and `tenant_id` on `seeker_organizations` (self-referencing FK requires this).
2. Use that same ID as `tenant_id` on `seeker_org_industries`.
3. Wrap the child inserts in proper error handling so a partial failure on industries/geographies does not leave the form hanging.
4. Delete the partially created org if child inserts fail (cleanup on error).

```text
Before:  orgId = randomUUID(), tenantId = randomUUID()  (two different IDs)
After:   orgId = randomUUID(), tenantId = orgId          (same ID, satisfies FK)
```

## Technical Details

The key change in the mutation function:

```typescript
const orgId = crypto.randomUUID();
const tenantId = orgId; // Self-referencing FK requires tenant_id = id
```

For cleanup on partial failure, wrap the child inserts in a try/catch that deletes the org record if industries or geographies fail:

```typescript
try {
  // insert industries...
  // insert geographies...
} catch (childError) {
  // Cleanup: delete the org we just created
  await supabase.from('seeker_organizations').delete().eq('id', orgId);
  throw childError;
}
```
