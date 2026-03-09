

## Gap Analysis: TechSpec SOA v4 Enhanced (Rev 2) vs Current Implementation

### Implemented (with corrections applied)

| Spec Item | Status | Notes |
|-----------|--------|-------|
| **SCR-SOA-01** — Verification Review Page | **Done** | Approve/Reject/Return/Suspend. No role-based gating (per user correction: all admins can approve) |
| **SCR-SOA-02** — Activation Page (`/activate?token=`) | **Done** | Token validation, password set with strength meter, T&C checkbox, success state |
| **SCR-SOA-03** — Admin Management Console (`/org/admin-management`) | **Done** | Session context banner, delegated admin table, search, add/edit/deactivate, status badges, max admin limit |
| **SCR-SOA-04** — Create Delegated Admin (`/org/admin-management/create`) | **Done** | Personal details form + `ScopeMultiSelect` with Industry Segments, Departments, Functional Areas |
| **SCR-SOA-05** — Edit Delegated Admin Scope | **Done** | Pre-populated scope pickers, admin info read-only, save scope |
| **MOD-M-SOA-02** — Deactivate Admin Dialog | **Done** | `DeactivateAdminDialog.tsx` with confirmation |
| **EF-SOA-01** — `create-org-admin` edge function | **Done** | Creates auth user + org_users mapping |
| **EF-SOA-02** — `send-seeker-welcome-email` | **Done** | Sends welcome email |
| **EF-SOA-03** — `admin-activation` edge function | **Done** | Validates token, sets password, updates status to active |
| **EF-SOA-04** — `deactivate-delegated-admin` | **Done** | Deactivates admin record |
| Post-approval provisioning chain | **Done** | `useApproveOrg` creates PRIMARY `seeking_org_admins` record + activation link |
| Open Claim / Auto-Assign toggle | **Done** | `md_mpa_config` with `ConfigParamRow` ENUM dropdown |
| `claim_org_for_verification` RPC | **Done** | Atomic concurrency guard |
| Routes & sidebar | **Done** | `/org/admin-management`, create, edit routes in `App.tsx`; `OrgSidebar` has Admin Management link |
| `useDelegatedAdmins` CRUD hooks | **Done** | List, create, update scope, deactivate |

### Gaps Remaining

#### 1. SCR-SOA-06 — Org Admin Login Page (`/org/login`) — NOT BUILT
The spec requires a **separate login page** at `/org/login` specifically for Org Admins. Currently there is no `/org/login` route. The ActivationPage success state links to `/login` (the generic login), not `/org/login`.

**What's needed:**
- `OrgAdminLoginPage` at `/org/login` (public route)
- Portal identity banner ("Seeking Organisation Admin Portal")
- Info banner for platform admins: "Looking to manage the platform? Sign in at /admin/login."
- Post-login validation: query `seeking_org_admins` to confirm `admin_tier = PRIMARY` and `status = active`
- Redirect to `/org/admin-management` on success
- Rate limiting (5 failures → 15-min lockout)

#### 2. Session Isolation — NOT IMPLEMENTED
The spec emphasizes complete session isolation between Platform Admin (`/admin/**`) and Org Admin (`/org/**`) portals. Currently there is no `session_type` JWT claim, no `OrgAdminRouteGuard`, and no `AdminRouteGuard` checking session type. A platform admin can access `/org/**` routes and vice versa.

**What's needed:**
- `session_type` metadata in JWT (`platform_admin` vs `org_admin`)
- Route guards checking session type
- 403 page for wrong-portal access attempts

**Note:** Per previous discussion, this was deferred. The current single auth model works functionally but doesn't enforce isolation.

#### 3. Cascading Scope Pickers — PARTIALLY IMPLEMENTED
`ScopeMultiSelect` currently supports **Industry Segments**, **Departments**, and **Functional Areas**. The spec also requires:
- **Proficiency Areas** (filtered by selected Industry Segments)
- **Sub-domains** (filtered by selected Proficiency Areas)
- **Specialities** (filtered by selected Sub-domains)

The `DomainScope` interface already has fields for these (`proficiency_area_ids`, `sub_domain_ids`, `speciality_ids`) but the UI pickers are missing. The hooks `useProficiencyAreas(segmentIds)`, `useSubDomains(profAreaIds)`, `useSpecialities(subDomainIds)` are referenced in the spec but not implemented.

#### 4. Scope Overlap Warning (MOD-M-SOA-01) — NOT BUILT
The spec requires a warning modal when creating/editing a delegated admin whose scope overlaps with an existing admin's scope. The `check_scope_overlap` RPC and `useScopeOverlapCheck` hook are not implemented.

#### 5. Deactivation Modal — Missing Role Count
The spec requires the deactivation modal to show the count of roles that will be reassigned to the Primary admin. The `get_delegated_admin_role_count` RPC is not implemented. Current `DeactivateAdminDialog` is a simple confirmation.

#### 6. Activation Page — Minor Gaps
- Success state links to `/login` instead of `/org/login` (per spec)
- No T&C version modal (`TcVersionModal`) — just a checkbox
- No `tc_acceptances` table insert to record acceptance with version + IP
- Password validation: spec requires uppercase + digit + special char; current code only checks length

#### 7. Missing Config Parameters
- `activation_link_expiry_hours` — may not exist in `md_mpa_config` (hardcoded as 72h in code)
- `activation_reminder_24h_enabled` / `activation_reminder_48h_enabled` — not implemented
- `max_delegated_admins_per_org` — code references it but may not exist in DB

#### 8. pg_cron Activation Reminders — NOT BUILT
Spec requires 24h and 48h reminder emails for unused activation links.

#### 9. Audit Logging via Edge Functions (IP capture) — NOT DONE
Audit log entries are written client-side and lack IP addresses. Spec requires routing through edge functions for IP capture via `x-forwarded-for`.

#### 10. OrgSidebar — PRIMARY-Only Gating Missing
"Admin Management" sidebar item is visible to ALL org users. Spec requires it to be hidden for DELEGATED admins (only PRIMARY admins should see it).

---

### Recommended Implementation Priority

| Priority | Gap | Effort |
|----------|-----|--------|
| **1** | Add Proficiency Areas / Sub-domains / Specialities to `ScopeMultiSelect` | Medium — need cascading hooks + UI pickers |
| **2** | Fix ActivationPage success link to `/org/login` + password validation rules | Small |
| **3** | Add PRIMARY-only gating on Admin Management sidebar item | Small |
| **4** | Build `/org/login` page (SCR-SOA-06) | Medium |
| **5** | Add scope overlap warning on create/edit | Medium |
| **6** | Add `activation_link_expiry_hours` config param usage (read from DB instead of hardcoding 72h) | Small |
| **7** | Enhance DeactivateAdminDialog with role count | Small |
| **8** | Session isolation (route guards) | Large — deferred |
| **9** | pg_cron reminders | Medium — deferred |
| **10** | Audit logging via edge functions for IP | Medium — deferred |

Shall I proceed with implementing gaps 1-7 (the actionable items)?

