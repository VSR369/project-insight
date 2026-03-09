

# Plan: Implement Remaining Gaps (3, 4, 5, 6, 7, 8)

Implementing gaps 3-8 from the analysis. Gaps 1, 2, and 9 are excluded per your instruction.

---

## GAP 3: SessionContextBanner on Create/Edit Pages

The Admin Management page already has the banner. Create and Edit pages do not.

**Create `src/components/org/SessionContextBanner.tsx`** — Reusable component showing:
`[ShieldCheck icon] [Admin Name] | Organisation: [Org Name] | Primary`

Uses `useCurrentSeekerAdmin` and `useOrgContext`. Add it to the top of `CreateDelegatedAdminPage` and `EditDelegatedAdminPage`, and refactor `AdminManagementPage` to use it instead of its inline version.

## GAP 4: Session Isolation (Cross-Portal Blocking)

**Problem:** A Platform Admin can navigate to `/org/*` and vice versa.

**Approach (client-side enforcement — no JWT metadata changes needed):**

- **`SeekerGuard.tsx`** — After `OrgProvider` loads, verify user is in `seeking_org_admins` with `status = 'active'`. If not, sign out and redirect to `/org/login`. This already partially exists but doesn't block platform admins.
- **`AuthGuard.tsx` / platform routes** — Add a check: if user has an `org_users` record but no platform role (`user_roles`), redirect to `/org/dashboard` instead of allowing platform access.
- **Create `src/lib/sessionIsolation.ts`** — helper `checkSessionType(userId)` that returns `'platform_admin' | 'org_admin' | 'both' | 'none'` by querying `user_roles` and `seeking_org_admins`.
- **Update `SeekerGuard`** — call `checkSessionType`; if result is `'platform_admin'`, sign out + redirect to `/login` with toast "Please use the main portal."
- **Update `AdminGuard`** (platform side) — if result is `'org_admin'`, redirect to `/org/dashboard` with toast "Please use the organization portal."

## GAP 5: Existing Session Redirect on `/org/login`

**Update `OrgAdminLoginPage.tsx`** — Add a `useEffect` on mount that checks `supabase.auth.getSession()`. If a valid session exists AND the user is an active SO admin, redirect immediately to `/org/dashboard` without showing the login form.

## GAP 6: Affected Roles Count in Deactivate Modal

**Update `DeactivateAdminDialog.tsx`** — The `scopeCount` is already computed from `domain_scope` arrays. The spec wants wording like "Deactivating [Name] will reassign [N] scope assignments to you." The current implementation shows this but says "scope assignment(s)." Update the wording to match spec: "Deactivating **[Name]** will reassign **[N] roles** to you."

## GAP 7: Sign Out → `/org/login` for SO Admins

**Update `OrgSidebar.tsx`** — Change `handleSignOut` from `navigate('/login')` to `navigate('/org/login')`.

## GAP 8: Admin Management Table Pagination (20/page)

**Update `AdminManagementPage.tsx`** — Add client-side pagination:
- Add `page` state (default 1), `PAGE_SIZE = 20` constant
- Slice `filteredAdmins` by page
- Add pagination controls (Previous/Next buttons + page indicator) below the table
- Update footer: "Showing X-Y of Z admins"

---

## Files

| File | Action |
|------|--------|
| `src/components/org/SessionContextBanner.tsx` | Create — reusable banner |
| `src/pages/org/AdminManagementPage.tsx` | Edit — use banner, add pagination |
| `src/pages/org/CreateDelegatedAdminPage.tsx` | Edit — add SessionContextBanner |
| `src/pages/org/EditDelegatedAdminPage.tsx` | Edit — add SessionContextBanner |
| `src/components/org/DeactivateAdminDialog.tsx` | Edit — update reassignment wording |
| `src/components/org/OrgSidebar.tsx` | Edit — sign out → `/org/login` |
| `src/pages/org/OrgAdminLoginPage.tsx` | Edit — add existing session redirect |
| `src/lib/sessionIsolation.ts` | Create — session type checker |
| `src/components/auth/SeekerGuard.tsx` | Edit — block platform admins from org routes |
| `src/components/auth/AuthGuard.tsx` or admin guard | Edit — block org admins from platform routes |

