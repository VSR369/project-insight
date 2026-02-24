

## Fundamental Gap: No User Account Created During Seeker Registration

You've identified a critical missing piece. Here's what's happening:

### Current State

The 5-step Seeker Registration wizard collects:
1. Organization identity (company name, type, country, etc.)
2. Primary contact info (name, email, phone) + OTP email verification
3. Compliance data
4. Plan selection (tier, billing cycle)
5. Billing info + subscription creation

After Step 5, it redirects to `/login` with `toast.success('Registration complete!')`.

**But at no point does the flow call `supabase.auth.signUp()`.** No Supabase Auth user is created. No password is ever collected. No `org_users` record is inserted to map a user to the organization. The contact email is verified via OTP, but it's stored only in `seeker_contacts` — not as an auth account.

### What Needs to Happen

The registration flow must include **user account creation** so the primary contact can log in. This requires:

1. **Collect a password** — Add password + confirm password fields (likely in Step 2, alongside the already-verified email)
2. **Call `supabase.auth.signUp()`** — Create the Supabase Auth user with the verified email and chosen password, passing metadata (first_name, last_name, role)
3. **Insert an `org_users` record** — Map the new `auth.users.id` to the `seeker_organizations.id` with role `tenant_admin`, making them the organization's admin user
4. **Update `seeker_organizations.created_by`** — Set the `created_by` field to the new user ID for audit trail
5. **Handle email confirmation** — Decide whether Supabase's built-in email confirmation is needed (the OTP already verified the email, so it could be marked as pre-confirmed)

### Recommended Implementation Location

**Step 5 (Billing Form) — on "Complete Registration"**, after all data is saved successfully:

```text
Current flow:
  Save billing → Save subscription → Save membership → redirect to /login

Proposed flow:
  Save billing → Save subscription → Save membership
  → signUp(email, password)       ← CREATE AUTH USER
  → insert org_users record       ← MAP USER TO ORG  
  → update org created_by         ← AUDIT TRAIL
  → redirect to /login with success message
```

The password fields should be added to **Step 2** (where email is already collected and verified), and stored in the registration context for use at completion.

### Technical Details

**Step 2 changes (PrimaryContactForm):**
- Add `password` and `confirmPassword` fields with the existing `passwordSchema` validation (8+ chars, mixed case, number, special char)
- Store in registration context `step2` data (password kept in memory only, never persisted to DB)

**Step 5 changes (BillingForm `handleSubmit`):**
- After successful subscription/membership creation, call `supabase.auth.signUp({ email: step2.email, password: step2.password, options: { data: { first_name, last_name } } })`
- Insert `org_users` record: `{ user_id: newUser.id, organization_id, tenant_id, role: 'tenant_admin', is_active: true }`
- Update `seeker_organizations.created_by` to the new user ID
- Handle the case where Supabase sends a confirmation email (or disable it since OTP already verified)

**New edge function (alternative approach):**
- A `create-org-admin` edge function using `service_role` key could atomically create the auth user + org_users record, avoiding RLS issues

**RLS consideration:**
- `org_users` will need a registration-phase INSERT policy (same pattern as other tables)
- Or the edge function approach bypasses RLS entirely with `service_role`

### Security Notes
- Password is never stored in localStorage or registration context persistence — only in React state
- If the user refreshes between Step 2 and Step 5, they must re-enter the password
- The edge function approach is more secure as it keeps account creation server-side

