

# Gap Analysis: Delegated Seeking Org Admin Creation — Final Status

## What IS Fully Implemented

| Item | File | Status |
|------|------|--------|
| Create Delegated Admin form (SCR-SOA-04) | `CreateDelegatedAdminPage.tsx` | Done — personal details + scope + Zod validation |
| Full cascading taxonomy: Industry → Proficiency → Sub-domain → Speciality | `ScopeMultiSelect.tsx` + `useScopeTaxonomy.ts` | Done — all 4 levels with cascade removal |
| Departments → Functional Areas (user-requested addition) | `ScopeMultiSelect.tsx` | Done |
| Scope overlap warning (MOD-M-SOA-01) | `ScopeOverlapWarning.tsx` | Done — non-blocking, proceed-anyway option |
| Duplicate email check within org | `useDelegatedAdmins.ts` line 116-126 | Done |
| Max delegated admin limit enforcement | `AdminManagementPage.tsx` line 49 | Done — button disabled at limit |
| `create-org-admin` edge function (auth user + org_users) | `supabase/functions/create-org-admin/` | Done |
| Activation link generation (72h expiry) | `useDelegatedAdmins.ts` line 165 | Done |
| Admin Management Console (SCR-SOA-03) | `AdminManagementPage.tsx` | Done — table, search, badges, context banner |
| Edit scope (SCR-SOA-05) | `EditDelegatedAdminPage.tsx` | Done — pre-populated, overlap check |
| Deactivate dialog (MOD-M-SOA-02) | `DeactivateAdminDialog.tsx` | Done — with scope count |
| `deactivate-delegated-admin` edge function (EF-SOA-04) | `supabase/functions/deactivate-delegated-admin/` | Done |
| Activation page (SCR-SOA-02) | `ActivationPage.tsx` | Done — token validation, password rules, T&C checkbox |
| Org Admin Login (SCR-SOA-06) | `OrgAdminLoginPage.tsx` | Done — portal banner, rate limiting, post-login validation |
| PRIMARY-only sidebar gating | `OrgSidebar.tsx` line 42/58 | Done |
| `useDelegatedAdmins` CRUD hooks | `useDelegatedAdmins.ts` | Done — list, create, update scope, deactivate |

## Remaining Gaps (Ordered by Impact)

### Gap 1: Activation link expiry hardcoded instead of from config
**Spec:** `md_mpa_config.activation_link_expiry_hours` should drive the expiry.
**Current:** Line 165 of `useDelegatedAdmins.ts` hardcodes `72 * 60 * 60 * 1000`.
**Fix:** Read `activation_link_expiry_hours` from `md_mpa_config` before generating the link.

### Gap 2: No `tc_acceptances` table insert on activation
**Spec (§4.1):** On activation, insert into `tc_acceptances` with `user_id`, `tc_version_id` (from `useCurrentTcVersion()`), `accepted_at`, and `ip_address`.
**Current:** `admin-activation` edge function updates status but does NOT insert a `tc_acceptances` record. The `tc_acceptances` table may not exist yet.
**Fix:** Create migration for `tc_acceptances` table. Update `admin-activation` edge function to insert acceptance record with IP from `x-forwarded-for`.

### Gap 3: Activation token not SHA-256 hashed
**Spec (§7.2):** Tokens stored as SHA-256 hashes only. Plain token in email link only. Generated with `crypto.randomBytes(32)`.
**Current:** `admin_activation_links` stores a plain UUID token. Both `useCreateDelegatedAdmin` and `ActivationPage` use the raw token for lookup.
**Fix:** Generate token with `crypto.randomBytes(32)`, store SHA-256 hash in DB, send plain token in activation URL. Edge function hashes incoming token before lookup.

### Gap 4: No audit log entry on delegated admin creation
**Spec (BR-DEL-015):** All admin lifecycle changes must log to `org_state_audit_log` with IP address captured via edge functions.
**Current:** `useCreateDelegatedAdmin` does not write an audit log entry. The `deactivate-delegated-admin` edge function also does not write to `org_state_audit_log`.
**Fix:** Add audit log inserts in both edge functions using `req.headers['x-forwarded-for']` for IP capture.

### Gap 5: `console.error` in production code
**Spec (§6.1):** No `console.log` in production code. Use structured logging via `handleMutationError`.
**Current:** `useDelegatedAdmins.ts` line 161 has `console.error('create-org-admin failed...')`. Both edge functions also use `console.error`.
**Fix:** Replace client-side `console.error` with `handleMutationError`. Edge function `console.error` is acceptable (server-side logs).

