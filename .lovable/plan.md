

# Gap Analysis: Org Portal vs Reference Screens

Comparing the 9 uploaded reference screens against existing code, here is what exists and what's missing.

## What Already Exists (reusable)
| Screen | Status | Existing Component |
|--------|--------|-------------------|
| Role Management Dashboard (image-291) | Exists | `RoleManagementDashboard.tsx` with `RoleReadinessWidget`, `SoaContactDetailsPanel`, `MsmeToggle`, `RoleTable`, `AggRoleManagement`, `DelegatedAdminListTab` |
| Assign Role Sheet (image-292) | Exists | `AssignRoleSheet.tsx` with domain taxonomy |
| MSME Toggle (image-293) | Exists | `MsmeToggle.tsx` |
| MSME Quick Assign (image-294) | Exists | `MsmeQuickAssignModal.tsx` |
| Delegated Admins table (image-296) | Exists | `DelegatedAdminListTab.tsx` + `AdminManagementPage` |
| Admin Contact Profile (image-297) | Exists | `AdminContactProfilePage.tsx` (admin portal only) |
| Email Templates (image-298) | Exists | `EmailTemplatesPage.tsx` (admin portal only) |

## What's Missing

### 1. Organisation Overview Dashboard (image-290)
The `PrimaryAdminDashboard` exists but is a generic admin KPI view. The reference shows a rich dashboard with:
- Role gap alert banner with "Fix Role Gaps →" CTA
- 4 summary cards: Core Roles (2/3), Challenge Roles (2/4), Overall Readiness (4/7), Delegated Admins (5)
- Management Consoles grid (Role Management, Role Readiness, Delegated Admins, Email Templates)
- Active Alerts panel (challenges blocked by missing roles)
- Recent Activity feed (role assignments, unassignment warnings, invites)

**Fix**: Rebuild `PrimaryAdminDashboard` to match the reference layout. Reuse `useRoleReadiness`, `useRoleAssignments`, `useDelegatedAdmins`, `useAdminRecentActivity` hooks. No new data fetching needed.

### 2. Role Readiness Status Page (image-295)
A standalone full-page view showing all 7 roles with status (Active/Missing) and assigned user names. Currently `RoleReadinessPanel` exists as a component but has no dedicated `/org/role-readiness` route.

**Fix**: Create `RoleReadinessPage.tsx` in `src/pages/org/` that wraps the existing `RoleReadinessPanel` component with a back link and the blocking warning banner. Register route as `/org/role-readiness`.

### 3. Contact Profile Page (org-portal route)
`AdminContactProfilePage` exists at `/admin/marketplace/admin-contact` but is not accessible from the org portal. The reference (image-297) shows it in the org sidebar.

**Fix**: Create a thin wrapper `OrgContactProfilePage.tsx` that reuses `AdminContactProfilePage` or its form components, routed at `/org/contact-profile`.

### 4. Email Templates Page (org-portal route)
Same issue — `EmailTemplatesPage` exists at `/admin/marketplace/email-templates` but not in the org portal.

**Fix**: Create `OrgEmailTemplatesPage.tsx` wrapper, routed at `/org/email-templates`.

### 5. Knowledge Centre Page (image-299)
Currently a placeholder page (`KnowledgeCentrePage` → "Access help articles and resources"). The reference shows a 6-card grid with topics: Role Management Guide, Delegated Admin Setup, MSME Quick Assign Walkthrough, Role Readiness FAQ, Platform Admin Hierarchy, Domain Scope & Taxonomy.

**Fix**: Create `OrgKnowledgeCentrePage.tsx` with static content cards. Route at `/org/knowledge-centre`.

### 6. Sidebar Navigation Gaps
Current `OrgSidebar` for SO Admins shows: Dashboard, Role Management, Admin Management. Missing:
- Role Readiness
- Delegated Admins (as standalone nav item)
- Contact Profile
- Email Templates
- Knowledge Centre

**Fix**: Add these 5 nav items to `OrgSidebar.tsx` for SO Admin users (matching the reference sidebar in image-290).

## Implementation Plan

### Step 1: Update OrgSidebar with full nav items
Add Role Readiness, Delegated Admins, Contact Profile, Email Templates, Knowledge Centre links for SO Admin users.

### Step 2: Rebuild PrimaryAdminDashboard to match reference
Replace the generic KPI view with: role gap alert banner, 4 summary stat cards, management console grid, active alerts panel, and recent activity feed. Reuse existing hooks.

### Step 3: Create Role Readiness page
New `src/pages/org/RoleReadinessPage.tsx` wrapping `RoleReadinessPanel`. Add route `/org/role-readiness`.

### Step 4: Create org-portal Contact Profile page
New `src/pages/org/OrgContactProfilePage.tsx` reusing `useAdminContact` + `useUpsertAdminContact` hooks and form schema. Add route `/org/contact-profile`.

### Step 5: Create org-portal Email Templates page
New `src/pages/org/OrgEmailTemplatesPage.tsx` reusing the template rendering logic from `EmailTemplatesPage`. Add route `/org/email-templates`.

### Step 6: Create Knowledge Centre page
New `src/pages/org/OrgKnowledgeCentrePage.tsx` with 6 static content cards matching the reference. Add route `/org/knowledge-centre`.

### Step 7: Register all new routes in App.tsx
Add 4 new routes under the org shell: `role-readiness`, `contact-profile`, `email-templates`, `knowledge-centre`.

### Technical Notes
- All new pages are thin wrappers or compositions of existing components/hooks — no new data layer needed.
- `AdminContactProfilePage` back-link will be adjusted per portal context (org vs admin).
- Follows existing patterns: `FeatureErrorBoundary`, lazy loading, `useOrgContext`.

