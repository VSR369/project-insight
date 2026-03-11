

# Fix Plan: Role Management Dashboard to Match Screenshots Exactly

## Problem Analysis

Comparing the 9 screenshots against the current implementation, here are the specific issues:

### 1. Dashboard Layout (SCR-08 — image-280) is WRONG
**Current**: Generic card-wrapped layout with breadcrumb "Organization > Role Management", Shield icon, engagement model selector dropdown at top-right, card-wrapped role table with "Role Assignments" title.
**Screenshot shows**: "CogibleND Platform" breadcrumb, "Role Management Dashboard" title (no icon prefix), NO model selector dropdown at top. Readiness widget has a red/pink border (not left-border), progress ring on the left with "2/4", "NOT READY — 2 roles missing" header with XCircle icon, missing role badges as red pills showing role name + code (e.g. "Challenge Curator (R5_MP)"), contact card on the right with "Contact for role gap queries (MP model)" label. Then Contact Details collapsible, then MSME toggle, then shortcut buttons "Platform Admin Profile" and "Email Templates", then tabs without card wrapper.

### 2. Contact Details Panel (image-282) — NOT BUILT
**Screenshot shows**: A collapsible accordion "Contact Details — Rebecca Thornton" with inline edit form (Full Name, Email, Phone in 3-column layout), info note "This contact is surfaced when your challenge has a role gap", last updated timestamp, "Save Changes" button. This is the SOA's own contact — NOT the Platform Admin contact.

### 3. MSME Toggle (image-283) — Style is WRONG
**Current**: Simple switch with "MSME / Small Team Mode" label and info section.
**Screenshot shows**: Purple-bordered card with purple icon, "MSME / Small Team Mode" with Active/Off badge, toggle on right, description mentions role codes from master data (R3, R5_MP, R6_MP, R7_MP), "Quick Assign All" button (purple, with icon) appears when active.

### 4. Assign Role Sheet (SCR-09 — image-281) — WRONG COMPONENT TYPE
**Current**: Dialog modal with role dropdown selector, two-tab (Invite/Existing), no domain taxonomy.
**Screenshot shows**: Side-sheet (not dialog), title "Assign Challenge Curator" with subtitle "SCR-09 - Core Role Assignment", role code+name shown as read-only badge (R5_MP | Challenge Curator), toggle buttons "New User (Invite)" / "Existing Team Member", Full Name and Email fields, collapsible "Domain Taxonomy" section with cascading: Industry Segment > Sub-Domain > Specialty > Proficiency Level (4 levels), "Cancel" and "Save & Invite" buttons.

### 5. Admin Contact Profile (SCR-19 — image-284) — Layout is WRONG
**Current**: Has breadcrumb, card-wrapped form with icons, info banner at top.
**Screenshot shows**: "← Back to Role Management" link at top, "Admin Contact Profile" title, subtitle "Platform Admin contact details exposed via the Role Readiness API", simple card with Full Name*, Email*, Phone (international format)* fields (no icons), info note "This contact information is exposed via the Role Readiness API to the CLM module. Changes will be reflected immediately in all API consumers.", last updated timestamp, "Save Changes" button (with save icon, disabled state).

### 6. Email Templates (images 285-286) — Layout is WRONG
**Current**: Generic template with placeholder variables ({{org_name}}, etc.).
**Screenshot shows**: "← Back to Role Management" link, "Email Templates" with mail icon, subtitle, tabs "NOT_READY Email" / "READY Email". Email preview is a realistic rendered email with: From/To/Subject header, orange/teal branded header bar with "CogibleND" logo text, actual email body content with org details table, unassigned role list with bullets, CTA button, footer.

### 7. MSME Quick Assign Modal (images 287-288) — Layout is WRONG
**Current**: Dialog with 3 tabs (Myself/New User/Existing), basic checkboxes.
**Screenshot shows**: Sheet/dialog with "MSME Quick Assign" title, subtitle "Assign one person to multiple roles at once", purple info banner about MSME mode, 3-tab toggle (Myself/New User/Existing Team Member), "Myself" tab shows logged-in user card (avatar, name, email, "Platform Admin — self-assigning all selected roles"), "Roles to Assign (4 selected)" with Select All/Clear, role checkboxes with code badge + core/challenge badge + "Already filled" green note, collapsible "Domain Taxonomy (Optional)", green summary bar "Ready to assign 4 roles to email" with role pills, amber warning "This person will hold all 4 roles...", "Cancel" and "Assign 4 Roles" button.

### 8. Role Table — Style Gaps
**Current**: Basic table with outline badges.
**Screenshot shows**: Uppercase tracking-wider headers "ROLE NAME", "CODE", "ASSIGNED USER(S)", "STATUS", "ACTIONS". Assigned user shows avatar circle + name. Status uses colored badges (Active=green, Unassigned=red). Actions show "Invite" (with icon) and "Deactivate" (red with icon) for assigned rows, or "Invite User" primary button for unassigned rows.

---

## Implementation Plan

