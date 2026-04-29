
# Execution Plan — Org Console Stabilization (Phase-Gated)

Adopting Claude's "approve 10a only first" review verbatim, with explicit pause gates between every phase, schema-review checkpoints before any migration ships, and rollback runbooks attached to each phase. **Each phase is its own approval — nothing chains automatically.**

I verified Claude's two technical concerns against the live code before drafting:

- **`OrgProvider` already blocks render until `organizationId` is resolved** (`src/contexts/OrgContext.tsx:91-124`). So `useCurrentAdminTier` (which reads `useOrgContext()`) cannot fire with a null org id. Claude's race-condition worry is theoretically sound but practically guarded by the provider. I'll **still** add an explicit `isLoading` skeleton in `OrgSettingsPage` per his suggestion — costs nothing, prevents future regression if `OrgProvider` ever changes its loading contract.
- **`useCurrentAdminTier` already returns `isLoading`** in its result (line 18 + 53). The hook swap is genuinely one-line plus a loading guard.

---

## Phase 10a — Defect fixes (approve now, ships first)

**Scope:** Four surgical UI fixes. No DB migration. No edge-function change. No schema risk.

**10a.1 — Fix Delegated tab restriction**
- `OrgSettingsPage.tsx`: replace `useCurrentSeekerAdmin(organizationId)` with `useCurrentAdminTier()`.
- Remove the `useCurrentSeekerAdmin` import.
- **Add the loading guard Claude flagged**: insert `if (tierLoading) return <OrgSettingsSkeleton />` after the hook call, before computing `visibleTabs`. Skeleton matches the tabs-list height to avoid layout shift.
- Preserve the existing "You are signed in as a Delegated Admin" banner — it now actually triggers.

**10a.2 — Hide raw UUIDs**
- `AdminDetailsTab.tsx`: delete the `User ID` (lines 179–183) and `Organization ID` (lines 199–203) `LockedField` blocks.
- Behind a `import.meta.env.DEV` check, surface them in a collapsible "Technical IDs" disclosure for support engineers.

**10a.3 — Resolve `created_by` / `updated_by` UUIDs to names**
- `useOrgAdminHooks.ts → useOrgAdminDetails`: after the primary admin fetch, run a second query against `seeking_org_admins` joining the two UUIDs to `(full_name, email)`. Return new fields `created_by_name`, `created_by_email`, `updated_by_name`, `updated_by_email` (each null-safe; falls back to `'System'` for null, `'Unknown user'` for unresolvable).
- `AdminDetailsTab.tsx`: render `"Anna Schmidt (anna@…)"` instead of UUIDs.

**10a.4 — Replace `font-mono` with normal font**
- `AdminDetailsTab.tsx:59`: change `font-mono bg-muted/50` → `font-normal text-foreground bg-muted/30`. Lock icon stays as the read-only affordance.

**Tests shipped with 10a:**
1. `OrgSettingsPage.test.tsx`: mock `useCurrentAdminTier` to return `{isPrimary:true,...}` → assert 10 tabs render. Mock to `{isDelegated:true,...}` → assert exactly `['profile','admin','subscription']` render. Mock to `{isLoading:true}` → assert skeleton renders, no tabs. URL-tamper to `?tab=governance` while delegated → assert redirect to `?tab=profile`.
2. `useOrgAdminDetails.test.ts`: given a known admin UUID for `created_by` → resolves to name. Given a fabricated UUID → returns `'Unknown user'`. Given null → returns `'System'`.

**Rollback runbook for 10a:** `git revert <PR-sha>`. No DB state to undo. No data migration. No edge function redeploy. Safe to roll back at any time without user impact (the only behavioural change is the Delegated UI restriction tightening — rolling back makes Delegated admins see all tabs again, which RLS still protects from mutation).

---

## ⏸ Pause gate after 10a

Wait for confirmation that 10a is in production and behaving correctly. Verify in real env:
- A real delegated admin sees only 3 tabs.
- A real primary admin still sees 10 tabs.
- Admin tab no longer shows UUIDs.
- `Created By` / `Modified By` show person names.

Only after that confirmation do I draft Phase 10c.

---

