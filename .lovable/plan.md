
# Seeking Org Admin — Missing Configuration Surface (Impact Analysis & Fix)

## 1. The headline problem

The Seeker Org Portal has **two parallel UIs**:

- **`OrgSettingsPage`** (`/org/settings`) — a 10-tab control center with Profile, Admin, Subscription, Engagement, **Governance**, **Legal templates**, **Finance**, **Compliance**, **Custom Fields**, **Audit Trail**.
- **`OrgSidebar`** — the navigation a logged-in admin actually sees.

The sidebar's logic (`src/components/org/OrgSidebar.tsx` lines 54–104) hides the "Organization" group entirely when the logged-in user is an SO Admin:

```ts
const isSOAdmin = !!currentAdmin;
const orgItems = isSOAdmin ? [] : [
  { title: 'Settings',         path: '/org/settings' },
  { title: 'Team',             path: '/org/team' },
  { title: 'Membership',       path: '/org/membership' },
  { title: 'Parent Dashboard', path: '/org/parent-dashboard' },
];
```

It also hides `Challenges`, `Create Challenge`, and `Billing` for the same reason.

Net effect for a **PRIMARY Seeking Org Admin** today:

| Sidebar shows | What's hidden but built |
|---------------|--------------------------|
| Dashboard | **Organization Settings (all 10 tabs)** |
| Role Management | All Challenges / Create Challenge |
| Role Readiness | Team |
| Delegated Admins | Membership |
| My Profile | Parent Dashboard |
| Email Templates | Billing & Usage |
| Shadow Pricing | (Legal Templates tab — the main thing they asked about) |
| Knowledge Centre | (Finance tab) |
|  | (Compliance tab) |
|  | (Governance Profile + Overrides) |
|  | (Custom Fields) |
|  | (Audit Trail) |

**This is why "I cannot see legal documents".** The `OrgLegalTemplatesTab` is fully built (with `useOrgLegalTemplates` CRUD, `CpaTemplateSection`, Add/Edit dialogs) but lives behind a route the admin can't reach.

## 2. Built but unreachable for SO Admins

Routes that exist in `App.tsx` (lines 1054–1072) but are not in the SO Admin sidebar:

| Route | Page | Purpose | Who needs it |
|-------|------|---------|--------------|
| `/org/settings` | OrgSettingsPage | 10-tab control center | PRIMARY SO Admin |
| `/org/challenges` | ChallengeListPage | View all org challenges | PRIMARY + DELEGATED |
| `/org/challenges/create` | ChallengeCreatePage | Org-level create (not the cogni wizard) | PRIMARY |
| `/org/team` | TeamPage | Org members listing | PRIMARY |
| `/org/membership` | MembershipPage | Plan/seat membership | PRIMARY |
| `/org/parent-dashboard` | ParentDashboardPage | Parent-org rollup | PRIMARY (parent orgs) |
| `/org/billing` | OrgBillingPage | Subscription, invoices, usage | PRIMARY |

Tabs inside Settings that currently have **no other entry point** anywhere:

| Tab | Component | What it configures |
|-----|-----------|--------------------|
| Profile | ProfileTab | Org name, industries, geos, website |
| Admin | AdminDetailsTab | Primary admin details, transfer |
| Subscription | SubscriptionTab | Plan, tier, renewal |
| Engagement | EngagementModelTab | MP / AGG selection per challenge |
| Governance | GovernanceProfileTab + GovernanceOverridesSection | Default mode + per-mode overrides |
| **Legal templates** | OrgLegalTemplatesTab + CpaTemplateSection | Org-level legal docs (AGG model) — **the missing piece** |
| Finance | OrgFinanceTab | Org-level rate cards, currency |
| Compliance | OrgComplianceTab | HIPAA, GDPR, SOC2 attestations |
| Custom Fields | OrgCustomFieldsTab | Tenant-defined challenge fields |
| Audit Trail | AuditTrailTable | Org-level audit log viewer |

## 3. Why the sidebar was wired this way (assumption + fix)

