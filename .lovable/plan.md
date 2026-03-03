

## Plan: Close All Registration & Verification Gaps

This plan addresses the 10 gap items from the analysis. OTP remains bypassed per dev decision. Payment gateway remains simulated. The focus is on **state machine completion, admin verification UX, and correction/suspension workflows**.

---

### Phase 1: Database Migration

Add new enum values and columns to `seeker_organizations`:

```sql
-- Add missing verification states
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'payment_submitted';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'under_verification';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'returned_for_correction';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE org_verification_status_enum ADD VALUE IF NOT EXISTS 'active';

-- Add correction/suspension columns to seeker_organizations
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS correction_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS correction_instructions TEXT;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE seeker_organizations ADD COLUMN IF NOT EXISTS verification_started_at TIMESTAMPTZ;

-- Add billing rejection column
ALTER TABLE seeker_billing_info ADD COLUMN IF NOT EXISTS billing_rejection_reason TEXT;
```

---

### Phase 2: Registration-Side Changes

**File: `PrimaryContactForm.tsx`**
- Add validation: when "SEPARATE PERSON" is selected, admin email must differ from registrant email (Zod `.refine()`)
- OTP stays bypassed (tagged `TEMP BYPASS`) — no changes needed

**File: `BillingForm.tsx`**
- After simulated payment success, set `verification_status` to `'payment_submitted'` instead of leaving as `'unverified'`

---

### Phase 3: Rejection Improvements

**File: `RejectOrgDialog.tsx`**
- Change Zod min from `.min(1)` to `.min(50, 'Rejection reason must be at least 50 characters')`
- Accept new props: `documents`, `billing`, `orgName`, `primaryContactEmail`
- After rejection mutation succeeds, invoke `send-seeker-rejection-email` edge function with consolidated rejections (all rejected docs + billing rejection + org-level reason)

**File: `SubscriptionDetailCard.tsx`**
- Add "Reject Payment" button next to "Verify Payment"
- Show `billing_rejection_reason` when billing status is `rejected`
- Keep "Verify Payment" available after rejection (re-verification path)

**New Component: `RejectBillingDialog.tsx`**
- RHF + Zod, reason 1-500 chars
- Calls `useRejectBilling` mutation

**New Edge Function: `send-seeker-rejection-email`**
- Accepts `orgName`, `recipientEmail`, `rejections[]` (area, reason, recommendation)
- Sends single consolidated email via Resend

---

### Phase 4: Return for Correction Flow

**New Component: `ReturnForCorrectionDialog.tsx`**
- Mandatory instructions field (min 50 chars, max 1000)
- Shows current correction count and warns if this is the 2nd (final) return
- Calls `useReturnForCorrection` mutation

**Hook: `useReturnForCorrection` in `useSeekerOrgApprovals.ts`**
- Updates org: `verification_status = 'returned_for_correction'`, `correction_instructions`, increments `correction_count`
- Sends notification email to registrant contact with correction instructions
- If `correction_count >= 2`, disables the "Return" button — admin must approve or reject

**File: `SeekerOrgReviewPage.tsx`**
- Add "Return for Correction" button alongside Approve/Reject (visible when status is `under_verification`)
- Disable "Return" button when `correction_count >= 2`
- Show correction history (count, last instructions) in an info panel

---

### Phase 5: Suspension Flow

**New Component: `SuspendOrgDialog.tsx`**
- Mandatory reason field (min 50 chars)
- Calls `useSuspendOrg` mutation

**New Component: `ReinstateOrgDialog.tsx`**
- Mandatory rationale field
- Calls `useReinstateOrg` mutation

**Hooks in `useSeekerOrgApprovals.ts`**:
- `useSuspendOrg`: Sets `verification_status = 'suspended'`, `suspended_at`, `suspended_by`, `suspension_reason`
- `useReinstateOrg`: Sets `verification_status = 'active'`, clears suspension fields

**File: `SeekerOrgReviewPage.tsx`**
- Show "Suspend" button for `verified`/`active` orgs
- Show "Reinstate" button for `suspended` orgs
- Display suspension reason and date when suspended

---

### Phase 6: Auto-Transitions & SLA

**File: `SeekerOrgReviewPage.tsx`**
- When admin opens a `payment_submitted` org, auto-transition to `under_verification` via a mutation (fires once via `useEffect`)
- Set `verification_started_at` at the same time
- Display elapsed time since `verification_started_at` (e.g., "2 days 4 hours") with warning color if > 3 business days

---

### Phase 7: Verification Checklist (V1-V6)

**New Component: `VerificationChecklist.tsx`**
- Displays a V1-V6 checklist panel on the review page with auto-computed pass/fail indicators:
  - **V1 Payment**: Green if `billing_verification_status === 'verified'`
  - **V2 Org Identity**: Manual checkbox (admin confirms visual review of legal entity name)
  - **V3 Sanctions**: Auto-check `countries.is_ofac_restricted` — green if `false`, red flag if `true`
  - **V4 Duplicate**: Run trigram similarity query on org name + country and show result (no duplicates = green)
  - **V5 Admin Identity**: Show delegation details if separate admin; manual checkbox for plausibility
  - **V6 Email Domain**: Auto-compare admin email domain against org `website_url` domain — show match/mismatch. For marketplace engagement model, show info note that mismatch is expected.

**File: `SeekerOrgReviewPage.tsx`**
- Render `VerificationChecklist` above the detail cards

---

### Phase 8: Approvals Page Updates

**File: `SeekerOrgApprovalsPage.tsx`**
- Add new tabs: `payment_submitted`, `under_verification`, `returned_for_correction`, `suspended`
- Update `statusColors` map with new states
- Default tab changes to `payment_submitted` (first actionable queue)

**File: `types.ts`**
- Add `billing_rejection_reason: string | null` to `SeekerBilling`
- Add `correction_count`, `correction_instructions`, `suspended_at`, `suspension_reason`, `verification_started_at` to `SeekerOrg`

---

### Files Summary

| # | File | Action |
|---|------|--------|
| 1 | Migration SQL | Add enum values + new columns |
| 2 | `PrimaryContactForm.tsx` | Validate admin email ≠ registrant email |
| 3 | `BillingForm.tsx` | Set status to `payment_submitted` on payment |
| 4 | `RejectOrgDialog.tsx` | Min 50 chars; consolidated rejection email |
| 5 | `RejectBillingDialog.tsx` | New component |
| 6 | `SubscriptionDetailCard.tsx` | Add reject button, show rejection reason |
| 7 | `ReturnForCorrectionDialog.tsx` | New component |
| 8 | `SuspendOrgDialog.tsx` | New component |
| 9 | `ReinstateOrgDialog.tsx` | New component |
| 10 | `VerificationChecklist.tsx` | New component (V1-V6) |
| 11 | `useSeekerOrgApprovals.ts` | Add 4 new mutations, update detail query |
| 12 | `SeekerOrgReviewPage.tsx` | Auto-transition, checklist, new buttons, SLA display |
| 13 | `SeekerOrgApprovalsPage.tsx` | New tabs, status colors |
| 14 | `types.ts` | New fields |
| 15 | `send-seeker-rejection-email/index.ts` | New edge function |
| 16 | `supabase/config.toml` | Register new edge function |

### What Stays Unchanged
- OTP bypass — remains tagged `TEMP BYPASS` for dev
- Payment gateway — remains simulated
- Welcome email logic — already implemented (self/registrant_only/admin_only)
- Document approval/rejection flow — already works
- `active` state triggered by first login + T&C — deferred to post-MVP (requires auth hook integration)

