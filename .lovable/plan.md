

## Plan: Add Billing Approval with Payment Verification to Plan & Billing Card

### Goal
Add an explicit billing approval mechanism to `SubscriptionDetailCard` with mandatory bank payment fields and optional comments, so admins must verify payment receipt before approving.

### Database Changes
Add columns to `seeker_billing_info`:
- `billing_verification_status` TEXT DEFAULT 'pending' (pending | verified | rejected)
- `bank_transaction_id` TEXT — mandatory at verification time
- `bank_name` TEXT — mandatory at verification time
- `payment_received_date` DATE — mandatory at verification time
- `billing_verification_notes` TEXT — optional admin comment
- `billing_verified_at` TIMESTAMPTZ
- `billing_verified_by` UUID

### Files to Create/Update

1. **Migration** — Add 7 columns to `seeker_billing_info`

2. **`src/pages/admin/seeker-org-approvals/types.ts`** — Extend `SeekerBilling` interface with new fields

3. **`src/hooks/queries/useSeekerOrgApprovals.ts`** — Add `useApproveBilling` mutation that updates billing record with bank details + verification status

4. **`src/pages/admin/seeker-org-approvals/SubscriptionDetailCard.tsx`** — Major update:
   - Add billing verification status badge (Pending / Verified / Rejected)
   - Add "Verify Payment" button that opens inline form
   - Form contains: Bank Transaction ID (required), Bank Name (required), Payment Received Date (required), Comments (optional)
   - Zod validation for the form
   - Display verified payment details when already approved
   - Show verified-by and verified-at when billing is verified

5. **`src/pages/admin/seeker-org-approvals/SeekerOrgReviewPage.tsx`** — Optionally gate org-level "Approve" button on billing verification status (warn if billing not yet verified)

### Technical Details
- Form uses React Hook Form + Zod per standards
- Mutation uses `withUpdatedBy` for audit fields
- Query invalidation on `['seeker-orgs']` after mutation
- The billing approval is independent from org-level approval — admin can verify payment first, then approve org

