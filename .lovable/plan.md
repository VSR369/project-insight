

# Screen Audit: Figma Screenshots + BRD + Tech Specs vs. Codebase

## Screens from Figma Document (13 pages)

| # | Figma Screen | BRD/Tech Spec Ref | Status | Notes |
|---|---|---|---|---|
| 1 | **Supervisor Sidebar** — Full sidebar with all menu items | SCR-01-01 | IMPLEMENTED | Sidebar correctly shows/hides items by tier |
| 2 | **Dashboard — Team Overview** (Active Admins, Team SLA, Pending Reassignments, Open Queue stats) | SCR-03-01 | PARTIAL GAP | See GAP-1 below |
| 3 | **Open Queue (7)** — Table with Org Name, Industries, Country, SLA Due, SLA Deadline | SCR-03-02 | IMPLEMENTED | `OpenQueueTab` component |
| 4 | **My Performance** — SLA Rate, Completed, Avg Time, Pending, At-Risk, Queue Claims, SLA Timeline chart, Workload Breakdown, Reassignment Summary | SCR-05-02 | IMPLEMENTED | `MyPerformancePage.tsx` |
| 5 | **My Profile** (read-only) — Personal details, Availability, Domain Expertise (locked), Capacity, Supervisor info, quick action links | SCR-01-05 | IMPLEMENTED | `MyProfilePage.tsx` |
| 6 | **My Availability** — Status selector, leave dates, last-admin guard | SCR-01-06 | IMPLEMENTED | `AvailabilitySettingsPage.tsx` at `/admin/availability` |
| 7 | **Platform Admins** — List table with Full Name, Status, Workload, Industry, Priority, Last Assignment, Actions | SCR-01-01 | IMPLEMENTED | `PlatformAdminListPage.tsx` |
| 8 | **Create New Admin** — Form with Personal Details, Domain Expertise, Capacity & Routing, Supervisor toggle | SCR-01-02 | IMPLEMENTED | `CreatePlatformAdminPage.tsx` |
| 9 | **Team Performance Dashboard** — Team SLA Rate, Total Pending, At-Risk, Queue Unclaimed, sortable admin table with SLA gauges | SCR-05-01 | IMPLEMENTED | `AllAdminsPerformancePage.tsx` |
| 10 | **Reassignment Requests** — Pending/Approved/Declined tabs, request cards with reason, eligible admin picker | SCR-06-01 | IMPLEMENTED | `ReassignmentInboxPage.tsx` |
| 11 | **Reassign Verification Modal** — Org context, SLA badge, current admin info, reason field, eligible admins ranked table, "Place in Open Queue" option | MOD-M-04 | IMPLEMENTED | `SupervisorReassignModal` |
| 12 | **System Configuration** — Domain Weights, Admin Capacity, Open Queue params, SLA Escalation thresholds, Executive Contact, Reassignment & Leave params, Audit History | SCR-07-01 | IMPLEMENTED | `SystemConfigPage.tsx` + `DomainWeightsPage.tsx` |
| 13 | **Permissions Management** — Role list (Platform Admin, Senior Admin, Supervisor), permission toggles per role category (Verification, Admin Management, Supervisor) | Figma only | **NOT IMPLEMENTED** | See GAP-2 below |
| 14 | **Notification Delivery Audit Log** — Summary badges (Delivered, Retry Queued, Exhausted), table with Timestamp, Type, Recipient, Verification, In-App/Email status, Retries, Actions (Re-send) | SCR-04-01 | IMPLEMENTED | `NotificationAuditLogPage.tsx` |
| 15 | **Assignment Engine Audit Log** — Date filter, admin filter, outcome filter, table with Org Name, Outcome, Assigned To, Domain Score, Selection Reason | SCR-02-02 | IMPLEMENTED | `AssignmentAuditLogPage.tsx` |

---

## GAPS IDENTIFIED

### GAP-1: MEDIUM — Verification Dashboard Missing "Team Overview" Summary Cards (Supervisor View)

**Figma shows:** The supervisor's Verification Dashboard has a top row of 4 summary KPI cards: "Active Admins" (12/15), "Team SLA" (91.5%), "Pending Reassignments" (8), "Open Queue" (23).

**Current code:** `VerificationDashboardPage.tsx` shows tier-based SLA warning/breach banners and tab count badges, but does NOT display these 4 team-level KPI summary cards at the top for supervisors.