The original intent was probably "an SO Admin's job is people + roles, not org admin chores." That is wrong — a **PRIMARY** SO Admin is, by definition, the owner of the org's configuration (governance, legal, finance, compliance). DELEGATED admins are scoped to people/roles only.

Correct visibility model:

| Section | PRIMARY | DELEGATED | Non-admin org user |
|---------|---------|-----------|--------------------|
| Dashboard | ✅ | ✅ | ✅ |
| Challenges (list + create) | ✅ | ✅ (scoped) | ✅ |
| Role Management | ✅ | ✅ | ❌ |
| Role Readiness | ✅ | ✅ | ❌ |
| Delegated Admins | ✅ (if delegation enabled) | ❌ | ❌ |
| My Profile | ✅ | ✅ | ✅ |
| Email Templates | ✅ | ❌ | ❌ |
| Shadow Pricing | ✅ | ❌ | ❌ |
| Knowledge Centre | ✅ | ✅ | ❌ |
| **Org Settings (parent group)** | ✅ | ❌ | ❌ |
| → Profile / Admin / Subscription | ✅ | ❌ | ❌ |
| → Engagement / Governance | ✅ | ❌ | ❌ |
| → **Legal Templates** | ✅ | ❌ | ❌ |
| → Finance / Compliance | ✅ | ❌ | ❌ |
| → Custom Fields / Audit Trail | ✅ | ❌ | ❌ |
| Team | ✅ | ❌ | ✅ |
| Membership | ✅ | ❌ | ✅ |
| Parent Dashboard | ✅ (parent orgs only) | ❌ | ❌ |
| Billing & Usage | ✅ | ❌ | ✅ |

## 4. Proposed changes

### A. Sidebar restructure (`src/components/org/OrgSidebar.tsx`)

Replace the mutual-exclusion logic with role-additive groups:

1. **Workspace** — Dashboard, Challenges, Create Challenge (always visible to admins)
2. **Role Management** — Role Management, Role Readiness, Delegated Admins (admins only)
3. **Org Configuration** (PRIMARY only) — six direct shortcuts opening the right tab on `OrgSettingsPage`:
   - Settings & Profile → `/org/settings?tab=profile`
   - Governance → `/org/settings?tab=governance`
   - **Legal Templates → `/org/settings?tab=legal-templates`** ← the main fix
   - Finance → `/org/settings?tab=finance`
   - Compliance → `/org/settings?tab=compliance`
   - Audit Trail → `/org/settings?tab=audit`
4. **Operations** (PRIMARY only) — Email Templates, Shadow Pricing, Custom Fields
5. **Resources** — Knowledge Centre, My Profile (both tiers)
6. **Account** — Team, Membership, Billing (PRIMARY only — DELEGATED do not own billing)

DELEGATED admin sees only Workspace + Role Management + Resources.

### B. Make `OrgSettingsPage` deep-linkable

Today the page uses `defaultValue="profile"` so the sidebar's per-tab links would land on the wrong tab. Add `?tab=…` URL-param support:

```ts
const [search, setSearch] = useSearchParams();
const tab = search.get('tab') ?? 'profile';
<Tabs value={tab} onValueChange={(v) => setSearch({ tab: v })}>
```

Persists tab choice across reloads/back-button and lets the sidebar deep-link.

### C. Tier-gate sensitive tabs inside `OrgSettingsPage`

Today every authenticated user that lands on `/org/settings` sees every tab. We should:

- Hide Governance / Legal / Finance / Compliance / Custom Fields / Audit Trail tabs unless `currentAdmin?.admin_tier === 'PRIMARY'`.
- Show a "Read-only — Primary admin required" banner for DELEGATED admins on the tabs they're allowed to view (Profile, Subscription).

### D. Remove the `OrgLegalTemplatesTab` content gap

The legal-template UI is real, but it's currently only useful to AGG orgs. Add a small visibility hint inside the tab so MP-only orgs understand why the table is empty:

> "Org-level legal templates apply only to AGG (Aggregator) challenges. Your organization is currently MP — these templates will not be auto-attached."

Driven off `currentOrg.engagement_model`.

### E. Cross-link from Dashboard

