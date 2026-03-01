

## Plan: Enforce Sequential Verification Gates for Organization Approval

### Current State
- **Documents**: Each document can be individually verified/rejected — status saved in `seeker_org_documents.verification_status`
- **Billing**: Has verification form with bank details — status saved in `seeker_billing_info.billing_verification_status`
- **Org Approval**: Currently shows a warning if billing is unverified, but the Approve button is still clickable
- **Welcome Email**: Currently enabled when `org.verification_status === 'verified'` — correct, but no additional guard

### Gaps Identified
1. **Approve Org button is not truly disabled** when documents are unverified or billing is unverified — it only shows a warning for billing
2. **No check for document verification** before org approval
3. **No visual indication** of what prerequisites are missing for approval
4. **Welcome email** gating is correct (requires verified org), but should also confirm all prerequisites were met

### Rules to Enforce
```text
┌──────────────────────────────────────────────────┐
│  Gate 1: All uploaded documents → verified        │
│  Gate 2: Billing payment → verified               │
│  Gate 3: Org Approval (enabled only after 1 + 2)  │
│  Gate 4: Welcome Email (enabled only after 3)     │
└──────────────────────────────────────────────────┘
```

### Files to Update

**1. `src/pages/admin/seeker-org-approvals/SeekerOrgReviewPage.tsx`**
- Compute `allDocsVerified`: all documents have `verification_status === 'verified'` (true if no documents)
- Compute `billingVerified`: `billing?.billing_verification_status === 'verified'`
- Compute `canApprove`: `allDocsVerified && billingVerified`
- **Disable** the "Approve Organization" button when `!canApprove`
- Add tooltip/helper text listing which prerequisites are unmet
- In the confirmation dialog, list the verification summary (docs count, billing status)

**2. `src/pages/admin/seeker-org-approvals/AdminCredentialsCard.tsx`**
- No change needed — already gates on `org.verification_status !== 'verified'`. This is correct since Welcome Email should only be available after overall org approval.

### No Database Changes Required
All verification statuses are already persisted:
- `seeker_org_documents.verification_status` — per-document
- `seeker_billing_info.billing_verification_status` — billing
- `seeker_organizations.verification_status` — org-level

### Implementation Details
- Pass `documents` and `billing` data to the approval button logic in `SeekerOrgReviewPage`
- Show a checklist-style message near the Approve button:
  - "✓ All documents verified" or "✗ X of Y documents pending/rejected"
  - "✓ Billing payment verified" or "✗ Billing payment not verified"
- Button disabled with clear reasoning when prerequisites are unmet

