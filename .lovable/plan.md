

# Implementation Plan: Sessions 1-4 (Excluding 5, 6, 7)

## Scope
Sessions 1-4 from the approved plan. Sessions 5 (cost estimator, locale, country-cascade, RBAC), 6 (MPA Phase 1), and 7 (MPA Phase 2) are excluded.

---

## Session 1: Bug Fixes + Registration Field Alignment

### 1.1 Fix Sidebar Badge
**File:** `src/hooks/queries/useSeekerOrgApprovals.ts` line 16
- Change `.eq('verification_status', 'pending')` to `.eq('verification_status', 'payment_submitted')`

### 1.2 Remove Vestigial "Pending" Tab
**File:** `src/pages/admin/seeker-org-approvals/SeekerOrgApprovalsPage.tsx` line 54
- Remove `<TabsTrigger value="pending">Pending</TabsTrigger>`
- Remove `pending` entry from `statusColors` map (line 17)

### 1.3 Add `website_url` to Step 1
**File:** `src/lib/validations/organizationIdentity.ts`
- Add `website_url: z.string().url('Invalid URL').max(255).optional().or(z.literal(''))`

**File:** `src/components/registration/OrganizationIdentityForm.tsx`
- Add URL input field after Trade/Brand Name
- Add to `defaultValues` from `state.step1?.website_url`
- Include in payload sent to `createOrg`/`updateOrg`

**File:** `src/components/registration/OrganizationIdentityForm.tsx` handleSubmit payload
- Add `website_url: data.website_url || undefined` to payload

Column `website_url` already exists in `seeker_organizations` table (confirmed in detail query line 65).

### 1.4 Surface `business_registration_number` in Step 1
**File:** `src/lib/validations/organizationIdentity.ts`
- Add `business_registration_number: z.string().trim().max(100).optional().or(z.literal(''))`

**File:** `src/components/registration/OrganizationIdentityForm.tsx`
- Add text input "Business Registration Number" after Year Founded
- Include in payload as `registration_number`

Column `registration_number` already exists on `seeker_organizations`.

### 1.5 Make SEPARATE Admin Fields Mandatory
**File:** `src/components/registration/PrimaryContactForm.tsx` lines 544-625
- Remove line 548: "Separate Admin Details (Optional) — You can provide these later from Settings."
- Replace with: "Designated Admin Details (Required)"
- In `handleSubmit`, add validation: when `adminDesignation === 'separate'`, require `separateAdmin.name`, `separateAdmin.email`, and `separateAdmin.phone` — show toast error if any empty

### 1.6 Add SELF Confirmation Checkbox
**File:** `src/components/registration/PrimaryContactForm.tsx`
- Add `useState` for `selfConfirmed` (default false)
- When `adminDesignation === 'self'`, render checkbox: "I confirm I will serve as the Primary Seeking Org Admin"
- In `handleSubmit`, block if `adminDesignation === 'self' && !selfConfirmed`

### 1.7 Add `admin_title` and `relationship_to_org` for SEPARATE Admin
**DB Migration:** Add columns to `org_admin_change_requests`:
```sql
ALTER TABLE org_admin_change_requests
  ADD COLUMN IF NOT EXISTS new_admin_title TEXT,
  ADD COLUMN IF NOT EXISTS new_admin_relationship_to_org TEXT;
```

**File:** `src/components/registration/PrimaryContactForm.tsx`
- Add `admin_title` input (mandatory when separate) and `relationship_to_org` input (optional) in the separate admin section
- Add to `separateAdmin` state object
- Pass through `setStep2Data` and the upsert logic

**File:** `src/hooks/queries/usePrimaryContactData.ts` (or wherever admin delegation is saved)
- Include `new_admin_title` and `new_admin_relationship_to_org` in the delegation insert

### 1.8 Add Privacy Policy + DPA Checkboxes
**DB Migration:**
```sql
ALTER TABLE seeker_compliance
  ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dpa_accepted BOOLEAN NOT NULL DEFAULT FALSE;
```

**File:** `src/lib/validations/compliance.ts`
- Add `privacy_policy_accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Privacy Policy' }) })`
- Add `dpa_accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Data Processing Agreement' }) })`

**File:** `src/components/registration/ComplianceForm.tsx`
- Add two mandatory checkboxes after the compliance certifications section
- Include in `upsertCompliance.mutateAsync()` payload

