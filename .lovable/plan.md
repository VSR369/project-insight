

## Plan: Enforce Tier-Based Feature Visibility Across Admin UI

### Current State

The sidebar (`AdminSidebar.tsx`) already has some tier gating:
- **Team Management > Platform Admins**: Hidden for basic admin
- **Seeker Config**: Hidden for basic admin
- **Compliance Config**: Supervisor only

But two areas lack tier enforcement:
1. **AdminDashboard** (`AdminDashboard.tsx`) — Shows ALL cards to ALL tiers (no filtering)
2. **Route-level guards** — Basic admin can manually navigate to `/admin/platform-admins`, `/admin/seeker-config/*` via URL and see content (only in-page permission checks, no redirect)

### Tier Permission Matrix (Additive)

| Feature Group | Basic Admin | Senior Admin (= Basic + extras) | Supervisor (= Senior + extras) |
|---|---|---|---|
| Dashboard | Own-tier cards only | + Team Mgmt, Seeker Config cards | + Compliance cards |
| Master Data | All | All | All |
| Taxonomy | All | All | All |
| Interview Setup | All | All | All |
| Seeker Management | All | All | All |
| Invitations | All | All | All |
| Question Bank, Capability Tags | All | All | All |
| Team Management > Platform Admins | Hidden | View-only (list, view) | Full CRUD |
| Team Management > My Profile | All | All | All |
| Seeker Config | Hidden | All items | All items |
| Compliance Config | Hidden | Hidden | All items |
| Create Admin | No | Yes (admin-tier only) | Yes (any tier) |
| Edit Admin | No | Yes (admin-tier only) | Yes (any) |
| Deactivate Admin | No | No | Yes |
| Settings | Hidden | Visible | Visible |
| Test tools (Regression, Smoke, Social) | All | All | All |

### Changes

**1. `src/pages/admin/AdminDashboard.tsx`**

- Import `useAdminTier`
- Add a `requiredTier` property to each section card: `'all'`, `'senior_admin'` (senior + supervisor), or `'supervisor'`
- Filter sections before rendering: show card only if user's tier meets or exceeds `requiredTier`
- Add new cards for: "Platform Admins" (senior_admin+), "Seeker Config" (senior_admin+), "My Profile" (all)
- Display the user's tier badge in the dashboard header

**2. `src/components/admin/AdminSidebar.tsx`** (minor cleanup)

- Already correct. No changes needed — sidebar gating is already in place.

**3. New: `src/components/admin/TierGuard.tsx`** (route-level protection)

- A lightweight wrapper component that checks `useAdminTier()` and redirects to `/admin` with a toast if the user's tier is insufficient
- Used to wrap route elements for protected pages

**4. `src/App.tsx`** — Wrap tier-restricted routes with `TierGuard`

- `/admin/platform-admins/*` routes: require `senior_admin` tier minimum
- `/admin/seeker-config/*` routes: require `senior_admin` tier minimum  
- `/admin/seeker-config/export-control`, `/admin/seeker-config/data-residency`, `/admin/seeker-config/blocked-domains`: require `supervisor` tier
- `/admin/settings`: require `senior_admin` tier minimum

### Impact Analysis

| Area | Impact | Risk |
|---|---|---|
| Basic admin features | None changed | Zero — all existing master data, taxonomy, interview, seeker mgmt, invitations, question bank untouched |
| Provider/Reviewer/Org portals | None | Zero — completely separate route trees |
| AdminGuard | Unchanged | Still checks `has_role(uid, 'platform_admin')` |
| Existing sidebar | No changes | Already tier-gated correctly |
| Edge functions | Unchanged | Already enforce tier hierarchy server-side |
| RLS policies | Unchanged | Still use `has_role(uid, 'platform_admin')` |

### Files Modified
- `src/pages/admin/AdminDashboard.tsx` — Add tier-filtered cards
- `src/components/admin/TierGuard.tsx` — New file, route-level tier check
- `src/App.tsx` — Wrap restricted admin routes with `TierGuard`

### Files NOT Modified
- `AdminGuard.tsx` — No change
- `AdminSidebar.tsx` — No change (already correct)
- `useAdminTier.ts` — Already fixed with `.maybeSingle()`
- `Login.tsx` — Already has 3 separate admin login buttons
- All platform admin CRUD pages — Already have in-page tier checks
- All edge functions — Already enforce tier hierarchy

