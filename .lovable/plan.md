# Phase 10c — Enterprise Tier Configuration (UI SHIPPED)

Status: **DB layer applied. Hooks, Platform Admin page, and Org read-only card all wired. Awaiting QA.**

## UI just landed

- `src/hooks/queries/useEnterpriseAgreement.ts` — read + mutate hooks (active view, list, detail, audit, gate keys, upsert, status FSM transitions).
- `src/components/org-settings/EnterpriseAgreementCard.tsx` — read-only contract summary for PRIMARY admins on enterprise tier; slotted into `SubscriptionTab`.
- `src/components/admin/enterprise/` — `AgreementEditorForm`, `AgreementStatusControls`, `AgreementAuditTrail`, `OrgPicker` (each <250 lines).
- `src/pages/admin/EnterpriseAgreementsPage.tsx` — list / create / edit / status FSM / audit at `/admin/enterprise-agreements` (guarded by `org_approvals.manage_agreements`).
- Contract test: `src/hooks/queries/__tests__/useEnterpriseAgreement.contract.test.ts`.

## What just landed (DB layer)

### Tables
- `md_enterprise_feature_gate_keys` — 7 seeded gates (sso, white_label, api_access, dedicated_support, audit_export, custom_integrations, priority_ai)
- `enterprise_agreements` — per-org negotiated terms: ACV, ISO-4217 currency, billing cadence, contract dates, override caps (challenges/users/storage), `governance_mode_override`, `feature_gates` JSONB, MSA URL, signers
- `enterprise_agreement_audit` — append-only forensic trail; UPDATE/DELETE blocked by `block_ent_audit_mutations()` trigger

### Triggers
- `enforce_enterprise_agreement_fsm()` — gates `draft → in_negotiation → signed → active → expired/terminated`. **Activation requires platform supervisor/senior_admin** + non-null contract dates.
- `write_enterprise_agreement_audit()` — auto-writes audit row on every INSERT/UPDATE
- `sync_enterprise_governance_override()` — on activation, upserts `org_governance_overrides` row from `governance_mode_override`
- `trg_enterprise_agreements_updated_at` — standard timestamp maintenance

### View
- `v_org_active_enterprise_agreement` — read-only effective terms (joins tier code/name)

### RLS
- Platform `supervisor` / `senior_admin`: full CRUD on agreements + read on audit
- Org `seeking_org_admins.admin_tier='PRIMARY'`: SELECT only on their org's agreement + audit
- Delegated admins: no access
- `md_enterprise_feature_gate_keys`: read for all authenticated, write for platform admins only

### Unique constraint
- `idx_enterprise_agreements_active_per_org` — only one `active` agreement per organization

## Linter
506 pre-existing repo-wide issues (security definer views, mutable function search paths in unrelated functions). Our new functions all use `SECURITY DEFINER SET search_path = public`. Our new view is plain `CREATE OR REPLACE VIEW` with no `SECURITY DEFINER`. Nothing in this migration adds new findings.

## Next (after migration approval — types.ts regenerates first)

1. **Hooks** (`src/hooks/queries/useEnterpriseAgreement.ts`)
   - `useActiveEnterpriseAgreement(orgId)` — reads `v_org_active_enterprise_agreement`
   - `useEnterpriseAgreements(orgId?)` — platform admin list
   - `useUpsertEnterpriseAgreement()` / `useTransitionAgreementStatus()` — platform mutations
   - `useEnterpriseFeatureGateKeys()` — lookup
   - `useEnterpriseAgreementAudit(agreementId)` — forensic trail

2. **Platform Admin page** (`src/pages/admin/EnterpriseAgreementsPage.tsx` + components in `src/components/admin/enterprise/`)
   - Route `/admin/enterprise-agreements`
   - Guard with `<TierGuard requiredTier="senior_admin">`
   - Org search → agreement editor (commercial, overrides, feature gates, MSA upload, status FSM)
   - Audit trail viewer
   - Files <250 lines each (form / status timeline / feature-gate matrix split)

3. **Org Settings read-only card** (`src/components/org-settings/EnterpriseAgreementCard.tsx`)
   - Shown in `OrgSettingsPage` Subscription tab when org tier = `enterprise` AND PRIMARY admin
   - Renders ACV, dates, billing cadence, effective overrides, enabled feature gates, audit timeline
   - "Contact your account manager to amend" CTA — no edit affordances

4. **Regression tests** (Vitest)
   - FSM rejects illegal transitions
   - Non-platform user cannot flip to `active` (RLS + trigger)
   - Activation triggers governance_overrides upsert
   - Audit table rejects UPDATE / DELETE
   - Delegated admin cannot SELECT agreement
   - PRIMARY admin can SELECT only their org's agreement

## Rollback
```sql
DROP VIEW IF EXISTS public.v_org_active_enterprise_agreement;
DROP TABLE IF EXISTS public.enterprise_agreement_audit CASCADE;
DROP TABLE IF EXISTS public.enterprise_agreements CASCADE;
DROP TABLE IF EXISTS public.md_enterprise_feature_gate_keys CASCADE;
DROP FUNCTION IF EXISTS public.enforce_enterprise_agreement_fsm() CASCADE;
DROP FUNCTION IF EXISTS public.write_enterprise_agreement_audit() CASCADE;
DROP FUNCTION IF EXISTS public.sync_enterprise_governance_override() CASCADE;
DROP FUNCTION IF EXISTS public.block_ent_audit_mutations() CASCADE;
```
No data migration to undo. `org_governance_overrides` rows created by activation sync remain harmless if the parent agreement disappears (they're independent records).

---

# Phase 10a — Org Console Stabilization (SHIPPED — see prior plan history in git)
12 regression tests green. Tab gating, audit name resolution, UUID hiding, and font-mono cleanup all live.
