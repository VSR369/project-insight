

# Plan: Correct Portal-Specific Navigation and Screen Ownership

## Problem Summary

The Role Management module is incorrectly shared between both portals with identical content. Per the BRD:

- **Platform Admin** owns: Resource Pool (MOD-01), Marketplace Challenge Assignment (MOD-02), and oversight of MP-model SLM roles
- **Seeking Org Admin (SOA)** owns: Core Roles R2/R8/R9 (MOD-04), Aggregator roles R4/R5_AGG/R6_AGG/R7_AGG (MOD-05), Role Readiness tracking

Currently, the `RoleManagementDashboard` lives under both `/admin/marketplace/roles` and `/org/role-management`, but:
1. The OrgSidebar has **no menu item** for Role Management — SOA admins can never reach it
2. The dashboard shows all 3 tabs (SLM Pool, Org Core, Aggregator) regardless of which portal you're in
3. It uses a hardcoded `DEMO_ORG_ID` instead of real org context in the Org portal
4. Platform Admin sees the AGG tab (then gets blocked) — the tab shouldn't appear at all

## Correct Business Logic

```text
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   PLATFORM ADMIN (/admin)   │     │   SEEKING ORG ADMIN (/org)   │
├─────────────────────────────┤     ├──────────────────────────────┤
│ Marketplace section:        │     │ Role Management section:     │
│  ├─ Dashboard               │     │  ├─ Role Management Dashboard│
│  ├─ Resource Pool (MOD-01)  │     │  │   ├─ Core Roles tab       │
│  ├─ Solution Requests       │     │  │   ├─ Aggregator Roles tab │
│  ├─ Assignment History      │     │  │   └─ Role Readiness widget│
│  ├─ Admin Contact           │     │  └─ SOA Contact Details      │
│  └─ Email Templates         │     │                              │
│                             │     │ Admin Management section:    │
│ NO Role Management here     │     │  └─ Delegated Admins         │
│ (PA doesn't manage org      │     │                              │
│  roles — they manage the    │     │ Challenges section:          │
│  Resource Pool supply)      │     │  ├─ All Challenges           │
│                             │     │  └─ Create Challenge         │
└─────────────────────────────┘     └──────────────────────────────┘
```

## Changes

### 1. Add Role Management menu item to OrgSidebar
**File:** `src/components/org/OrgSidebar.tsx`
- Add "Role Management" item under a new "Role Management" sidebar group for SOA admins (both PRIMARY and DELEGATED — DELEGATED within their scope)
- Icon: `ShieldCheck`, path: `/org/role-management`
- Show for SOA admins; non-admin org users don't see it (they don't manage roles)

### 2. Make RoleManagementDashboard portal-aware
**File:** `src/pages/rbac/RoleManagementDashboard.tsx`
- Accept an optional `portalContext` prop or detect from route (`/org/*` vs `/admin/*`)
- When accessed from Org portal:
  - Use `useOrgContext()` to get real `organizationId` (replace `DEMO_ORG_ID`)
  - Show only **Core Roles** and **Aggregator Roles** tabs (hide SLM Pool tab)
  - Remove "Platform Admin Profile" and "Email Templates" quick links
- When accessed from Admin portal:
  - Show only **SLM Pool Roles** tab (Core/AGG are org-managed, not PA-managed)
  - Or: Remove this route entirely from Admin portal since PA manages the Resource Pool, not org roles

### 3. Remove Role Management from Admin Sidebar Marketplace section
**File:** `src/components/admin/AdminSidebar.tsx`
- Remove the "Role Management" menu item from the Marketplace group (line 409-416)
- PA's job in Marketplace is: Resource Pool management, Solution Request queue, Assignment (assigning pool members to challenges), Admin Contact, Email Templates

### 4. Remove the admin route for Role Management
**File:** `src/App.tsx`
- Remove or repurpose `/admin/marketplace/roles` route (line 636)
- The RoleManagementDashboard should only be accessible at `/org/role-management`

### 5. Wire OrgContext into Role Management Dashboard
**File:** `src/pages/rbac/RoleManagementDashboard.tsx`
- Replace `DEMO_ORG_ID` with `useOrgContext().organizationId` when in org portal
- Remove the SLM Pool tab entirely (SOA doesn't manage the marketplace resource pool)
- Remove the `AggBlockedScreen` check (SOA is always allowed to manage AGG roles — the block is only for PA)
- Update quick links to use org-portal routes instead of admin routes

## Technical Notes

- The `useOrgContext()` hook is already available inside the `<SeekerGuard>` wrapper which provides `<OrgProvider>`
- The route `/org/role-management` already exists in App.tsx (line 835) but has no sidebar entry — just needs the menu item
- No new database changes required — this is purely a navigation/UI restructuring