### File 1: Rewrite `RoleManagementDashboard.tsx`
- Remove model selector dropdown from header
- Change breadcrumb to "CogibleND Platform"
- Change title to "Role Management Dashboard"
- Reorder sections: Readiness Widget → Contact Details accordion → MSME Toggle → Quick links (Platform Admin Profile, Email Templates) → Role tabs (without Card wrapper)
- Role tabs: bare Tabs with TabsList (no wrapping Card/CardHeader)

### File 2: Rewrite `RoleReadinessWidget.tsx`
- Full red/pink dashed border card (not left-border-only)
- Layout: progress ring left, status + missing roles center, contact card right
- Title: "NOT READY — 2 roles missing" with XCircle icon
- Missing role badges show "Display Name (Code)" format in red pills
- "View full readiness details >" link
- Contact card: "Contact for role gap queries (MP model)" label, name, email icon + email, phone icon + phone

### File 3: NEW `SoaContactDetailsPanel.tsx`
- Collapsible accordion with "Contact Details — {name}" header
- Expanded: 3-column grid (Full Name, Email, Phone)
- Info note: "This contact is surfaced when your challenge has a role gap."
- Last updated timestamp
- "Save Changes" button (with save icon)
- Uses separate SOA contact data (not the Platform Admin contact)

### File 4: Rewrite `MsmeToggle.tsx`
- Purple-themed border when active, purple icon
- "MSME / Small Team Mode" with Active (green badge) / Off (grey badge)
- Description text referencing role codes from master data dynamically
- Toggle switch on the right
- "Quick Assign All" purple button (with icon) when active

### File 5: Rewrite `AssignRoleModal.tsx` → `AssignRoleSheet.tsx`
- Convert from Dialog to Sheet (side-sheet from right)
- Dynamic title: "Assign {role.display_name}"
- Subtitle: "SCR-09 - Core Role Assignment"
- Read-only role badge showing code + display_name
- Toggle buttons for "New User (Invite)" / "Existing Team Member"
- Full Name and Email fields
- Collapsible "Domain Taxonomy" section with 4 cascading selectors using existing hooks: Industry Segment (`useIndustrySegments`), Sub-Domain (`useSubDomains`), Specialty (`useSpecialities`), Proficiency Level (`useProficiencyLevels`)
- Info note about domain scope
- "Cancel" and "Save & Invite" buttons
- Update dashboard to use Sheet instead of Dialog

### File 6: Rewrite `EmailTemplatesPage.tsx`
- "← Back to Role Management" link at top
- Tab labels: "NOT_READY Email" / "READY Email"
- Email preview: From/To/Subject meta header, branded header bar (orange for NOT_READY, teal for READY), realistic email body with org details table, role list, CTA button, footer with "© 2026 CogibleND"

### File 7: Rewrite `AdminContactProfilePage.tsx`
- "← Back to Role Management" link at top
- Simple form without card header icons
- Fields: Full Name*, Email*, Phone (international format)*
- Info note about Role Readiness API and CLM module
- Last updated timestamp display
- "Save Changes" button (disabled when clean)

### File 8: Rewrite `MsmeQuickAssignModal.tsx`
- Keep as Dialog/Sheet
- Title "MSME Quick Assign", subtitle "Assign one person to multiple roles at once"
- Purple info banner about MSME mode
- 3-tab toggle: Myself / New User (Invite) / Existing Team Member
- "Myself" tab: user card with avatar, name, email, "Platform Admin — self-assigning all selected roles" using `useCurrentAdminProfile`
- "Roles to Assign (N selected)" with Select All / Clear links
- Role checkboxes: checkbox + role name + code badge + core/challenge badge; "Already filled — assigning will add as co-holder" green note
- Collapsible "Domain Taxonomy (Optional)"
- Green summary bar: "Ready to assign N roles to email" with role name pills
- Amber warning: "This person will hold all 4 roles. This is typical for MSMEs but may need review for larger organisations."
- "Cancel" and "Assign N Roles" primary button

### File 9: Fix `RoleTable.tsx`
- Table headers: uppercase text-xs tracking-wider: "ROLE NAME", "CODE", "ASSIGNED USER(S)", "STATUS", "ACTIONS"
- Assigned user: avatar circle (initials) + name
- Unassigned: italic "No user assigned"
- Status badges: Active=green bg, Unassigned=red bg, Invited=amber bg
- Actions: For assigned rows show "Invite" link + "Deactivate" red link. For unassigned rows show primary "Invite User" button

### Files NOT changed
- All hooks remain as-is (useRoleAssignments, useMsmeConfig, useSlmRoleCodes, useAdminContact, etc.)
- Zod schemas remain as-is
- Routes in App.tsx remain as-is
- Database tables remain as-is

### Implementation Order
1. `RoleReadinessWidget.tsx` — rewrite to match screenshot layout
2. `SoaContactDetailsPanel.tsx` — new component
3. `MsmeToggle.tsx` — rewrite styling
4. `AssignRoleSheet.tsx` — new Sheet component replacing Dialog, with domain taxonomy
5. `RoleTable.tsx` — fix styling to match screenshot
6. `MsmeQuickAssignModal.tsx` — rewrite with proper tabs, summary bar, warnings
7. `RoleManagementDashboard.tsx` — rewrite layout/ordering
8. `AdminContactProfilePage.tsx` — rewrite layout
9. `EmailTemplatesPage.tsx` — rewrite with realistic email previews

