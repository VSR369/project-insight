

## Refined Plan: Smart Welcome Email Logic (Self vs. Separate Admin)

### Current State
- `AdminCredentialsCard` sends ONE welcome email to the primary contact with admin credentials
- No awareness of whether registrant = admin or registrant ≠ admin
- `org_admin_change_requests` table stores `registration_delegate` records when a separate admin is designated during registration (Step 2)
- The separate admin's email is in `org_admin_change_requests.new_admin_email`

### Data Model for Detection
```
IF org_admin_change_requests has a row WHERE
  organization_id = orgId
  AND request_type = 'registration_delegate'
THEN → Separate admin (two emails)
ELSE → Same person (one email)
```

### Implementation

#### 1. Update `useSeekerOrgApprovals.ts` — Query Changes
- In `useSeekerOrgDetail`, add a query for `org_admin_change_requests` filtered by `organization_id` and `request_type = 'registration_delegate'`
- Return as `adminDelegation: { new_admin_name, new_admin_email, new_admin_phone, lifecycle_status } | null`

#### 2. Update `types.ts`
- Add `adminDelegation` field to `SeekerOrgDetailData`:
  ```ts
  adminDelegation: {
    new_admin_name: string | null;
    new_admin_email: string;
    new_admin_phone: string | null;
    lifecycle_status: string;
  } | null;
  ```

#### 3. Refactor Edge Function: `send-seeker-welcome-email`
Accept a new `emailMode` parameter:
- `mode: 'self'` — Single email to registrant/admin with credentials + admin instructions (create roles, publish challenges)
- `mode: 'registrant_only'` — Email to registrant: "Your org is approved. A separate admin has been designated. They will receive their credentials separately."
- `mode: 'admin_only'` — Email to separate admin: welcome + credentials + admin instructions (create roles, publish challenges)

The edge function sends the appropriate email template based on `mode`.

#### 4. Update `AdminCredentialsCard.tsx`
- Accept `adminDelegation` prop
- Detect scenario:
  - **No delegation record** → Show single "Send Welcome Email" button (same person is registrant + admin)
  - **Delegation record exists** → Show two buttons:
    - "Send Welcome Email to Registrant" (no credentials, just approval confirmation)
    - "Send Admin Credentials to [delegation email]" (credentials + admin instructions)
- Display delegation info (delegated admin name/email) when applicable
- The temp password is only shown/sent for the admin recipient

#### 5. Update `SeekerOrgReviewPage.tsx`
- Pass `adminDelegation` from detail data to `AdminCredentialsCard`
- Update workflow Step 4 text to reflect: "Send welcome email(s) — one or two depending on admin designation"

#### 6. Email Content

**Self (registrant = admin) — Single Email:**
```
Subject: Welcome to CogniBlend — {OrgName} Account Activated

Body:
- Your org {OrgName} has been verified and approved
- Login credentials (email + temp password)
- As the Organization Admin, you can now:
  • Create user roles for your team
  • Set up your organization workspace
  • Publish challenges and receive solutions from providers
- Login link
- "Please change your password after first login"
```

**Registrant (when admin is separate):**
```
Subject: {OrgName} Has Been Approved on CogniBlend

Body:
- Your org {OrgName} has been verified and approved
- A designated administrator ({admin_name}) has been assigned
- They will receive their login credentials separately
- Thank you for registering
```

**Separate Admin:**
```
Subject: Welcome to CogniBlend — You Are the Admin for {OrgName}

Body:
- You have been designated as administrator for {OrgName}
- Login credentials (email + temp password)
- As the Organization Admin, you can now:
  • Create user roles for your team
  • Set up your organization workspace
  • Publish challenges and receive solutions from providers
- Login link
- "Please change your password after first login"
```

### Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `types.ts` | Add `adminDelegation` to `SeekerOrgDetailData` |
| 2 | `useSeekerOrgApprovals.ts` | Query `org_admin_change_requests` in detail hook; update `useSendWelcomeEmail` to accept `mode` param |
| 3 | `send-seeker-welcome-email/index.ts` | Handle 3 email modes with distinct templates |
| 4 | `AdminCredentialsCard.tsx` | Accept `adminDelegation`, show 1 or 2 send buttons |
| 5 | `SeekerOrgReviewPage.tsx` | Pass `adminDelegation` to `AdminCredentialsCard` |

### What Is NOT Changing
- Database schema — `org_admin_change_requests` already exists with all needed fields
- Registration flow — untouched
- Document/billing verification flow — untouched
- Rejection flow — handled separately in the billing rejection plan
- `create-org-admin` edge function — untouched
- `config.toml` — no new functions needed

