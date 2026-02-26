

## Revised Plan: Seeker Org Admin Assignment, Delegation & Admin Details Tab

### Overview

This plan adds three capabilities to the Seeker Organization flow:

1. **Registration Step 2 Enhancement** — "Will you be the Org Admin?" radio toggle with optional separate admin form
2. **Admin Details Tab** in Org Settings — displays and allows updating the designated admin
3. **Admin Change Approval Workflow** — notifications to Platform Admin when admin is reassigned post-registration

---

### Part 1: Registration — Admin Designation Toggle (Step 2)

**File to modify:** `src/components/registration/PrimaryContactForm.tsx`

**Current behavior:** The registering user is always assigned as `tenant_admin` via the `create-org-admin` edge function at Step 5. Step 2 captures only the registering user's contact details.

**New behavior:**

After the existing contact fields, add a section:

```text
┌────────────────────────────────────────────────┐
│  Will you be the Seeking Org Admin?            │
│                                                │
│  (●) Yes, I will be the Admin                  │
│  ( ) No, a separate person will be the Admin   │
└────────────────────────────────────────────────┘
```

When "No, a separate person" is selected, expand an **optional** sub-form:

```text
┌────────────────────────────────────────────────┐
│  Separate Admin Details (Optional)             │
│  You can provide these later from Settings.    │
│                                                │
│  Full Name:    [________________]              │
│  Email:        [________________]              │
│  Phone:        [________________]              │
└────────────────────────────────────────────────┘
```

All three fields are optional. The user can skip and fill them later from the dashboard.

**Data flow changes:**

- Add `admin_designation` field to `PrimaryContactData` type: `'self' | 'separate'`
- Add optional `separate_admin` object: `{ name?: string; email?: string; phone?: string }`
- Store in registration context (Step 2 data) — persisted to sessionStorage
- At Step 5 submission (BillingForm), if `admin_designation === 'separate'` AND separate admin details are provided, insert a record into a new `org_admin_change_requests` table with status `'pending_platform_approval'`
- If `admin_designation === 'separate'` but details are empty, no request is created — user handles it post-login

**Edge function change:** `create-org-admin` continues to create the registering user as `tenant_admin` regardless. The separate admin request is a **pending transfer**, not a replacement during registration. This ensures the org always has a functional admin immediately.

---

### Part 2: Database — New `org_admin_change_requests` Table

**New migration required.** This table stores admin change/transfer requests that require Platform Admin approval.

```text
org_admin_change_requests
─────────────────────────
id                  UUID PK
tenant_id           UUID NOT NULL → seeker_organizations(id)
organization_id     UUID NOT NULL → seeker_organizations(id)
requested_by        UUID → auth.users(id)
current_admin_user_id UUID → auth.users(id)
new_admin_name      TEXT
new_admin_email     TEXT NOT NULL
new_admin_phone     TEXT
request_type        TEXT CHECK ('registration_delegate', 'post_login_change')
lifecycle_status    TEXT CHECK ('pending', 'approved', 'rejected', 'cancelled')
                    DEFAULT 'pending'
status_changed_at   TIMESTAMPTZ
status_changed_by   UUID → auth.users(id)
platform_notes      TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
created_by          UUID → auth.users(id)
updated_at          TIMESTAMPTZ
updated_by          UUID → auth.users(id)
```

RLS: Tenant-scoped reads for the org admin. Platform admins see all via `has_role()`.

---

### Part 3: Admin Details Tab in Org Settings

**New file:** `src/components/org-settings/AdminDetailsTab.tsx`

**Data sources:** Joins `org_users` (where `role = 'tenant_admin'`) with `seeker_contacts` (where `is_primary = true`) for the organization.

**Display — 11 fields in a read-only card:**

