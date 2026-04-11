

## Root Cause: "Challenge Not Found" on Curation Review Page

### The Bug

When Casey clicks a challenge in the Curation Queue, the page shows "Challenge not found." despite the challenge existing and Casey having the CU role.

**Root cause:** The `challenges` table has **two foreign keys** pointing to `seeker_organizations`:
- `organization_id` → `seeker_organizations.id` (the intended one)
- `tenant_id` → `seeker_organizations.id` (a second FK)

The curation review query uses this join:
```
seeker_organizations(organization_type_id, organization_types(name))
```

PostgREST cannot resolve which FK to follow, so it returns **HTTP 300 (Multiple Choices)** instead of data. The `.single()` call throws an error, `challenge` becomes `undefined`, and the page renders "Challenge not found."

### The Fix (1 file, 1 line)

**File: `src/hooks/cogniblend/useCurationPageData.ts` (line 41)**

Change the ambiguous join to use an explicit FK hint:

```
// Before:
"seeker_organizations(organization_type_id, organization_types(name))"

// After:
"seeker_organizations!challenges_organization_id_fkey(organization_type_id, organization_types(name))"
```

This tells PostgREST to use the `organization_id` FK, resolving the ambiguity. No migration needed — this is purely a client-side query fix.

### Scope Check

- No other changes needed
- The DB function `has_active_challenge_role` correctly grants Casey SELECT access through RLS
- The `seeker_organizations` RLS also passes because Casey is in `org_users` for the same org