### 1.9 Store `registrant_contact` JSONB
**DB Migration:**
```sql
ALTER TABLE seeker_organizations
  ADD COLUMN IF NOT EXISTS registrant_contact JSONB;
```

**File:** `src/components/registration/PrimaryContactForm.tsx` handleSubmit
- After successful upsert, update `seeker_organizations.registrant_contact` with `{first_name, last_name, email, phone_number, job_title}` via supabase update

---

## Session 2: Admin Review Enhancements + Foundation Schema

### 2.1 Show `admin_title` and `relationship_to_org` in AdminCredentialsCard
**File:** `src/pages/admin/seeker-org-approvals/AdminCredentialsCard.tsx`
- In the delegation info block (line 71-95), add two more fields: "Admin Title" and "Relationship to Org"

**File:** `src/hooks/queries/useSeekerOrgApprovals.ts` line 92
- Update admin delegation select to include `new_admin_title, new_admin_relationship_to_org`

**File:** `src/pages/admin/seeker-org-approvals/types.ts` AdminDelegation interface
- Add `new_admin_title: string | null` and `new_admin_relationship_to_org: string | null`

### 2.2 Display Registrant Contact Separately
**File:** `src/pages/admin/seeker-org-approvals/ContactDetailCard.tsx`
- Accept `registrantContact` prop (JSONB from org record)
- Render a "Registrant Contact" section at the top with registrant name, email, phone, job title
- Below, show existing contacts list as "Organization Contacts"

**File:** `src/pages/admin/seeker-org-approvals/SeekerOrgReviewPage.tsx`
- Pass `org.registrant_contact` to `ContactDetailCard`

**File:** `src/pages/admin/seeker-org-approvals/types.ts` SeekerOrg interface
- Add `registrant_contact: { first_name: string; last_name: string; email: string; phone_number?: string; job_title?: string } | null`

### 2.3 Verify OrgDetailCard Fields
`OrgDetailCard.tsx` already displays `website_url` (line 31) and `registration_number` (line 29). No code change needed — data will flow through after Step 1 form changes.

### 2.4 Create `seeking_org_admins` Table
**DB Migration:**
```sql
CREATE TABLE IF NOT EXISTS seeking_org_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  admin_tier TEXT NOT NULL CHECK (admin_tier IN ('PRIMARY', 'DELEGATED')) DEFAULT 'PRIMARY',
  domain_scope TEXT NOT NULL DEFAULT 'ALL',
  designated_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending_activation', 'active', 'suspended', 'transferred')) DEFAULT 'pending_activation',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE seeking_org_admins ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_seeking_org_admins_org ON seeking_org_admins(organization_id);
CREATE INDEX idx_seeking_org_admins_user ON seeking_org_admins(user_id);

CREATE POLICY "Platform admins can manage seeking_org_admins"
  ON seeking_org_admins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Org admins can view their own records"
  ON seeking_org_admins FOR SELECT
  USING (user_id = auth.uid());
```

### 2.5 Update Detail Query & Types
Already covered in 2.1 and 2.2.

---

## Session 3: Audit Log + State Machine Testing

### 3.1 Create `org_state_audit_log` Table
**DB Migration:**
```sql
CREATE TABLE IF NOT EXISTS org_state_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_state_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_state_audit_org ON org_state_audit_log(organization_id, created_at DESC);

CREATE POLICY "Platform admins can read audit log"
  ON org_state_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

-- Auto-log trigger
CREATE OR REPLACE FUNCTION log_org_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    INSERT INTO org_state_audit_log (organization_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.verification_status, NEW.verification_status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seeker_orgs_state_audit
  AFTER UPDATE ON seeker_organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_org_state_change();
```

### 3.2 Create `admin_activation_links` Table
**DB Migration:**
```sql
CREATE TABLE IF NOT EXISTS admin_activation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES seeking_org_admins(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'activated', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_activation_links ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_activation_links_token ON admin_activation_links(token);
CREATE INDEX idx_activation_links_org ON admin_activation_links(organization_id);

CREATE POLICY "Platform admins can manage activation links"
  ON admin_activation_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );
```

### 3.3 Display Audit Log on Review Page
**File:** New component `src/pages/admin/seeker-org-approvals/StateAuditLogCard.tsx`
- Query `org_state_audit_log` for the org
- Display as a timeline of status transitions with timestamps

