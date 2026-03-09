

# Plan: Scope Primary SO Admin Sidebar to SOA Tech Spec Screens

## Problem
The Primary SO Admin currently sees all org sidebar items (Challenges, Parent Dashboard, Membership, Billing, Team) plus a "Back to App" button pointing to `/dashboard` (provider dashboard). These are not part of the SOA tech spec and expose irrelevant navigation. The SO Admin must only see screens defined in the delegation tech spec.

## Changes

### 1. Update `OrgSidebar.tsx` — Limit visible items for SO Admin context
- **Dashboard** — keep (landing page)
- **Organization > Settings** — keep (admin details tab)
- **Organization > Admin Management** — keep (PRIMARY only, already gated)
- **Challenges section** — hide entirely (not in SOA spec scope)
- **Organization > Team** — hide (future spec)
- **Organization > Membership** — hide (future spec)
- **Organization > Parent Dashboard** — hide (future spec)
- **Billing section** — hide entirely (future spec)
- **"Back to App" footer button** — change to **"Sign Out"** (or redirect to `/org/login`) instead of `/dashboard`, since SO Admin has no provider dashboard

Implementation approach: Add a visibility flag derived from the admin's role. Since delegated admins have even fewer screens (no Admin Management), use the `currentAdmin` data to determine what to show:
- PRIMARY admin: Dashboard, Settings, Admin Management
- DELEGATED admin: Dashboard only (scoped to their domain)
- If no admin record found (regular org user): show current full set (preserves existing behavior for non-admin org users)

### 2. Update `OrgSidebar.tsx` footer — Replace "Back to App"
- For SO Admin users (those with a `seeking_org_admins` record), replace the "Back to App" → `/dashboard` button with a "Sign Out" button that calls `supabase.auth.signOut()` and redirects to `/org/login`
- For regular org users without admin records, keep existing "Back to App" behavior (no breakage)

### Files to Change

| File | Change |
|------|--------|
| `src/components/org/OrgSidebar.tsx` | Conditionally render sidebar sections based on admin tier; replace footer for admin users |

### What This Does NOT Change
- All existing routes remain registered in `App.tsx` — no route removal
- `SeekerGuard` still protects all `/org/*` routes
- Non-admin org users (if any exist) still see full sidebar
- Platform admin portal (`/admin/**`) is completely untouched
- Login flow and quick-login unchanged

