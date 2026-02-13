

# Fix: Admin Sidebar Links Crashing on `/org/*` Routes

## Root Cause

There are **two separate issues** causing the error:

### Issue 1: Admin sidebar links point to `/org/*` routes
The "Seeker Management" group in `AdminSidebar.tsx` contains three links that navigate to `/org/membership`, `/org/team`, and `/org/billing`. These routes are wrapped in `SeekerGuard` -> `OrgProvider`, which calls `useCurrentOrg()`. Since admin users don't have an `org_users` record, the hook returns `null` and the "No Organization Found" error screen appears.

### Issue 2: `useCurrentOrg` query returns HTTP 300 (ambiguous FK)
Even for users who DO have an `org_users` record, the query fails because PostgREST cannot determine which FK to use when joining `org_users` to `seeker_organizations`. The `org_users` table has three FKs to `seeker_organizations`: `organization_id`, `subsidiary_org_id`, and `tenant_id`. The query must specify the exact FK relationship.

## Fix

### 1. Change Admin sidebar `/org/*` links to `/admin/*` routes

Since Membership, Team Management, and Billing are generic platform configuration pages (not tied to a specific organization), they should be admin-scoped routes. Update the `seekerItems` array paths:

**File: `src/components/admin/AdminSidebar.tsx`**
- Change `/org/membership` to `/admin/membership-tiers` (admin view of membership tier configuration)
- Change `/org/team` to `/admin/saas-agreements` (already exists -- or keep SaaS Agreements as the only item)
- Change `/org/billing` to `/admin/billing-overview` (admin billing overview)

However, since these pages (Membership, Team, Billing) were designed as **org-specific management pages** (not generic config), the simplest correct fix is to **remove them from the Admin sidebar entirely**. They already exist in the Org sidebar for organization users. The Admin sidebar should only contain the SaaS Agreements link under "Seeker Management."

**Change:** Remove Membership, Team Management, and Billing from `seekerItems`, keeping only SaaS Agreements.

### 2. Fix the ambiguous FK in `useCurrentOrg` query

**File: `src/hooks/queries/useCurrentOrg.ts`**
- Change the join hint from `seeker_organizations!inner` to `seeker_organizations!org_users_organization_id_fkey` to explicitly specify which FK relationship to use.

This fixes the HTTP 300 error for org users who do have valid `org_users` records.

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Remove `/org/*` links from `seekerItems`, keep only SaaS Agreements |
| `src/hooks/queries/useCurrentOrg.ts` | Disambiguate FK join: use `seeker_organizations!org_users_organization_id_fkey` |

## Technical Details

The `useCurrentOrg.ts` select statement changes from:
```
seeker_organizations!inner (...)
```
to:
```
seeker_organizations!org_users_organization_id_fkey (...)
```

The `seekerItems` array in `AdminSidebar.tsx` changes from 4 items to 1 item (SaaS Agreements only). The `Crown` icon import can also be removed.
