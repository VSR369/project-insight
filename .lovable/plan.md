

# Plan: Correct Basic Admin Access — Operational Permissions Redesign

## The Problem

The previous implementation over-restricted Basic Admins. Currently, a Basic Admin can only do verifications and view their own profile. But their core job requires two additional capabilities that are blocked:

1. **Org Approvals** — Basic Admin verifies an org, but can't approve/reject it (gated to `senior_admin+`)
2. **Marketplace Operations** — Basic Admin can't view solution requests or assign pool members to them (gated to `senior_admin+`)

This makes the Basic Admin role functionally incomplete. A verified org sits in limbo because the same admin who verified it cannot approve it.

## Product Logic (Senior PM Perspective)

Think of admin tiers as job levels, not feature gates:

| Tier | Role Analogy | Core Responsibility |
|------|-------------|---------------------|
| **Basic Admin** | Operations Associate | Process verifications, approve orgs, staff solution requests |
| **Senior Admin** | Operations Manager | Above + manage reference data, configure interviews, manage invitations, team oversight |
| **Supervisor** | Platform Director | Above + system config, permissions, compliance, pricing, audit |

**Basic Admin needs access to the full operational pipeline**: Verification → Org Approval → Marketplace Staffing. Without all three, the role is broken.

## Corrected Access Matrix

```text
SIDEBAR SECTION              │ BASIC ADMIN              │ SENIOR ADMIN           │ SUPERVISOR
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Dashboard                    │ ✓                        │ ✓                      │ ✓
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Master Data (7 items)        │ ✗ Hidden                 │ ✓ View + Edit          │ ✓ Full CRUD
Taxonomy (2 items)           │ ✗ Hidden                 │ ✓ View + Edit          │ ✓ Full CRUD
Interview Setup (4 items)    │ ✗ Hidden                 │ ✓ View + Edit          │ ✓ Full CRUD
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Verifications                │ ✓ Own queue              │ ✓ Own queue            │ ✓ All queues
Knowledge Centre             │ ✓ Basics + Org Approval  │ ✓ + Queue mgmt         │ ✓ All
Reassignments                │ ✗ Hidden                 │ ✗ Hidden               │ ✓
Notification Audit           │ ✗ Hidden                 │ ✗ Hidden               │ ✓
Team Performance             │ ✗ Hidden                 │ ✗ Hidden               │ ✓
My Performance               │ ✓                        │ ✓                      │ ✓
My Availability              │ ✓                        │ ✓                      │ ✓
System Config                │ ✗ Hidden                 │ ✗ Hidden               │ ✓
Permissions                  │ ✗ Hidden                 │ ✗ Hidden               │ ✓
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Marketplace Dashboard        │ ✓ View                   │ ✓ Full                 │ ✓ Full
  Resource Pool              │ ✓ View (no add/remove)   │ ✓ Add/Remove           │ ✓ Full
  Solution Requests          │ ✓ View + Assign members  │ ✓ Full                 │ ✓ Full
  Assignment History         │ ✓ View                   │ ✓ Full                 │ ✓ Full
  Admin Contact              │ ✗ Hidden                 │ ✓                      │ ✓
  Email Templates            │ ✗ Hidden                 │ ✓                      │ ✓
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Org Approvals                │ ✓ View + Approve/Reject  │ ✓                      │ ✓
Enterprise Agreements        │ ✗ Hidden                 │ ✓                      │ ✓
─────────────────────────────┼──────────────────────────┼────────────────────────┼──────────────
Team Management              │ ✗ Hidden                 │ ✓ View + Create        │ ✓ Full
Seeker Config (15 items)     │ ✗ Hidden                 │ ✓ View (read-only)     │ ✓ Full CRUD
Compliance (3 items)         │ ✗ Hidden                 │ ✗ Hidden               │ ✓
Invitations (2 items)        │ ✗ Hidden                 │ ✓                      │ ✓
Content (2 items)            │ ✗ Hidden                 │ ✓                      │ ✓
Settings                     │ ✗ Hidden                 │ ✓                      │ ✓
Test Tools (3 items)         │ ✗ Hidden                 │ ✗ Hidden               │ ✓
```

## What Changes vs Previous Implementation

| Item | Was | Now |
|------|-----|-----|
| **Org Approvals** (sidebar) | `canSeeTeamManagement` (senior+) | All tiers (no gate) |
| **Org Approvals** (routes) | `TierGuard senior_admin` | Remove TierGuard |
| **Marketplace Dashboard** (sidebar) | `canSeeTeamManagement` (senior+) | All tiers see 4 of 6 items |
| **Marketplace routes** (4 core) | `TierGuard senior_admin` | Remove TierGuard |
| **Marketplace routes** (admin-contact, email-templates) | `TierGuard senior_admin` | Keep `TierGuard senior_admin` |
| **Enterprise Agreements** | `canSeeTeamManagement` (senior+) | Keep senior+ |
| **Knowledge Centre** | Basic sees 9 items | Basic sees ~11 items (add org approval guidance) |

## File Changes

### 1. `src/components/admin/AdminSidebar.tsx`
- **Org Approvals**: Move `seekerItems` split — show "Org Approvals" to ALL tiers, keep "Enterprise Agreements" behind `canSeeTeamManagement`
- **Marketplace**: Show 4 core items (Dashboard, Resource Pool, Solution Requests, Assignment History) to ALL tiers. Keep Admin Contact and Email Templates behind `canSeeTeamManagement`

### 2. `src/App.tsx`
- Remove `TierGuard` from these routes (make them accessible to all admin tiers):
  - `seeker-org-approvals` (list)
  - `seeker-org-approvals/:orgId` (detail/review)
  - `marketplace` (dashboard)
  - `marketplace/resource-pool` (view)
  - `marketplace/resource-pool/:memberId` (view detail)
  - `marketplace/solution-requests`
  - `marketplace/assignment-history`
- Keep `TierGuard senior_admin` on:
  - `marketplace/admin-contact`
  - `marketplace/email-templates`
  - `marketplace/role-management`
  - `saas-agreements`

### 3. `src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx`
- Adjust the Knowledge Centre filtering so Basic Admins also see the "Queue & Assignment Management" group (since they now work with solution requests)

### 4. New permission keys (DB seed via insert tool)
Add 6 new permission keys to `tier_permissions` for all 3 tiers:

| Key | Admin | Senior | Supervisor |
|-----|-------|--------|------------|
| `org_approvals.view` | ✓ | ✓ | ✓ |
| `org_approvals.approve_reject` | ✓ | ✓ | ✓ |
| `marketplace.view` | ✓ | ✓ | ✓ |
| `marketplace.assign_members` | ✓ | ✓ | ✓ |
| `marketplace.manage_pool` | ✗ | ✓ | ✓ |
| `marketplace.manage_config` | ✗ | ✓ | ✓ |

### 5. `src/pages/admin/permissions/PermissionsManagementPage.tsx`
Add 2 new categories to the permission matrix UI so the Supervisor can see and toggle them:
- "Org Approvals" (2 keys)
- "Marketplace" (4 keys)

## What Does NOT Change
- Master Data, Taxonomy, Interview Setup — remain senior_admin+ (no change)
- System Config, Permissions — remain supervisor only (no change)
- Seeker Config, Compliance — remain as-is (no change)
- Team Management, Invitations, Content — remain senior_admin+ (no change)
- All RLS policies — unchanged
- Verification routes — already open to all tiers (no change)
- `usePoolPermissions` for Master Data write access — unchanged

