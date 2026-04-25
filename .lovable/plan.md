# Final Plan — Role-Aware Legal Acceptance & Dynamic Interpolation

## Corrected ownership matrix (your authoritative version)

| Role | Marketplace (MP) — invited by | Aggregator (AGG) — invited by |
|---|---|---|
| Creator (CR) | Seeker Admin | Seeker Admin |
| Curator (CU) | **Platform Admin** | **Seeker Admin** |
| Expert Reviewer (ER) | **Platform Admin** | **Seeker Admin** *(or self-register into the seeker org's reviewer pool)* |
| Legal Coordinator (LC) | **Seeker Admin** | **Seeker Admin** |
| Finance Coordinator (FC) | **Seeker Admin** | **Seeker Admin** |
| Solution Provider (SP) | External self-register / VIP / Standard invite | External self-register / VIP / Standard invite **and** seeker-org internal SPs |

This replaces every prior version. LC and FC are **always** seeker-org roles, never platform workforce. CU/ER ownership flips by engagement model.

## Universal rule (one line)

**Every user signs ONE role agreement at first login. Solution Providers additionally sign a CPA per challenge they enroll in.**

## First-login signing matrix

| Role | First-login document | Template source |
|---|---|---|
| Solution Provider (any path) | **SPA** | AGG → org override if set, else platform default. MP → platform default |
| Seeker Admin | **SKPA** | AGG → org override if set, else platform default. MP → platform default |
| Creator | **SKPA** with `{{user_role}}='Challenge Creator'` | Same source rules as SKPA |
| Curator (MP) | **PWA** | Platform default (platform-staffed) |
| Curator (AGG) | **PWA** | Org override if set, else platform default |
| Expert Reviewer (MP) | **PWA** | Platform default |
| Expert Reviewer (AGG) | **PWA** | Org override if set, else platform default |
| Legal Coordinator | **PWA** with `{{user_role}}='Legal Coordinator'` | Org override if set, else platform default (always under a seeker org) |
| Finance Coordinator | **PWA** with `{{user_role}}='Finance Coordinator'` | Same as LC |
| Solution Provider — per challenge | **CPA** | AGG: org template. MP: platform template |

Two layers, never more: role agreement at first login, CPA per challenge for solvers only.

## Why the prior plans had errors (root causes, fixed here)

1. **LC/FC mis-classified as platform workforce.** Root cause: today's `OrgLegalTemplatesTab` only exposes CPA, so the codebase had no place for org-owned PWA. Treating LC/FC as platform-managed was wrong. **Fix:** PWA is org-resolvable for **all** workforce roles (CU/ER/LC/FC). LC/FC always resolve through the seeker org because they have no marketplace path.
2. **CU/ER ownership confused with availability.** Root cause: the SLM mapping (`R5_MP` vs `R5_AGG`) shows pool partitioning, not who invites. **Fix:** invite ownership is driven purely by engagement model (MP → Platform Admin; AGG → Seeker Admin). The `R*_MP` / `R*_AGG` codes feed the pool and PWA template selector but do not change first-login plumbing.
3. **Seeker Admin and Creator merged.** Root cause: SKPA today serves both. **Fix:** keep SKPA shared but interpolate `{{user_role}}` so the rendered document differs (Seeker Admin vs Challenge Creator). No new doc code.
4. **Lazy gates fired in random places** (PWA in 4 different pages, SKPA only on submit, SPA only inside enrollment). **Fix:** one gate inside `AuthGuard` runs at first login for everyone.
5. **AGG override only worked for CPA.** **Fix:** `org_legal_document_templates` already supports any `document_code`; expose SPA / SKPA / PWA / CPA in `OrgLegalTemplatesTab` with AGG-only enable for CU/ER (LC/FC always enabled because they're seeker-org roles regardless of model).
6. **Assembled docs showed `[Not set]` chips** because the server didn't resolve org / industry / geography variables. **Fix:** server-side interpolation pulls from `seeker_organizations`, `industry_knowledge_packs`, `geography_context`.

## The 4 changes that ship

### 1. One first-login gate for every role
- New `RoleLegalGate` mounted inside `AuthGuard`, after the existing PMA gate.
- Logic: read `user_roles` + `role_assignments` + `solution_providers` → for each held role, look up required `document_code` (table below) → check `legal_acceptance_log` → if missing, show signature dialog and block dashboard.
- Role → document map (single source of truth in `roleToDocumentMap.ts`):
  - SP → SPA
  - R2 (Seeker Admin) → SKPA
  - R3, R10_CR (Creator) → SKPA `{{user_role}}='Challenge Creator'`
  - R5_MP / R5_AGG (Curator) → PWA `{{user_role}}='Curator'`
  - R7_MP / R7_AGG (Expert Reviewer) → PWA `{{user_role}}='Expert Reviewer'`
  - R9 (Legal Coordinator) → PWA `{{user_role}}='Legal Coordinator'`
  - R8 (Finance Coordinator) → PWA `{{user_role}}='Finance Coordinator'`
- Existing lazy gates remain as silent fallback so already-logged-in users aren't broken mid-session.

### 2. Invitations track pending signatures
New table `pending_role_legal_acceptance` (user_id, role_code, org_id, doc_code, created_at, resolved_at).
Patch every acceptor to insert one row in the same transaction that activates the role:
- `accept-role-invitation` (CR, CU-AGG, ER-AGG, **LC, FC**)
- `accept-reviewer-invitation` (ER MP and AGG self-register into pool)
- `accept-vip-invitation`, `accept-provider-invitation` (SPs)
- `Register.tsx` self-signup paths (SP, Seeker Admin, ER self-register)

`RoleLegalGate` reads this table; an unresolved row forces the signature flow before any navigation.

### 3. AGG-aware org overrides for SPA / SKPA / PWA / CPA
- Extend `OrgLegalTemplatesTab` to four sections: SPA, SKPA, PWA, CPA.
- New SQL helper `resolve_active_legal_template(p_org_id, p_doc_code, p_role_code)`:
  - For **SPA / SKPA / CPA** and for **PWA when role is CU or ER**: org override applies only when `engagement_model = 'AGG'`; otherwise platform default.
  - For **PWA when role is LC or FC**: org override always applies (LC/FC are seeker-org roles in both MP and AGG); otherwise platform default.
  - Final fallback: platform default from `legal_document_templates`.
- UI affordances:
  - MP-only orgs: SPA / SKPA / CPA editors and the CU/ER PWA editor show an "AGG-only" badge and are disabled.
  - LC PWA and FC PWA editors are always enabled regardless of engagement model.

### 4. Server-side dynamic interpolation for every applicable variable
- Patch `assemble_cpa` and add sibling `assemble_role_doc(user_id, role_code, org_id)` for SPA / SKPA / PWA assembly at first login.
- Variables resolved server-side (no schema changes to source tables):
  - `seeker_organizations` → `seeker_org_name`, `seeker_legal_entity`, `seeker_org_address`, `seeker_website`, `seeker_country`, `seeker_industry`, `seeker_registration_number`
  - `industry_knowledge_packs` → `industry_name`, `industry_certifications`, `industry_frameworks`, `regulatory_frameworks`
  - `geography_context` → `jurisdiction`, `governing_law`, `data_privacy_laws`, `dispute_resolution_venue`
  - `auth.users` / `profiles` → `user_full_name`, `user_email`
  - Computed → `user_role`, `acceptance_date`, `engagement_model`, `escrow_required`, `payment_mode`, `installment_count`, `platform_fee_pct`
- Substitution also runs on creator-uploaded `SOURCE_DOC` content (today leaves `{{vars}}` raw).
- `src/constants/legalVariableContract.ts` becomes the single registry consumed by both `cpaPreviewInterpolator.ts` (client preview) and the server assemblers (SQL functions read the same key names) — no more `[Not set]` drift.

## What does NOT change
- All existing tables and their RLS
- `freeze_for_legal_review`, `complete_legal_review`, escrow flow
- AI Pass 1/2/3, curator/LC/FC workspace flows
- `CpaEnrollmentGate` (per-challenge solver gate) — only its data source improves
- `LegalGateModal` (PMA at platform level) — continues for everyone
- `cpaPreviewInterpolator.ts` already extended in the last loop — kept

## Files

**Created**
- `src/components/auth/RoleLegalGate.tsx`
- `src/hooks/queries/usePendingRoleLegalAcceptance.ts`
- `src/services/legal/roleDocResolver.ts` (calls `resolve_active_legal_template`)
- `src/services/legal/roleToDocumentMap.ts` (role-code → doc-code)
- `src/components/org-settings/OrgRoleTemplateSection.tsx` (one component, reused for SPA/SKPA/PWA/CPA sections)
- `src/constants/legalVariableContract.ts`

**Edited**
- `supabase/functions/accept-role-invitation/index.ts` (covers CR/CU-AGG/ER-AGG/**LC**/**FC**)
- `supabase/functions/accept-reviewer-invitation/index.ts`
- `supabase/functions/accept-vip-invitation/index.ts`
- `supabase/functions/accept-provider-invitation/index.ts`
- `src/components/auth/AuthGuard.tsx` (mount `RoleLegalGate` after PMA)
- `src/components/org-settings/OrgLegalTemplatesTab.tsx` (4 sections; AGG-aware enable rules)
- `src/pages/Register.tsx` (insert pending row on self-signup)

**Migrations** (additive only, nothing breaking)
1. `CREATE TABLE pending_role_legal_acceptance` + RLS (`tenant_id = get_current_tenant_id()`, user can read own rows)
2. `CREATE FUNCTION resolve_active_legal_template(org_id, doc_code, role_code)` — applies the AGG/LC/FC rules above
3. `CREATE FUNCTION assemble_role_doc(user_id, role_code, org_id)` — interpolated SPA/SKPA/PWA
4. `CREATE OR REPLACE FUNCTION assemble_cpa` — emit all 30+ variables, also substitute `SOURCE_DOC`
5. Backfill: insert `pending_role_legal_acceptance` rows for all currently `status='invited'` assignments so they sign at next login. Active users with no log row hit the lazy fallback — nothing breaks.

## Verification matrix

Fresh user, log in once → exactly one signature dialog → land on dashboard:

- [ ] Self-registered SP → SPA (platform default for MP context, org-overridden for AGG enrollment)
- [ ] VIP-invited SP → SPA
- [ ] Standard-invited SP → SPA
- [ ] SP enrolling in AGG challenge → CPA from org template (after SPA)
- [ ] SP enrolling in MP challenge → CPA from platform template (after SPA)
- [ ] Self-registered Seeker Admin → SKPA
- [ ] Seeker-Admin-invited Creator → SKPA with `{{user_role}}='Challenge Creator'`
- [ ] **Platform-Admin-invited Curator (MP)** → platform PWA
- [ ] **Seeker-Admin-invited Curator (AGG)** → org PWA if set, else platform PWA
- [ ] **Platform-Admin-invited ER (MP)** → platform PWA
- [ ] **Seeker-Admin-invited ER (AGG)** or self-registered ER in seeker org → org PWA if set, else platform PWA
- [ ] **Seeker-Admin-invited LC** (MP or AGG) → org PWA if set, else platform PWA, with `{{user_role}}='Legal Coordinator'`
- [ ] **Seeker-Admin-invited FC** (MP or AGG) → org PWA if set, else platform PWA, with `{{user_role}}='Finance Coordinator'`
- [ ] Logout/login as same user → no dialog
- [ ] Seeker Admin (AGG) edits org SPA → next solver enrolling under that org sees the org version
- [ ] Seeker Admin (MP) opens Legal Templates → SPA/SKPA/CPA and CU/ER PWA editors disabled with "AGG-only" badge; LC PWA and FC PWA editors enabled
- [ ] All assembled docs show real values for `seeker_org_address`, `industry_*`, `data_privacy_laws` — zero `[Not set]` chips