| Field | Source | Notes |
|-------|--------|-------|
| User ID | `org_users.user_id` | Read-only, locked |
| Full Name | `seeker_contacts.first_name + last_name` | Read-only |
| Business Email | `seeker_contacts.email` | Read-only |
| Phone Number | `seeker_contacts.phone_country_code + phone_number` | Read-only |
| Organization ID | `org_users.organization_id` | Read-only, locked |
| Status | `org_users.invitation_status` | Badge display |
| Activation Date | `org_users.joined_at` | Formatted date |
| Created By | `org_users.created_by` | UUID or "System" |
| Created At | `org_users.created_at` | Formatted date |
| Last Modified By | `org_users.updated_by` | UUID or "—" |
| Last Modified At | `org_users.updated_at` | Formatted date or "—" |

**Below the read-only card**, add a "Change Admin" section:

```text
┌─────────────────────────────────────────────────┐
│  Change Organization Admin                       │
│                                                  │
│  Reassigning the admin role requires Platform    │
│  Admin approval. New credentials will be issued  │
│  by the platform.                                │
│                                                  │
│  New Admin Name:   [________________]            │
│  New Admin Email:  [________________]  *required │
│  New Admin Phone:  [________________]            │
│                                                  │
│  [ Request Admin Change ]                        │
│                                                  │
│  Pending request: "John Doe (john@co.com)"       │
│  Status: ⏳ Pending Platform Approval             │
└─────────────────────────────────────────────────┘
```

Submitting inserts into `org_admin_change_requests` with `request_type = 'post_login_change'`.

---

### Part 4: OrgSettingsPage Updates

**File to modify:** `src/pages/org/OrgSettingsPage.tsx`

1. Replace `useSearchParams` with `useOrgContext()` — fixes the existing bug
2. Add 5th tab "Admin" with `UserCircle` icon between Profile and Subscription
3. Updated tab grid: `grid-cols-5`

Tab order:
```text
Profile | Admin | Subscription | Engagement | Audit Trail
```

---

### Part 5: New Hooks

**File to modify:** `src/hooks/queries/useOrgSettings.ts`

Add two new hooks:

1. `useOrgAdminDetails(organizationId)` — fetches `org_users` (tenant_admin) + `seeker_contacts` (is_primary)
2. `useRequestAdminChange()` — mutation to insert into `org_admin_change_requests`
3. `usePendingAdminRequest(organizationId)` — fetches latest pending request for display

---

### Part 6: Registration Type Updates

**File to modify:** `src/types/registration.ts`

Add to `PrimaryContactData`:
```typescript
admin_designation?: 'self' | 'separate';
separate_admin?: {
  name?: string;
  email?: string;
  phone?: string;
};
```

---

### Part 7: BillingForm — Submit Separate Admin Request

**File to modify:** `src/components/registration/BillingForm.tsx`

In the `handleSubmit` function, after successful registration, if `state.step2?.admin_designation === 'separate'` and `state.step2?.separate_admin?.email` is provided:
- Insert a row into `org_admin_change_requests` with `request_type = 'registration_delegate'`

---

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/registration.ts` | Modify | Add `admin_designation` and `separate_admin` fields |
| `src/components/registration/PrimaryContactForm.tsx` | Modify | Add radio toggle + optional separate admin form |
| `src/components/registration/BillingForm.tsx` | Modify | Submit separate admin request on registration complete |
| `src/pages/org/OrgSettingsPage.tsx` | Modify | Fix OrgContext usage, add Admin tab (5 tabs) |
| `src/components/org-settings/AdminDetailsTab.tsx` | Create | Read-only admin details + change admin form |
| `src/hooks/queries/useOrgSettings.ts` | Modify | Add admin details + admin change hooks |
| **Migration** | Create | `org_admin_change_requests` table + RLS + indexes |

### Impact Assessment

- **Zero risk to existing registration flow.** The registering user is ALWAYS created as `tenant_admin` by `create-org-admin`. The separate admin request is a secondary, pending operation.
- **No changes to `create-org-admin` edge function.** It continues to work identically.
- **Multi-tenant safe.** The new table has `tenant_id` and RLS. The admin details tab reads only within the user's tenant context.
- **Backward compatible.** Existing registrations without `admin_designation` default to `'self'` implicitly (no field = current user is admin, which is already the case).

