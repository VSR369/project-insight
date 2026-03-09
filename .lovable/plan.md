

## Revised Implementation Plan: Seeking Org Admin Provisioning (SOA Module)

### Key Simplifications from User Feedback

1. **No Senior Admin vs Basic Admin distinction for approval** -- ALL platform admins (any tier) can approve/decline seeking orgs, regardless of SELF vs SEPARATE PERSON flow. No escalation modal needed.
2. **Post-approval provisioning chain** is partially implemented -- `useApproveOrg` sets `verified`, `AdminCredentialsCard` handles welcome emails with temp passwords. What's missing: automatically creating a `seeking_org_admins` PRIMARY record on approval.
3. **Delegated Admin Management** is the main new build -- Primary Seeking Org Admin (once activated and logged in) can optionally create Delegated Admins with domain scope including **Departments** and **Functional Areas** (in addition to Industry Segments, Proficiency Areas, Sub-domains, Specialities).
4. **Assignment workflow is done** -- `open_claim` / `auto_assign` toggle already works via `md_mpa_config`.

### What Already Exists

| Feature | Status |
|---------|--------|
| Verification review page (SeekerOrgReviewPage) | Done |
| Approve/Reject/Return/Suspend/Reinstate actions | Done |
| V-check workflow, document review, billing verification | Done |
| AdminCredentialsCard with welcome email (SELF + SEPARATE) | Done |
| `create-org-admin` edge function (auth user + org_users mapping) | Done |
| `send-seeker-welcome-email` edge function | Done |
| `seeking_org_admins` table schema | Done |
| `admin_activation_links` table | Done |
| Open Claim / Auto-Assign config toggle | Done |
| `claim_org_for_verification` atomic RPC | Done |
| Org portal layout (OrgLayout, OrgSidebar, OrgDashboard) | Done |
| Master data hooks: useDepartments, useFunctionalAreas, useIndustrySegments | Done |

### What Needs to Be Built

---

### Phase 1: Complete Post-Approval Provisioning Chain

**1a. Enhance `useApproveOrg` mutation**

After setting `verification_status = 'verified'`, automatically:
- Insert a `seeking_org_admins` record: `admin_tier = 'PRIMARY'`, `status = 'pending_activation'`, `designation_method` = SELF or SEPARATE (based on `adminDelegation` existence), `domain_scope = '{}'` (ALL access)
- Generate an activation token and insert into `admin_activation_links` (72-hour expiry from `md_mpa_config`)

This replaces the current manual "send welcome email" step -- the provisioning chain fires on approval.

**1b. Create `admin-activation` edge function (EF-SOA-03)**

Handles the `/activate?token=` flow:
- Validates token (not expired, not used)
- Sets the user's password
- Records T&C acceptance
- Updates `seeking_org_admins.status` to `active`, sets `activated_at`
- Updates `admin_activation_links.used_at`
- Returns success with redirect to `/org/login`

**1c. Create Activation Page (`/activate`)**

Public route (no auth required). UI:
- Token validation on mount (valid/expired/already-used states)
- Password set form (with strength meter, confirm password)
- T&C acceptance checkbox
- Success state with "Go to Login" button pointing to `/org/login` (existing login flow)

---

### Phase 2: Org Admin Portal -- Admin Management

**2a. Add routes and sidebar items**

New routes under `/org/**` (wrapped in `SeekerGuard`):
- `/org/admin-management` -- Delegated Admin list (PRIMARY admin only)
- `/org/admin-management/create` -- Create Delegated Admin form
- `/org/admin-management/:adminId/edit` -- Edit scope

Update `OrgSidebar.tsx`:
- Add "Admin Management" (visible to PRIMARY admin only)
- Add "Role Management" (placeholder, coming soon)
- Add "Knowledge Centre" link

**2b. Admin Management Console page (`/org/admin-management`)**

Per Figma (image-255):
- Session context banner: `[Admin Name] | Organisation: [Org Name] | Primary`
- Table of delegated admins with columns: Name, Email, Status, Industry Segments, Proficiency Areas, Created, Actions (Edit/Deactivate)
- Search bar
- "+ Add Delegated Admin" button (disabled when at `max_delegated_admins_per_org` limit)
- Status badges: `pending_activation` (amber), `active` (green), `suspended` (orange), `deactivated` (grey)

Data source: `seeking_org_admins` WHERE `organization_id` = current org AND `admin_tier` = 'DELEGATED'

**2c. Create Delegated Admin form (`/org/admin-management/create`)**