### Gap 6: `refetchOnWindowFocus` not explicitly set to `false`
**Spec (§9):** `refetchOnWindowFocus: false` on all query hooks.
**Current:** `useDelegatedAdmins`, `useCurrentSeekerAdmin`, `useMaxDelegatedAdmins`, and `useScopeTaxonomy` hooks do not set `refetchOnWindowFocus: false`.
**Fix:** Add `refetchOnWindowFocus: false` to all query hooks.

### Gap 7: Scope overlap triggered on submit, not on blur
**Spec (SCR-SOA-04 element table):** "Scope Overlap Warning — Non-blocking on blur from scope fields."
**Current:** Overlap is checked on form submit, not on blur from scope fields.
**Fix:** Minor — add an effect or blur handler on `ScopeMultiSelect` that checks overlap and shows an inline warning. Keep the submit-time check as final gate.

### Gap 8: Email async uniqueness check on blur
**Spec (SCR-SOA-04 element table):** "Email Input — async uniqueness check on blur within org."
**Current:** Duplicate check only happens on submit inside the mutation.
**Fix:** Add `onBlur` validation on the email field that queries `seeking_org_admins` for existing active admins with that email in the org.

### Gap 9: Self-deactivation prevention
**Spec (Error code `SELF_DEACTIVATION_BLOCKED`):** Actor cannot deactivate themselves.
**Current:** `DeactivateAdminDialog` does not check if the target admin is the currently logged-in user. The `deactivate-delegated-admin` edge function only blocks PRIMARY tier, not self-deactivation.
**Fix:** Add actor = target check in both UI and edge function.

### Gap 10: Scope Narrowing Warning on Edit
**Spec (BR-DEL-011, SCR-SOA-05):** "Scope Narrowing Warning Banner — shows affected role count before save" when the new scope is a subset of the current scope.
**Current:** Edit page shows overlap warning (other admins with same scope) but NOT a narrowing warning (reducing own scope may affect existing assignments).
**Fix:** Add logic to detect when new scope is narrower than current scope and display a warning banner.

### Gap 11: DomainScopeDisplay component for table
**Spec (§4.1):** `DomainScopeDisplay` — resolves UUID arrays to display names. Used in SCR-SOA-03 and SCR-SOA-05.
**Current:** `AdminManagementPage` only resolves industry segment names (line 51-57). Does not show proficiency areas, sub-domains, or specialities.
**Fix:** Create a `DomainScopeDisplay` component that resolves all scope dimensions to names. Use in the table and edit page.

### Gap 12: Deactivated admin status in OrgAdminLoginPage
**Spec (§10.2 Failure Paths):** "Account deactivated: toast.error 'Your account has been deactivated. Contact your Primary Admin or Platform Admin.'"
**Current:** `OrgAdminLoginPage` only checks for `active` and `pending_activation` statuses. Does not handle `deactivated` or `suspended` with specific messages.
**Fix:** Add status-specific error messages for `deactivated` and `suspended`.

---

## Summary: Implementation Completeness for Delegation Flow

**Core functionality: ~85% complete.** The form, scope pickers, CRUD operations, activation, login, and management console all work.

**Remaining gaps are mostly hardening items:** config-driven expiry, audit logging, token hashing, blur-time validation, scope narrowing warnings, and edge-case error handling.

### Recommended Fix Priority

| Priority | Gap | Effort |
|----------|-----|--------|
| 1 | Gap 1 — Config-driven expiry | Small |
| 2 | Gap 2 — `tc_acceptances` table + activation insert | Medium |
| 3 | Gap 4 — Audit log on create/deactivate | Small |
| 4 | Gap 8 — Email uniqueness check on blur | Small |
| 5 | Gap 9 — Self-deactivation prevention | Small |
| 6 | Gap 12 — Deactivated/suspended login messages | Small |
| 7 | Gap 5 — Remove `console.error` | Small |
| 8 | Gap 6 — `refetchOnWindowFocus: false` | Small |
| 9 | Gap 3 — SHA-256 token hashing | Medium |
| 10 | Gap 7 — Overlap on blur | Small |
| 11 | Gap 10 — Scope narrowing warning | Medium |
| 12 | Gap 11 — DomainScopeDisplay component | Small |