**File:** `src/pages/admin/seeker-org-approvals/SeekerOrgReviewPage.tsx`
- Render `StateAuditLogCard` below the existing cards

---

## Session 4: Activation Flow, First-Login T&C, Admin Transfer, Enterprise CTA

### 4.1 T&C Re-Acceptance on New Version (BR-REG-010)
**DB Migration:**
```sql
CREATE TABLE IF NOT EXISTS tc_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content_url TEXT,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tc_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tc_versions"
  ON tc_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can manage tc_versions"
  ON tc_versions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

ALTER TABLE seeker_organizations
  ADD COLUMN IF NOT EXISTS tc_version_accepted TEXT;
```

**File:** New hook `src/hooks/queries/useTcVersionCheck.ts`
- Query latest `tc_versions` entry
- Compare against org's `tc_version_accepted`
- Return `{needsReAcceptance, latestVersion}`

**File:** New component `src/components/org/TcReAcceptanceModal.tsx`
- Blocking modal shown when version mismatch detected
- On acceptance, update `seeker_organizations.tc_version_accepted` and log in audit

**File:** `src/pages/org/OrgDashboardPage.tsx`
- Import and render `TcReAcceptanceModal` (blocks dashboard until accepted)

### 4.2 First-Login Active State Transition (BR-SOA-004)
**File:** New hook `src/hooks/queries/useFirstLoginCheck.ts`
- When org status is `verified` and user is `tenant_admin`, check if T&C accepted
- On T&C acceptance via modal, also transition org to `active`

This is integrated into the T&C modal from 4.1 — when the org is `verified` (not yet `active`), accepting T&C transitions it to `active`.

### 4.3 Primary Admin Transfer Protocol (BR-SOA-010)
**DB Migration:**
```sql
CREATE TABLE IF NOT EXISTS admin_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  from_admin_id UUID NOT NULL REFERENCES seeking_org_admins(id),
  to_admin_email TEXT NOT NULL,
  to_admin_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_transfer_org ON admin_transfer_requests(organization_id);

CREATE POLICY "Platform admins can manage transfer requests"
  ON admin_transfer_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Org admins can view their own transfer requests"
  ON admin_transfer_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM seeking_org_admins WHERE user_id = auth.uid()
    )
  );
```

**File:** `src/components/org-settings/AdminDetailsTab.tsx`
- Add "Transfer Primary Admin" button (visible to current primary admin)
- Opens dialog with target admin email/name fields
- Creates `admin_transfer_requests` record
- Shows pending transfer status

### 4.4 Premium Tier → Contact Sales CTA Enhancement (BR-REG-013)
**File:** `src/components/registration/PlanSelectionForm.tsx`
- The enterprise contact flow already exists (`handleEnterpriseContact`, `enterprise_contact_requests` table)
- Enhance the Contact Sales dialog to include qualification fields: expected challenge volume, specific requirements text area
- These map to existing `message` and `company_size` columns on `enterprise_contact_requests`
- Mostly working — just verify and add missing fields

### 4.5 Enterprise Auto-Flag (BR-REG-003)
**File:** `src/components/registration/OrganizationIdentityForm.tsx`
- After company_size_range and annual_revenue_range selects, check if `company_size_range === '5001+'` or `annual_revenue_range === '>1B'`
- If so, show an info banner: "Based on your organization profile, we recommend the Premium (Enterprise) tier"
- Store flag in registration context so Step 4 can highlight Premium tier card with "Recommended" badge

---

## Summary: Files Changed

| Session | Files Modified | Files Created | DB Migrations |
|---------|---------------|---------------|---------------|
| 1 | 5 files (badge hook, approvals page, 2 validation schemas, 2 form components) | 0 | 3 (org_admin_change_requests cols, seeker_compliance cols, seeker_organizations col) |
| 2 | 4 files (AdminCredentialsCard, ContactDetailCard, types.ts, detail query) | 0 | 1 (seeking_org_admins table) |
| 3 | 1 file (SeekerOrgReviewPage) | 1 (StateAuditLogCard) | 2 (org_state_audit_log + trigger, admin_activation_links) |
| 4 | 3 files (OrgDashboardPage, AdminDetailsTab, PlanSelectionForm, OrganizationIdentityForm) | 3 (TcReAcceptanceModal, useTcVersionCheck, useFirstLoginCheck) | 3 (tc_versions, admin_transfer_requests, tc_version_accepted col) |

**Total: ~13 files modified/created, 9 DB migrations**

