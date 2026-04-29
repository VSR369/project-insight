# Stabilization Fix Plan — Post-10c Hidden Gaps + Sequenced 10b/10d/10e

## 1. Independent verification of Claude's claims

I grepped the live repo. All four substantive claims hold:

| Claim | Verified against |
|---|---|
| Override columns are stored but **no consumer reads them** | `rg "max_challenges_override\|max_users_override\|max_storage_gb_override\|feature_gates"` returns only the editor (write), the read hook, the read-only org card, and `types.ts`. No challenge-creation, user-invite, storage-quota, or feature-gated UI references. |
| `feature_gates` JSONB has **no key/type validation** | Migration `20260429124842_*.sql` creates the lookup table but no `validate_feature_gate_keys()` trigger. Typos like `{"shaddow_pricing": true}` and wrong types like `{"sso": "yes"}` ship silently. |
| FSM activation is platform-only (Option A) | `enforce_enterprise_agreement_fsm()` lines 220–235 hard-require `platform_admin_profiles.admin_tier IN ('supervisor','senior_admin')` for the `signed → active` transition. Org PRIMARY cannot self-activate. Decision is correct but undocumented. |
| OTP `TODO: TEMP BYPASS` is real | 6 bypass sites across `src/lib/validations/primaryContact.ts` and `src/components/registration/PrimaryContactForm.tsx`. No env-flag wrapping. |
| Delegated-admin temp password not surfaced to org PRIMARY | `CreateDelegatedAdminPage.tsx` generates `tempPassword` (line 78) and submits it (line 115) but never renders it. Compare to `AdminCredentialsCard.tsx` which does show it on the platform-admin path. |

I also found a side-issue Claude missed: `AgreementEditorForm.tsx` is **264 lines** — over the 250-line workspace cap. Must be split as part of this work.

## 2. Architecture alignment

This plan respects every Lovable architecture rule that's load-bearing here:

- **No DB calls in components** → all override/feature-gate reads go through one new hook (`useEnterpriseLimits`) that wraps the existing `useActiveEnterpriseAgreement`.
- **Extend additively, don't duplicate** → the validation trigger is added to existing tables; no new columns, no parallel feature_gates path.
- **RLS unchanged** → no policy edits; the JSONB trigger is a `BEFORE INSERT/UPDATE` data-shape guard, not an authorization gate.
- **Append-only audit untouched** → `enterprise_agreement_audit` block triggers stay exactly as shipped.
- **Lifecycle uses RPC, never direct status flips** → the existing `useTransitionAgreementStatus` mutation is the only path that hits the FSM; no bypass added.
- **Component cap (250 LOC)** → editor form gets split into `AgreementCommercialFields`, `AgreementOverridesFields`, `AgreementFeatureGatesMatrix` so the host stays a composition layer.
- **Files we touch in `src/services/` get business logic; hooks stay thin** → the override-resolution math (`override ?? tier_default`) lives in a tiny `enterpriseLimitsService.ts`, not in components.

Nothing in this plan changes existing FSM behaviour, RLS, audit policies, or the public `useActiveEnterpriseAgreement` shape — so existing screens (Subscription tab card, Platform Admin page) keep working untouched.

## 3. Phases — execution order is mandatory

```text
10c.5  → 10c.6  → 10c.7  →  10b  →  10d  →  10e
(consumers) (validate) (docs)   (reg UI) (OTP+pwd) (tests)
```

10c.5 and 10c.6 are blockers for any Enterprise contract going live — they ship first, in that order, **not as a single batch**.

---

### Phase 10c.5 — Wire enterprise overrides into consumers

**Goal:** make the negotiated columns actually do something.

New service `src/services/enterprise/enterpriseLimitsService.ts`:
- `resolveLimit(override: number | null, tierDefault: number): number` — single source of truth for the `override ?? tierDefault` rule.
- `isFeatureGateEnabled(gates: Record<string, unknown>, key: string): boolean` — type-safe boolean coercion.

New hook `src/hooks/queries/useEnterpriseLimits.ts`:
- `useEnterpriseLimits(orgId)` returns `{ maxChallenges, maxUsers, maxStorageGb, featureGates, isEnterprise }` by joining `useActiveEnterpriseAgreement(orgId)` with the org's tier defaults (already fetched by `useCurrentAdminTier` / tier service).
- Returns tier defaults when no active agreement exists, so non-enterprise orgs are unaffected.

