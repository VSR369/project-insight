

## Platform Admin — Seeker Organization Verification Inbox

### Context
Currently, when a Seeker Organization completes registration (Steps 1-5), an Auth user + `org_users` mapping is created, but no Platform Admin review workflow exists. The `seeker_organizations` table has `verification_status` (enum: `unverified`, `pending`, `verified`, `rejected`) which defaults to `unverified`. Documents in `seeker_org_documents` have `verification_status` (`pending`, `verified`, `rejected`). None of these are surfaced to the Platform Admin.

### What Will Be Built

**1. Admin Sidebar Entry** — Add "Org Approvals" under "Seeker Management" group in `AdminSidebar.tsx` with a pending-count badge (like Reviewer Approvals).

**2. New Admin Page: `SeekerOrgApprovalsPage`** at `/admin/seeker-org-approvals`
- **List View**: Table of all `seeker_organizations` with `verification_status = 'pending'` (and tabs for Verified / Rejected / All).
- Columns: Org Name, Country, Type, Submitted Date, Verification Status.
- Click a row to open the **Detail Review View**.

**3. Detail Review View: `SeekerOrgReviewPage`** at `/admin/seeker-org-approvals/:orgId`
- Read-only display of ALL registration data across 6 sections:
  - **Organization Identity** — from `seeker_organizations` + `seeker_org_industries` + `seeker_org_operating_geographies`
  - **Primary Contact** — from `seeker_contacts` (primary contact)
  - **Compliance & Export Control** — from `seeker_compliance`
  - **Plan Selection** — from `seeker_subscriptions`
  - **Billing** — from `seeker_billing_info`
  - **Admin Details** — from `org_users` (tenant_admin user) + auth user email
- **Documents Section**: List all `seeker_org_documents` with:
  - File name, type, size, current status
  - Per-document Approve / Reject buttons (with rejection reason dialog)
  - Download link via signed URL
- **Payment Verification**: Show billing entity, payment method, billing address
  - Accept / Flag payment details
- **Admin Credentials Section**: Show the org admin email and a generated temp password
  - "Send Welcome Email" button triggers an edge function

**4. Verification Actions**:
  - **Approve Organization**: Sets `seeker_organizations.verification_status = 'verified'`, `verified_at`, `verified_by`
  - **Reject Organization**: Sets status to `rejected` with rejection notes
  - **Approve/Reject Individual Documents**: Updates `seeker_org_documents.verification_status` per document

**5. Edge Function: `send-seeker-welcome-email`**
  - Sends credentials + welcome instructions to the org admin
  - Uses Resend SDK (standardized email sender)
  - Triggered by Platform Admin after verification

**6. React Query Hooks**: `useSeekerOrgApprovals.ts`
  - `usePendingSeekOrgs()` — list orgs needing review
  - `useSeekerOrgDetail(orgId)` — full org data with joins
  - `useApproveOrg()`, `useRejectOrg()` mutations
  - `useApproveDocument()`, `useRejectDocument()` mutations
  - `usePendingSeekerCount()` — for sidebar badge
  - `useSendWelcomeEmail()` — invoke edge function

### Database Changes
- **Migration**: Add RLS policy on `seeker_organizations` for `platform_admin` SELECT access (the existing RLS likely restricts to tenant-only). Same for `seeker_contacts`, `seeker_compliance`, `seeker_billing_info`, `seeker_subscriptions`, `seeker_org_documents`.

### New Files
```
src/pages/admin/seeker-org-approvals/
├── SeekerOrgApprovalsPage.tsx        # List page with tabs
├── SeekerOrgReviewPage.tsx           # Detail review page
├── OrgDetailCard.tsx                 # Organization identity card
├── ContactDetailCard.tsx             # Primary contact card
├── ComplianceDetailCard.tsx          # Compliance card
├── SubscriptionDetailCard.tsx        # Plan + billing card
├── DocumentReviewCard.tsx            # Documents with approve/reject
├── AdminCredentialsCard.tsx          # Admin details + send email
├── RejectOrgDialog.tsx               # Rejection reason dialog
├── RejectDocumentDialog.tsx          # Document rejection dialog
├── index.ts
src/hooks/queries/useSeekerOrgApprovals.ts
supabase/functions/send-seeker-welcome-email/index.ts
```

### Modified Files
- `src/components/admin/AdminSidebar.tsx` — Add "Org Approvals" item with badge
- `src/App.tsx` — Add routes for list + detail pages

### Technical Details

**Data Fetching for Detail View** — Single query with joins:
```sql
SELECT so.*, 
  c.name as country_name, 
  ot.name as org_type_name,
  sc.*, 
  sbi.*,
  ss.*
FROM seeker_organizations so
LEFT JOIN countries c ON c.id = so.hq_country_id
LEFT JOIN organization_types ot ON ot.id = so.organization_type_id
LEFT JOIN seeker_compliance sc ON sc.organization_id = so.id
LEFT JOIN seeker_billing_info sbi ON sbi.organization_id = so.id
LEFT JOIN seeker_subscriptions ss ON ss.organization_id = so.id
WHERE so.id = :orgId
```

**RLS for Platform Admin** — Uses existing `has_role(auth.uid(), 'platform_admin')` pattern:
```sql
CREATE POLICY "platform_admin_full_access" ON seeker_organizations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));
```

**Welcome Email Edge Function** — Uses Resend SDK with `CogniBlend <noreply@cogniblend.com>` sender, includes org name, admin email, temp password, and login URL.

