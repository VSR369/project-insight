

# Fix: Contact Details Source & Assign Deep-Link

## Problem 1: "Contact Details — Not configured"

**Root cause**: `SoaContactDetailsPanel` imports `useAdminContact()` which reads from `rbac_admin_contact` — the **Platform Admin** contact table. This is the wrong data source for the Org portal. It should show the **Seeking Org Admin's** own contact from `seeking_org_admins`.

Similarly, `RoleReadinessWidget` uses `useAdminContact()` for the "Contact for role gap queries" card. Per BR-CORE-005, Aggregator-model role gaps should show the SOA's contact, not the Platform Admin's.

**Fix**:
- **`SoaContactDetailsPanel.tsx`**: Replace `useAdminContact()` with `useSoaProfile(organizationId)`. Map the SOA profile fields (`full_name`, `email`, `phone`, `title`) into the form. The contact name in the header becomes `profile?.full_name || "Not configured"`. Save calls `useUpdateSoaProfile()` instead of `useUpsertAdminContact()`. Add `useOrgContext()` for `organizationId`.

- **`RoleReadinessWidget.tsx`**: Replace `useAdminContact()` with `useSoaProfile(organizationId)`. Map `adminContact.name` → `soaProfile.full_name`, `adminContact.email` → `soaProfile.email`, `adminContact.phone_intl` → `soaProfile.phone`. The contact card label stays "Contact for role gap queries (AGG model)".

## Problem 2: Assign deep-link not working

**Root cause**: The `useEffect` in `RoleManagementDashboard` fires when `searchParams` changes, but there's a race condition. On first render, `aggChallengeRoles` may be `undefined` (still loading). The effect runs, sees the `assign` param, opens the sheet — but then immediately deletes the param. If `availableRolesForSheet` is empty at that point, the `AssignRoleSheet` has no roles to show.

**Fix**: Add a guard so the effect only runs after role data has loaded:
```tsx
useEffect(() => {
  const assignParam = searchParams.get("assign");
  if (assignParam && !isLoading) {  // wait for data
    // ... existing logic
  }
}, [searchParams, aggChallengeRoles, orgCoreRoles, isLoading, setSearchParams]);
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/rbac/SoaContactDetailsPanel.tsx` | Switch from `useAdminContact` to `useSoaProfile` + `useUpdateSoaProfile` |
| `src/components/rbac/RoleReadinessWidget.tsx` | Switch from `useAdminContact` to `useSoaProfile` for contact card |
| `src/pages/rbac/RoleManagementDashboard.tsx` | Add `!isLoading` guard to assign deep-link effect |

