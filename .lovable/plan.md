

# Plan: Role-Specific Dashboard for Primary SO Admin

## Context

The current `OrgDashboardPage` is generic — it shows challenges, billing, team data regardless of who is logged in. The Primary SO Admin's scope is limited to **Dashboard, Settings, Admin Management** (per sidebar logic). Their dashboard must reflect **their** admin context: delegated admin stats, recent admin activity, and relevant quick actions.

The reference design shows:
- 4 KPI cards: Total Admins, Active Roles, Pending Activations, This Month
- Recent Activity feed (admin lifecycle events)
- Quick Actions (Add Delegated Admin, Manage Roles)

## Changes

### 1. Create `src/hooks/queries/useAdminDashboardStats.ts`

New hook fetching data scoped to the logged-in user's organization:

- **Admin KPIs**: Query `seeking_org_admins` for the org, aggregate counts by status:
  - `totalAdmins` — all non-deactivated admins (PRIMARY + DELEGATED)
  - `activeRoles` — count where `status = 'active'`
  - `pendingActivations` — count where `status = 'pending_activation'`
  - `thisMonth` — count where `created_at >= start of current month`

- **Recent Activity**: Query `org_state_audit_log` for the org, limited to 5-8 recent entries, returning `change_reason`, `new_status`, `previous_status`, `created_at`, `metadata`

### 2. Create `src/components/org/dashboard/PrimaryAdminDashboard.tsx`

Matches the reference design layout:

**Header**: "Admin Dashboard" with welcome message using the current admin's `full_name` from `useCurrentSeekerAdmin`

**4 KPI Cards** (top row, `grid-cols-1 lg:grid-cols-4`):
- Total Admins (Users icon, blue)
- Active Roles (ShieldCheck icon, green)
- Pending Activations (Clock icon, amber)
- This Month (TrendingUp icon, purple, shows `+N`)

**Bottom section** (`lg:grid-cols-5` — 3 cols activity, 2 cols quick actions):

- **Recent Activity** card: List of audit log entries with:
  - Color-coded dot (green=activated, blue=scope_modified, amber=pending_activation, red=deactivated)
  - Bold title derived from `metadata.action` or `change_reason`
  - Description text
  - Relative timestamp via `formatDistanceToNow`

- **Quick Actions** card:
  - "Add Delegated Admin" → `/org/admin-management/create`
  - "Manage Admins" → `/org/admin-management`
  - "Organization Settings" → `/org/settings`

Loading/empty/error states included per standards.

### 3. Update `src/pages/org/OrgDashboardPage.tsx`

Add role detection at the top:
```tsx
const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);
const isPrimarySOAdmin = currentAdmin?.admin_tier === 'PRIMARY';
```

Conditional render:
- If `isPrimarySOAdmin` → render `<PrimaryAdminDashboard />`
- Otherwise → render existing generic dashboard (preserved as-is)

### 4. Create `src/components/org/dashboard/index.ts`

Barrel export for `PrimaryAdminDashboard`.

## Files

| File | Action |
|------|--------|
| `src/hooks/queries/useAdminDashboardStats.ts` | Create — KPI + activity hooks |
| `src/components/org/dashboard/PrimaryAdminDashboard.tsx` | Create — admin dashboard UI |
| `src/components/org/dashboard/index.ts` | Create — barrel export |
| `src/pages/org/OrgDashboardPage.tsx` | Edit — conditional render by admin tier |

## No Database Changes Required

All data is already available in `seeking_org_admins` and `org_state_audit_log`. RLS policies from the previous migration grant PRIMARY admins SELECT access.