**Fix:** Add a supervisor-only summary card row at the top of the Verification Dashboard showing Active Admins count, Team SLA Rate, Pending Reassignment count, and Open Queue count. Data sources already exist via `useMyAssignments`, `useOpenQueue`, and `usePendingReassignmentCount`.

### GAP-2: MEDIUM — Permissions Management Screen Not Implemented

**Figma shows (Pages 9-11):** A dedicated "Permissions Management" screen at `/admin/permissions` where supervisors can view and configure role-based permissions for each tier (Platform Admin, Senior Admin, Supervisor). Shows permission categories: Verification (View Dashboard, Claim, Complete, Request Reassignment), Admin Management (View All, Create, Edit, Deactivate), Supervisor (Approve Reassignments, View Performance, Configure System, View Audit Logs) with Enabled/Disabled toggles.

**Current code:** No `PermissionsPage` or `PermissionsManagement` component exists. The sidebar has no "Permissions" menu item. Permission enforcement is hardcoded via `useAdminTier` and `TierGuard`.

**Assessment:** The BRD does NOT explicitly require a Permissions Management UI — it defines a fixed tier hierarchy (Supervisor > Senior Admin > Admin). The Figma screenshots show it as a configuration screen, but the current hardcoded approach is architecturally sound and matches the BRD's fixed hierarchy model. This is a **Figma-only feature** not mandated by the BRD.

**Recommendation:** This screen would provide visibility into the permission matrix but doesn't need to be dynamic/editable since the BRD defines a fixed hierarchy. Implement as a read-only reference screen if desired, or skip as non-BRD-required.

### GAP-3: LOW — "My Availability" Not in Sidebar as Separate Item

**Figma shows (Page 3):** "My Availability" appears as a distinct sidebar menu item under the Verification group, separate from "My Profile".

**Current code:** Availability is accessible via a button on the My Profile page (`/admin/availability`), but there's no dedicated sidebar entry for "My Availability". The route exists and works.

**Fix:** Add "My Availability" as a sidebar menu item visible to all admin tiers, pointing to `/admin/availability`.

---

## FULLY IMPLEMENTED SCREENS (No Gaps)

All other screens from the Figma screenshots, BRD sections, and Tech Specs are confirmed implemented:

- Admin Dashboard with tier-gated card visibility
- Platform Admin List (SCR-01-01) with all columns
- Create/Edit/View Admin forms (SCR-01-02/03/04)
- My Profile read-only view (SCR-01-05)
- Availability Settings with leave modals (SCR-01-06)
- Verification Dashboard with My Assignments + Open Queue tabs (SCR-03-01/02)
- Verification Detail with V1-V6 checks, action bar, concurrent access control (SCR-03-03)
- My Performance with all 8 metrics, SLA timeline chart, workload breakdown (SCR-05-02)
- Team Performance with sortable admin table and SLA gauges (SCR-05-01)
- Admin Performance Detail drill-down (SCR-05-03)
- Reassignment Inbox with Pending/Approved/Declined tabs (SCR-06-01)
- Supervisor Reassign Modal with eligible admin ranking (MOD-M-04)
- System Configuration with all 14 parameters + audit history (SCR-07-01/02)
- Domain Weights page with score preview (SCR-07-02)
- Notification Delivery Audit Log with re-send action (SCR-04-01)
- Assignment Engine Audit Log with scoring breakdowns (SCR-02-02)
- All modals: Deactivate (MOD-M-05), Leave Confirmation (MOD-M-08), Bulk Reassign, Release to Queue, Request Reassignment, Approve/Reject/Return for Correction

## IMPLEMENTATION PLAN

### Phase 1 — Add Team Overview Cards to Verification Dashboard (GAP-1)

Add a supervisor-only row of 4 summary cards at the top of `VerificationDashboardPage.tsx`:
- Active Admins (count of Available + Partially_Available / total active)
- Team SLA Rate (from performance metrics)
- Pending Reassignments (from `usePendingReassignmentCount`)
- Open Queue count (from `useOpenQueue`)

### Phase 2 — Add "My Availability" to Sidebar (GAP-3)

Add a sidebar entry for "My Availability" in the Verification group, visible to all tiers, pointing to `/admin/availability`.

### Phase 3 — Optional: Permissions Reference Screen (GAP-2)

If desired, create a read-only Permissions Management page showing the fixed tier-permission matrix. This is Figma-only and not BRD-mandated.