Per Figma (image-256):
- Personal Details: Full Name*, Email*, Phone Number*, Title/Role
- Domain Scope section with cascading multi-select pickers:
  - **Industry Segments*** (required)
  - **Proficiency Areas** (optional, filtered by selected industries)
  - **Sub-domains** (optional, filtered by proficiency areas)
  - **Specialities** (optional, filtered by sub-domains)
  - **Departments** (optional, new addition)
  - **Functional Areas** (optional, filtered by selected departments)
- Help text: "Industry Segments are required. All other scope fields are optional -- empty = ALL."
- On submit:
  1. Validate email not duplicate in org
  2. Check scope overlap with existing delegated admins (warning, not blocking)
  3. Insert `seeking_org_admins` record: `admin_tier = 'DELEGATED'`, `status = 'pending_activation'`, `domain_scope` = JSONB with selected UUIDs
  4. Call `create-org-admin` edge function to create auth user
  5. Generate activation link
  6. Send activation email
  7. Toast: "Delegated Admin created. Activation email sent to [email]."

**2d. Edit Delegated Admin scope (`/org/admin-management/:adminId/edit`)**

- Pre-populated scope pickers
- Warning if narrowing scope affects existing assignments
- Update `domain_scope` JSONB on save

**2e. Deactivate Delegated Admin**

- Confirmation modal
- Updates `seeking_org_admins.status = 'deactivated'`
- Calls `deactivate-delegated-admin` edge function (revokes auth, logs audit)

---

### Phase 3: Supporting Infrastructure

**3a. `domain_scope` JSONB structure**

```json
{
  "industry_segment_ids": ["uuid1", "uuid2"],
  "proficiency_area_ids": ["uuid3"],
  "sub_domain_ids": [],
  "speciality_ids": [],
  "department_ids": ["uuid4"],
  "functional_area_ids": ["uuid5", "uuid6"]
}
```

Empty array = ALL access for that dimension.

**3b. Hooks for Delegated Admin CRUD**

New file: `src/hooks/queries/useDelegatedAdmins.ts`
- `useDelegatedAdmins(orgId)` -- list for org
- `useCreateDelegatedAdmin()` -- insert + edge function + activation link
- `useUpdateDelegatedAdminScope()` -- update domain_scope
- `useDeactivateDelegatedAdmin()` -- soft deactivate

**3c. `md_mpa_config` parameters to add**

- `activation_link_expiry_hours` (default: 72)
- `max_delegated_admins_per_org` (default: 5)

**3d. `ScopeMultiSelect` component**

Reusable cascading multi-select for domain scope. Uses existing master data hooks:
- `useIndustrySegments()`, proficiency areas from taxonomy, sub-domains, specialities
- `useDepartments()`, `useFunctionalAreas()` (filtered by department)

---

### Implementation Order

| Step | Description | Files |
|------|-------------|-------|
| 1 | Migration: add config params, alter `domain_scope` to JSONB if needed | New migration |
| 2 | Enhance `useApproveOrg` to create `seeking_org_admins` + activation link | `useSeekerOrgApprovals.ts` |
| 3 | Create `admin-activation` edge function | `supabase/functions/admin-activation/` |
| 4 | Create `/activate` page | `src/pages/ActivationPage.tsx` |
| 5 | Build `ScopeMultiSelect` component | `src/components/org/ScopeMultiSelect.tsx` |
| 6 | Build `useDelegatedAdmins` hooks | `src/hooks/queries/useDelegatedAdmins.ts` |
| 7 | Build Admin Management Console page | `src/pages/org/AdminManagementPage.tsx` |
| 8 | Build Create Delegated Admin page | `src/pages/org/CreateDelegatedAdminPage.tsx` |
| 9 | Build Edit Delegated Admin page | `src/pages/org/EditDelegatedAdminPage.tsx` |
| 10 | Update OrgSidebar + App.tsx routes | `OrgSidebar.tsx`, `App.tsx` |
| 11 | Build Deactivate modal + edge function | Components + `supabase/functions/deactivate-delegated-admin/` |

### What Is NOT In Scope (Deferred)

- Session isolation (separate JWT `session_type` claim) -- current auth model works for now
- Separate `/org/login` page -- existing login flow handles org admin access
- Role Management page (placeholder already exists per Figma image-257)
- BR-PAR role-based approval gating (user confirmed all admins can approve)
- Escalation modal (not needed per user feedback)
- pg_cron activation reminders