`PrimaryAdminDashboard` already has CTAs to Role Management / Readiness / Delegated Admins / Email Templates. Add three more shortcut cards: **Legal Templates**, **Governance Profile**, **Compliance** (each routes to the relevant settings tab via the new `?tab=` param).

### F. Backend (no schema change required)

Everything needed already exists:
- `org_legal_document_templates` table + RLS
- `useOrgLegalTemplates`, `useCreateOrgLegalTemplate`, `useUpdateOrgLegalTemplate` hooks
- `seeking_org_admins.admin_tier` column already drives `useCurrentSeekerAdmin`

Only one optional addition: a SECURITY DEFINER helper `is_primary_seeking_admin(p_user_id, p_org_id) returns boolean` used to harden RLS on `org_legal_document_templates`, `org_finance_*`, `org_compliance_*` so that DELEGATED admins literally cannot UPDATE/DELETE those rows even via direct API. Recommended but not required for the visibility fix.

## 5. Other things "built but missing visibility" surfaced during this review

| Capability | Component | Currently reachable? |
|------------|-----------|----------------------|
| **OrgEmailTemplates** | OrgEmailTemplatesPage | ✅ in sidebar |
| **OrgKnowledgeCentre** | OrgKnowledgeCentrePage | ✅ in sidebar |
| **OrgShadowPricing** | OrgShadowPricingPage | ✅ in sidebar |
| **OrgContactProfile (My Profile)** | OrgContactProfilePage | ✅ in sidebar |
| **CpaTemplateSection** (CPA per governance mode) | inside Legal tab | ❌ unreachable today |
| **GovernanceOverridesSection** (per-mode legal/escrow/curation overrides) | inside Governance tab | ❌ unreachable today |
| **OrgFinanceTab** (org-level rate cards) | inside Finance tab | ❌ unreachable today |
| **OrgComplianceTab** (HIPAA / GDPR / SOC2 declarations) | inside Compliance tab | ❌ unreachable today |
| **OrgCustomFieldsTab** (tenant-defined fields) | inside Custom Fields tab | ❌ unreachable today |
| **AuditTrailTable** (org-scoped audit log) | inside Audit Trail tab | ❌ unreachable today |
| **ParentDashboardPage** (parent-org rollup) | route exists | ❌ no sidebar entry |

All become reachable after the changes in §4.

## 6. Risk & rollout

- **Risk: low** — no DB schema changes; only sidebar, deep-link param, and tier guards.
- **Backward-compat**: existing `/org/settings` URL keeps working (defaults to profile tab).
- **Test path**: log in as PRIMARY admin → sidebar shows Org Configuration group → click "Legal Templates" → lands on `/org/settings?tab=legal-templates` with the existing `OrgLegalTemplatesTab` rendering AGG templates and CPA templates.

## 7. Files to change

1. `src/components/org/OrgSidebar.tsx` — restructure groups (per §4A).
2. `src/pages/org/OrgSettingsPage.tsx` — `?tab=` URL-param support + tier gating (per §4B/C).
3. `src/components/org-settings/OrgLegalTemplatesTab.tsx` — add MP-only visibility hint (per §4D).
4. `src/components/org/dashboard/PrimaryAdminDashboard.tsx` — three new shortcut cards (per §4E).
5. (Optional, recommended) one migration adding `is_primary_seeking_admin()` helper + hardened RLS on `org_legal_document_templates`, `org_finance_*`, `org_compliance_*`.

## 8. Decisions I need from you

1. **Confirm the visibility matrix in §3** — especially: Should DELEGATED admins see Org Configuration tabs read-only, or be hidden entirely? My recommendation: hidden entirely (cleaner, less confusion).
2. **Org-level Create Challenge vs. Cogni wizard** — `/org/challenges/create` and `/cogni/challenges/create` both exist. Should the sidebar route admins to the Cogni wizard (single canonical path) and retire the org-portal create page? My recommendation: yes — single create flow.
3. **RLS hardening migration** — apply now alongside the UI fix, or as a follow-up? My recommendation: apply now, since today a DELEGATED admin who guesses the URL `/org/settings?tab=legal-templates` could write to org templates.