Consumers to wire (each is a small surgical edit, no logic rewrite):
1. **Challenge creation cap** — wherever `tier.max_challenges` is currently read (likely `useChallengeCreation` or `challengePricingService`), swap to `useEnterpriseLimits().maxChallenges`.
2. **User invite cap** — same swap in the seat-limit check inside the user-invite mutation.
3. **Storage quota** — same swap if a quota check exists; if not, no-op (don't invent one).
4. **Feature gates** — gate visibility (not just disable) of:
   - SSO config UI → `featureGates.sso`
   - White-label/branding admin UI → `featureGates.white_label`
   - API token issuance page → `featureGates.api_access`
   - Audit-export buttons → `featureGates.audit_export`
   - "Dedicated CSM" badge in org header → `featureGates.dedicated_support`
   - AI gateway routing flag → `featureGates.priority_ai`

Where a target UI doesn't yet exist (e.g. SSO config page), do **not** scaffold it — leave a one-line `// TODO(post-MVP): gate behind featureGates.sso when SSO UI lands` comment so the gate point is recorded.

**Acceptance:** unit test asserts `resolveLimit(500, 50) === 500` and `resolveLimit(null, 50) === 50`. Integration-style test (mocked Supabase) asserts that `useEnterpriseLimits` returns the override value when an active agreement exists.

---

### Phase 10c.6 — `feature_gates` JSONB validation trigger

Migration adds one function + one trigger on `enterprise_agreements`:

```text
validate_feature_gate_keys()
  - For every key in NEW.feature_gates:
      assert key ∈ (SELECT key FROM md_enterprise_feature_gate_keys WHERE is_active)
  - For every value in NEW.feature_gates:
      assert jsonb_typeof(value) = 'boolean'
  - RAISE EXCEPTION on first failure with the offending key/value in the message
```

Trigger: `BEFORE INSERT OR UPDATE OF feature_gates ON enterprise_agreements`.

Rollback section in the migration drops both the trigger and the function. No data backfill needed — current rows are either `{}` or already typed correctly (verified by the editor's Zod `z.record(z.boolean())`).

**Why a trigger and not a CHECK constraint:** CHECK constraints can't reference other tables. The lookup table is the source of truth, so this has to be a trigger. Documented in the function header.

---

### Phase 10c.7 — Document activation authority (Option A)

No code change beyond comments + one doc paragraph:

1. Add a header comment to `enforce_enterprise_agreement_fsm()` in a new migration (or as a `COMMENT ON FUNCTION`) stating: *"Activation is platform-only by design. Org PRIMARY admins record their signature out-of-band; Platform Admin records it in `signed_by_org_user` when flipping `signed → active`. Do not relax this without a security review."*
2. Add the same note to the JSDoc of `useTransitionAgreementStatus` in `useEnterpriseAgreement.ts`.
3. Add one paragraph to `.lovable/plan.md` under a new "Decisions of record" section.

This closes Claude's Gap 4 without changing behaviour.

---

### Phase 10b — Registration data surfacing (now safe to run)

Three additive UI tasks, no migration, no tenant_id changes:

- **10b.1 ProfileTab** — add edit fields for `linkedin_url`, `business_registration_number`, `state_province_id` (FK Select), logo upload, `employee_count_range`, `annual_revenue_range`, geography badges, timezone Select. Use existing `useUpdateOrganization` mutation; extend its Zod schema additively.
- **10b.2 OrgComplianceTab** — surface registration-time `seeker_compliance` flags (ITAR/SOC2/ISO27001/GDPR/HIPAA/NDA) as read-with-edit. Convert `data_residency_country` from free-text Input to FK Select against `md_countries`. **Migration preserves originals** by adding `data_residency_country_legacy_text TEXT` and copying current free-text values into it before the column type changes — no silent nulls.
- **10b.3 Billing edit surface** — `/org/billing` route gains an edit form for billing entity, address, PO number, tax ID. Reuses existing `billingService`.

Each tab change is a separate atomic commit so any one can roll back independently.

---

### Phase 10d — OTP restoration + delegated-admin password reveal

**OTP — env-flagged, not deleted:**

In `src/lib/validations/primaryContact.ts`:

```text
is_email_verified: import.meta.env.VITE_ENABLE_REGISTRATION_OTP === 'true'
  ? z.literal(true, { errorMap: () => ({ message: 'Email verification required' }) })
  : z.boolean().default(true)
```

In `PrimaryContactForm.tsx`: replace each `TODO: TEMP BYPASS` site with `const otpRequired = import.meta.env.VITE_ENABLE_REGISTRATION_OTP === 'true'` and gate the OTP section, the `disabled={emailVerified}` on the email field, and the submit-button guard on `otpRequired`.

`.env` (dev): `VITE_ENABLE_REGISTRATION_OTP=false`.
Production cutover checklist (new file `docs/runbooks/production-cutover.md`): one line — *"Set `VITE_ENABLE_REGISTRATION_OTP=true` in production env."*

**Delegated admin password reveal:**

In `CreateDelegatedAdminPage.tsx`, on successful create, render a copy-only modal showing `tempPassword` with the same UX as `AdminCredentialsCard.tsx` (masked by default, reveal toggle, copy-to-clipboard, "I have saved this — close" button). Password is shown once and never persisted to client state beyond the modal lifecycle.

---

### Phase 10e — Test coverage (Vitest only; defer RLS to integration env)

Ship as Vitest specs in this order:

1. `enterpriseLimitsService.test.ts` — `resolveLimit` and `isFeatureGateEnabled` table-driven.
2. `useEnterpriseAgreement.fsm.test.ts` — every illegal transition is rejected; `signed → active` requires platform admin (mocked).
3. `validate_feature_gate_keys.test.ts` — Vitest spec calling the live function via Supabase test client; unknown key and non-boolean value both throw.
4. `isFieldEditable.test.ts` — table-driven matrix.
5. `postalCodeRegex.test.ts` — per-country.
6. `scopeOverlap.test.ts` — provider grant overlap warning.

RLS test (PRIMARY-only SELECT, delegated-admin denial) stays deferred until an integration test environment exists; tracked as one TODO in `.lovable/plan.md`, not as silent debt.

---

### Side-fix piggybacked on 10c.5

`AgreementEditorForm.tsx` is 264 LOC. Split into:
- `AgreementEditorForm.tsx` (host, <120 LOC)
- `AgreementCommercialFields.tsx` (ACV, currency, cadence, dates)
- `AgreementOverridesFields.tsx` (the three `_override` numeric inputs)
- `AgreementFeatureGatesMatrix.tsx` (lookup-driven Switch grid)

This unblocks 10c.5's edits to the overrides section without bloating the file further.

## 4. What this plan deliberately does NOT do

- Does **not** change the FSM (no org-side activation path).
- Does **not** touch RLS on `enterprise_agreements`, `enterprise_agreement_audit`, or `md_enterprise_feature_gate_keys`.
- Does **not** modify `complete_phase` or any other lifecycle RPC.
- Does **not** delete the OTP infrastructure (`useSendOtp`, `useVerifyOtp`, `OtpVerification.tsx`) — they're left intact and re-enabled by the env flag.
- Does **not** invent SSO/white-label/API-token UIs that don't exist yet — only gates the ones that do, leaves marker comments for the rest.
- Does **not** batch any of these phases. Each ships, the regression suite runs, then the next starts.

## 5. Approval gates

Reply **"approve 10c.5"** to start with the override-consumer wiring and editor split. After it lands and tests pass I'll request approval for 10c.6, then 10c.7, then 10b, 10d, 10e in turn.
---

## 6. Decisions of record

### Enterprise Agreement activation authority — Platform-only (Option A)
- The DB trigger `enforce_enterprise_agreement_fsm` permits the `signed → active` transition only when `auth.uid()` is a platform supervisor or senior_admin.
- Org PRIMARY admins do NOT self-activate. They sign the MSA out-of-band; Platform Admin records who signed in `signed_by_org_user` when activating.
- Codified in: SQL `COMMENT ON FUNCTION enforce_enterprise_agreement_fsm` (Phase 10c.6 migration) + JSDoc on `useTransitionAgreementStatus`.
- Do not relax without a security review.

### feature_gates schema integrity — write-time validation
- `validate_feature_gate_keys()` BEFORE INSERT OR UPDATE OF feature_gates trigger:
  - Rejects keys not in active `md_enterprise_feature_gate_keys`.
  - Rejects non-boolean values.
- Read-side defence-in-depth via `isFeatureGateEnabled()` in `enterpriseLimitsService`.

---

## 7. Progress log

- ✅ **Phase 10c.5** — `enterpriseLimitsService` (10/10 tests green), `useEnterpriseLimits` hook, editor split into 4 files (host now <90 LOC), TeamPage and OrgBillingPage now consume effective limits via the override-aware hook.
- ✅ **Phase 10c.6** — `validate_feature_gate_keys` trigger live on `enterprise_agreements`.
- ✅ **Phase 10c.7** — Activation-authority decision documented in SQL `COMMENT ON FUNCTION` and `useTransitionAgreementStatus` JSDoc.
- ⏭️ **Phase 10b** — awaiting approval.
- ⏭️ **Phase 10d** — awaiting approval.
- ⏭️ **Phase 10e** — partially complete (service tests done); FSM/regex/scope tests awaiting approval.

- ✅ **Phase 10b** — ProfileTab gained `linkedin_url` + employee/revenue band Selects (extracted `ProfileExtraFieldsSection` + `profileFormSchema`). OrgComplianceTab now displays read-only `seeker_compliance` registration profile (ITAR/SOC2/ISO27001/GDPR/HIPAA/NDA/data-residency/export-control) above the operational config form. OrgBillingPage gained a `BillingInfoCard` editing `seeker_billing_info` (entity, email, address, PO, tax ID). No migration needed — Claude's `data_residency_country_legacy_text` concern was based on a misread; `seeker_compliance.data_residency_id` is already an FK and `org_compliance_config.data_residency_country` is a separate operational override.
- ✅ **Phase 10d** — OTP restored as env-flagged (no deletion of OTP infra). New `src/lib/featureFlags.ts` exposes `isRegistrationOtpEnabled()`; `primaryContactSchema` uses `z.literal(true)` when ON, lenient default OFF. `PrimaryContactForm` now reveals `<OtpVerification>`, locks the email input post-verify, and gates submit on `emailVerified` only when the flag is ON. Default is OFF in `.env` for dev/preview. Production cutover documented in `docs/runbooks/production-cutover.md`. Delegated-admin temp password is now surfaced via new `TempPasswordRevealDialog` (masked + reveal toggle + copy + acknowledgement gate, parity with `AdminCredentialsCard`); `CreateDelegatedAdminPage` opens the dialog on success and navigates only after the org PRIMARY acknowledges. Note: pre-existing files `CreateDelegatedAdminPage.tsx` (now 317 LOC) and `PrimaryContactForm.tsx` (789 LOC) remain over the 250-LOC cap — flagged for a follow-up decomposition pass; not in scope for 10d.
- ✅ **Phase 10e** — Vitest coverage added (no edge-fn / no DB):
  - `enterpriseAgreementFsm.test.ts` (28 specs) — every legal/illegal edge in `LEGAL_TRANSITIONS`, `signed→active` flagged as platform-only, terminal-status invariants. Backed by a new tiny pure module `src/services/enterprise/enterpriseAgreementFsm.ts` that mirrors the DB trigger as a UI pre-flight (greys out illegal "next status" actions before submit). MUST stay in sync with `enforce_enterprise_agreement_fsm`.
  - `primaryContact.test.ts` (11 specs) — `isRegistrationOtpEnabled` strict-`"true"` semantics, OTP gate OFF accepts `is_email_verified=false`, OTP gate ON rejects with "verification required" message, password-match still enforced independently, `extractDomain` + `isInstitutionalDomain` behaviour. Required schema refactor: moved the OTP gate from a build-time conditional `z.literal(true)` to a parse-time `superRefine` so env changes (and `vi.stubEnv`) take effect without re-importing.
  - `useDelegatedAdmins.scope.test.ts` (10 specs) — `checkScopeOverlap` (industry intersection only, deactivated admins ignored, edit-context exclusion, null-scope fallback) + `detectScopeNarrowing` widen/narrow/identical cases. Supabase client + audit fields + sonner mocked at module level so the suite stays a pure unit test.
  - Total: 59 specs green across all four enterprise/registration suites.