## Phase 10c — Enterprise Tier Configuration (DRAFT — needs schema-review approval)

**Approval gate:** I will post the **complete migration SQL** (table DDL + every RLS policy + every trigger + every CHECK constraint) in a separate plan **before** running it. You approve the SQL itself, not the description.

**The seven concerns Claude raised, addressed in the schema:**

| Claude's concern | How the schema will address it |
|---|---|
| State transitions need a DB-level trigger, not just app-level | A `BEFORE UPDATE` trigger `trg_enterprise_agreements_status_transition` enforces the FSM. Allowed transitions hardcoded in the trigger function. Illegal transitions raise `RAISE EXCEPTION 'Illegal status transition % → %', OLD.status, NEW.status` |
| "Accept Terms" RLS rule must be expressed correctly | I will post the actual policy SQL. Pattern: `CREATE POLICY ... FOR UPDATE USING (status IN ('terms_proposed') AND auth.uid() IN (SELECT user_id FROM seeking_org_admins WHERE organization_id = enterprise_agreements.organization_id AND admin_tier='PRIMARY' AND status='active')) WITH CHECK (status='accepted_by_org')`. Separate policies for each privileged transition |
| `feature_gates jsonb` is unconstrained | New lookup table `md_enterprise_feature_gate_keys (key text PRIMARY KEY, label, description, default_value)`. Trigger validates every key in the incoming `feature_gates` jsonb exists in the lookup. Typos rejected at write time |
| Trigger writeback to `seeker_subscriptions` is vague | Drop the writeback trigger entirely. Instead: read access via a typed view `v_org_active_subscription` that COALESCEs Enterprise overrides on top of the standard subscription row. Existing usage / billing code reads the view, so no clobber risk |
| Soft delete on a contract is risky | Replace `is_deleted/deleted_at/deleted_by` with `cancelled_at/cancelled_by/cancellation_reason text NOT NULL CHECK (length(cancellation_reason)>=10)`. No soft delete. Cancelled contracts remain visible in audit trail |
| Governance mode override absent (Claude's §5 follow-up) | Add `governance_mode_override text CHECK (governance_mode_override IN ('QUICK','STRUCTURED','CONTROLLED') OR governance_mode_override IS NULL)`. Resolution logic in `governanceMode.ts` (existing) extended to consult this column when org's `enterprise_agreements.status='activated'` |
| `current_phase` / `master_status` interaction with `legal_review_threshold_override` | When a CONTROLLED challenge is created against an Enterprise org, the existing `lc_review_required` resolution will be extended to consult `enterprise_agreements.legal_review_threshold_override`. New unit test covers this cross-cut |

**Deliverables when 10c migration is proposed:**
1. Full `CREATE TABLE enterprise_agreements ...` DDL with every column, constraint, default, and FK.
2. Full RLS policy SQL — one CREATE POLICY per access pattern.
3. Full trigger function SQL for FSM enforcement.
4. Full trigger function SQL for `feature_gates` key validation.
5. View definition for `v_org_active_subscription`.
6. Schema diagram (`text` ASCII) showing the table + relationships.
7. Rollback runbook (below).

**Rollback runbook for 10c migration:**
```sql
-- Reverse order of dependency
DROP VIEW IF EXISTS v_org_active_subscription;
DROP TRIGGER IF EXISTS trg_enterprise_agreements_validate_gates ON enterprise_agreements;
DROP TRIGGER IF EXISTS trg_enterprise_agreements_status_transition ON enterprise_agreements;
DROP FUNCTION IF EXISTS validate_enterprise_feature_gates();
DROP FUNCTION IF EXISTS enforce_enterprise_status_fsm();
DROP POLICY ... ON enterprise_agreements;  -- one DROP per CREATE
DROP TABLE IF EXISTS enterprise_agreements;
DROP TABLE IF EXISTS md_enterprise_feature_gate_keys;
-- existing seeker_subscriptions, audit_trail untouched: no data loss
```
Existing `enterprise_contact_requests` rows untouched throughout — they remain readable from `SaasAgreementPage` until the new admin list view ships in a separate UI PR.

**UI in 10c:**
- New `/admin/enterprise-agreements` list page.
- New `/admin/enterprise-agreements/:id` editor split into 6 sub-cards (each ≤250 LOC): Inquiry Snapshot · Commercial Terms · Operational Limits · Feature Gates · Documents · Status Workflow + Notes.
- New "Enterprise Plan" card inside `SubscriptionTab.tsx` rendered only when org's tier is `enterprise` AND an `enterprise_agreements` row has `status IN ('activated','renewed')`.

---

## ⏸ Pause gate after 10c

Verify in real env that an Enterprise inquiry can be reviewed, terms recorded, accepted by org, and the org sees the negotiated plan card. Then draft 10b.

---

## Phase 10b — Surface registration data in admin (DRAFT — non-controversial; ships after 10c)

**Scope:** Pure UI. No new tables. Every change writes to existing audit tables.

**10b.1 — ProfileTab additions**
Add editable: `linkedin_url`, `business_registration_number`, `state_province_id` (cascading select), logo upload (`tenant/{id}/logo/...` storage path).
Add display-only with "Request change" link: `employee_count_range`, `annual_revenue_range`, `operating_geography_ids[]`, `industry_ids[]` registered list.
Convert `timezone` from free-text → Select (reuse `Intl.supportedValuesOf('timeZone')` from `PrimaryContactForm`).

**10b.2 — OrgComplianceTab merge of registration certifications**
Add a "Certifications & Agreements (from registration)" card at the top reading from `seeker_compliance`: GDPR, HIPAA, SOC2, ISO27001, ITAR + expiry, NDA preference, compliance_notes. Booleans → toggles; ITAR expiry → date picker; renewals editable.

**Free-text → FK migration for `data_residency_country` — addressing Claude's concern:**
Instead of "clear with warning logged":
1. Migration adds column `data_residency_country_legacy_text text` (nullable).
2. Migration copies any existing free-text value into the legacy column **before** attempting FK resolution.
3. Resolves matching values to FK rows; non-matching values stay in legacy column with FK left null.
4. Admin UI displays a yellow "Legacy data residency value: 'india' — please reconcile to a registered option" banner whenever `legacy_text IS NOT NULL AND data_residency_id IS NULL`.
5. Ops can run a one-off SQL in their own time to reconcile; nothing is silently nullified.

**10b.3 — Billing Information edit surface in `/org/billing`** — edit `seeker_billing_info` with country-aware postal validation.

**Rollback runbook for 10b:**
```sql
-- 10b is mostly UI; only schema change is the legacy_text column.
ALTER TABLE seeker_compliance DROP COLUMN IF EXISTS data_residency_country_legacy_text;
-- UI changes revert via git revert. No data loss — original free-text values are
-- preserved in the legacy column until DROP, so re-running the resolver after
-- rollback recovers everything.
```

---

## ⏸ Pause gate after 10b → Phase 10d (small) → Phase 10e (tests)

**10d** — OTP restoration behind `VITE_ENABLE_REGISTRATION_OTP` feature flag, surface generated `tempPassword` in copy-only modal after Delegated Admin creation, audit-trail field-name dictionary.

**10e** — Seven Vitest specs (tier restriction, `isFieldEditable` table-driven, name resolver, enterprise RLS, FSM, postal regex, scope overlap).

**Both are low-risk, additive, and rollback = `git revert`.**

---

## Cross-cutting items deferred to legal authoring (NOT code work)

Per Claude's correct observation: the **RA_R2 template body text** must explicitly cover the Delegated case so a Delegate signing the same template doesn't over-claim authority. This is a Platform Admin authoring task on the legal document content, not a code change. Logged here so it's on the legal authoring checklist when RA_R2 is next revised.

---

## Approval requested for THIS message

Reply **"approve 10a"** to ship just Phase 10a (the four defect fixes + tests + skeleton guard).

After 10a is in production and verified, I'll come back with the **full migration SQL** for Phase 10c as a separate plan for schema-level approval. Nothing else proceeds until you explicitly approve each phase.

If you'd rather I bundle 10a + 10d (both are no-DB, low-risk), say **"approve 10a + 10d"** and I'll ship them together.
