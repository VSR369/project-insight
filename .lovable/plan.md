

# Fix: `useOrgContext must be used within OrgProvider`

## Root Cause

`CurationQueuePage` calls `useOrgContext()` (line 194), which requires the component to be wrapped in `OrgProvider`. However, the `/cogni/*` routes are rendered inside `CogniShell`, which does **not** include `OrgProvider`.

## Fix — `src/pages/cogniblend/CurationQueuePage.tsx`

Replace `useOrgContext` with `useCurrentOrg` (the standalone React Query hook that doesn't need a provider):

1. **Change import** (line 16): `useOrgContext` → `useCurrentOrg` from `@/hooks/queries/useCurrentOrg`
2. **Change usage** (line 194): `const { organizationId } = useOrgContext()` → `const { data: currentOrg } = useCurrentOrg()`
3. **Derive organizationId**: `const organizationId = currentOrg?.organizationId`
4. **Guard the main query**: add `enabled: !!organizationId` to the challenges fetch query to avoid querying with undefined org ID

One file, four lines changed.

