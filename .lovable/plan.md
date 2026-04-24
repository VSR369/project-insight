

# QUICK Mode Realignment — Config-Driven, Two-Role Workflow

## Verified ground truth
- Admin **already has** an editable Lifecycle Phase config page at `/admin/seeker-config/lifecycle-phases` (writes to `md_lifecycle_phase_config`). Phase rows for QUICK can be edited / deactivated **without code**.
- DB tables already exist: `legal_document_templates` (Platform-level), `org_legal_document_templates` (Org-level), and `useLegalDocTemplates` / `useOrgCpaTemplates` already read them.
- `challenges.solver_audience` already supports `ALL` / `INTERNAL` / `EXTERNAL`.
- `auto_assign_roles_on_creation` currently grants QUICK Creator: `CR + CU + ER + LC + FC` (correct gap to fix).
- Phase 5 (Abstract submit) and Phase 6 (Abstract review) are active for QUICK (gap to fix via admin or seed migration).
- No pre-publish audience confirmation modal exists for QUICK. No Creator-facing simple Accept/Decline review surface for QUICK.

## What we change vs leave alone

| Layer | Action |
|---|---|
| `md_lifecycle_phase_config` rows | **Data-only seed migration** (uses existing admin-editable table). Re-aligns QUICK rows. Admin can still further edit. |
| `auto_assign_roles_on_creation` RPC | Code change — QUICK grants only `CR`. |
| `complete_phase` RPC | No structural change; already config-driven. New AGG/MP branch already correct. Just relies on the new phase config. |
| Creator form + UI | Remove the hardcoded MP coercion + hardcoded AGG-only audience selector; add pre-publish confirm modal; add success-screen routing summary. |
| Legal preview source | Make MP read from Platform `legal_document_templates`; AGG keeps Org `org_legal_document_templates` (already correct). Driven by an existing per-mode flag — no string literals in components. |
| New page | `QuickReviewPage` — simple Accept/Decline list for the Creator. Routes only when `governance_mode='QUICK'`. STRUCTURED/CONTROLLED still use `ScreeningReviewPage`. |

Nothing about STRUCTURED or CONTROLLED workflow changes. Payment processing remains a stub (Phase 5 award → Phase 10 auto-complete) — real payout integration is out of scope per your priority list.

## Files

### NEW migration — `supabase/migrations/<ts>_quick_lifecycle_realign.sql`
Two operations, both data-driven:

1. **Re-seed QUICK rows in `md_lifecycle_phase_config`** (admin remains free to edit afterwards):
   - Phase 1 `Create` → `CR / seeker_manual / sla 3` (unchanged).
   - Phase 2 `Curation` → keep `auto_complete=true` (no curator in QUICK).
   - Phase 3 `Compliance` → keep `auto_complete=true`; clear `secondary_role` (no FC because no escrow).
   - Phase 4 `Publication` → keep `auto_complete=true`.
   - Phase 5 `Abstract submit` → `is_active=false` (skip entirely in QUICK).
   - Phase 6 `Abstract review` → `is_active=false`.
   - Phase 7 `Solution submit` → keep (`solver_action`, sla 21).
   - Phase 8 `Solution review` → `required_role=CR`, `phase_type=seeker_manual`, sla 7.
   - Phase 9 `Award decision` → `required_role=CR`, `phase_type=seeker_manual`, sla 3.
   - Phase 10 `Payment` → `required_role=CR`, `auto_complete=true` (system finalizes after Creator confirms award; payout integration later).

2. **Re-define `auto_assign_roles_on_creation`** so the QUICK branch grants `ARRAY['CR']` only (was `CR,CU,ER,LC,FC`). STRUCTURED / CONTROLLED branches untouched.

3. **Patch `complete_phase`** in one place: when computing `v_next_phase`, if the next phase row is `is_active=false`, skip to the next active phase. Required so the auto-cascade naturally jumps Phase 4 → Phase 7 without abstract-step rows. Existing recursive auto-complete logic continues to work.

### EDIT — `src/components/cogniblend/creator/CreatorLegalPreview.tsx`
- Remove the hardcoded "always read CPA from `useOrgCpaTemplates`" coupling.
- New rule, **driven by existing `md_governance_mode_config.legal_doc_mode` + the engagement model** (no new column, no magic strings in the component):
  - Engagement = MP → resolve CPA via `useLegalDocTemplates(governanceMode, 'MP')` (Platform Admin templates).
  - Engagement = AGG → resolve CPA via `useOrgCpaTemplates(organizationId)` (Seeking-Org Admin templates).
- Both paths still respect QUICK's KEEP_DEFAULT / REPLACE_DEFAULT toggle (challenge-specific override).
- All copy strings move to `src/constants/legalPreview.constants.ts` (already exists — extend it).

### EDIT — `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- Replace the AGG-only inline `RadioGroup` for `solver_audience` with the audience selector rendered for **AGG only** (correct per requirement: MP has no choice). Use a config-driven helper — no `engagementModel === 'AGG'` literals scattered through the file; centralize in `engagementModelRulesService.ts` (`audienceSelectable: boolean`).
- Keep the existing `solverAudience: engagementModel === 'AGG' ? data.solver_audience : 'ALL'` semantics, but route through the same service helper so MP can be unlocked later via config without code edits.
- Intercept QUICK Publish: open new `QuickPublishConfirmModal` with the routing summary; on Confirm → call existing `executeSubmit`. Non-QUICK path unchanged.

### NEW — `src/components/cogniblend/creator/QuickPublishConfirmModal.tsx` (~140 lines)
`AlertDialog` shown only for QUICK. Reads from form values (no DB call):
- **Engagement** chip: Marketplace / Aggregator
- **Sent to** (label resolved from new `SOLVER_AUDIENCE_LABELS`):
  - MP → "All Solution Providers on the platform."
  - AGG + ALL → "All Solution Providers (Internal + External)."
  - AGG + INTERNAL → "Solution Providers from your organization only."
  - AGG + EXTERNAL → "External Solution Providers only."
- **Visibility scope** (from `VISIBILITY_LABELS`).
- **Notification cadence**: Certified — immediate / Standard — 48h delay.
- Footer: Cancel / Publish Now.

### NEW — `src/constants/solverRouting.constants.ts`
Single source of truth (R10):
- `SOLVER_AUDIENCE_VALUES = ['ALL','INTERNAL','EXTERNAL'] as const`
- `SOLVER_AUDIENCE_LABELS: Record<'MP'|'AGG', Record<SolverAudience, string>>`
- `VISIBILITY_LABELS` moved out of `AccessModelSummary.tsx` so the modal, success screen, and existing summary share one map.
Re-exported via `src/constants/index.ts`.

### EDIT — `src/components/cogniblend/creator/QuickPublishSuccessScreen.tsx`
- Add `solverAudience` and `visibility` props.
- Replace generic copy with three rows: Sent to / Visibility / Cadence — sourced from the new constants — and a CTA "Open challenge workspace" → links to the new `QuickReviewPage` once submissions arrive.

### NEW — `src/pages/cogniblend/QuickReviewPage.tsx` (~220 lines)
Route `/cogni/q/:challengeId/review`. Single Creator-facing screen. No abstract step, no rubric scoring, no ER/CU chrome:
- **Submissions list** — pulls from `challenge_submissions` (RLS already grants Creator who holds CR).
- **Detail panel** — read solution text, files, provider profile link.
- **Decision** — Accept / Decline with required note. Accept fires existing legal acceptance (`useLegalGateAction WINNER_SELECTED`) and triggers `complete_phase` for Phase 9 → Phase 10 (auto-completes).
- MP shows "Contact provider directly"; AGG shows "Send via platform" — driven by `engagementModelRulesService.ts` (no literals in the page).

### NEW — `src/hooks/cogniblend/useQuickReview.ts` (~110 lines)
Wraps `useChallengeSubmissions`, `useAcceptSolution`, `useDeclineSolution`. All mutations call existing `complete_phase` RPC. No DB calls in the page (R2).

### EDIT — `src/routes/cogniRoutes.tsx`
Register `/cogni/q/:challengeId/review` (lazy + Suspense, R11). Add early-redirect inside `ScreeningReviewPage`: if `governance_mode === 'QUICK'`, navigate to the new page (prevents Creators from landing in the multi-role ER UI).

### EDIT — `src/components/cogniblend/dashboard/CreatorDashboardCards.tsx`
For QUICK challenges with at least one submission, primary CTA becomes "Review submissions" → new page. STRUCTURED/CONTROLLED dashboards untouched.

### EDIT — `src/services/engagementModelRulesService.ts`
Centralize three flags so components stop carrying literals:
- `audienceSelectable(engagement: 'MP'|'AGG'): boolean` (today returns `engagement === 'AGG'`; can be unlocked for MP via config later).
- `legalTemplateSource(engagement): 'PLATFORM' | 'ORG'`.
- `directContactEnabled(engagement): boolean`.

## Admin surfacing — no new admin page needed
Everything that should be admin-tunable is already exposed:
- **Phase rows** → `/admin/seeker-config/lifecycle-phases` (existing UI; the migration just seeds the right defaults — admin can edit further including `is_active`, `required_role`, `auto_complete`, `sla_days`).
- **Mode behaviour** → `/admin/seeker-config/governance-modes` (`md_governance_mode_config.legal_doc_mode` and `escrow_mode` already drive `complete_phase`).
- **Field visibility** → `/admin/seeker-config/governance-rules`.

## What does NOT change
- STRUCTURED + CONTROLLED phase graph, role grants, `ScreeningReviewPage`, LC/FC queues — all untouched.
- `assemble_cpa` RPC, legal interpolator/formatter — untouched.
- Notification dispatcher and certified/standard delay logic — untouched.
- `master_status` rollup — untouched.

## Routing matrix after fix
```text
Mode       | Phases (active)             | Roles auto-granted | Creator surface
-----------+-----------------------------+--------------------+------------------------------
QUICK      | 1,2,3,4,7,8,9,10            | CR only            | /cogni/q/:id/review
STRUCTURED | 1..10                       | CR                 | existing pages
CONTROLLED | 1..10 (+ LC AI review + FC) | CR                 | existing pages
```

## Verification checklist
- New QUICK challenge created → `user_challenge_roles` count = 1 (CR only).
- Publish in QUICK MP → confirm modal shows "All Solution Providers"; AGG INTERNAL → "Org only"; cancel keeps form editable.
- After publish, lifecycle jumps Phase 4 → Phase 7 (5 & 6 inactive). Solver submission lands directly in `challenge_submissions`.
- Creator opens `/cogni/q/:id/review` → sees submissions → Accept fires IPAA → Phase 9 closes → Phase 10 auto-completes → `master_status='COMPLETED'`.
- MP legal preview now lists Platform Admin templates; AGG legal preview lists Seeking-Org Admin templates. KEEP/REPLACE toggle still works.
- Admin opens `/admin/seeker-config/lifecycle-phases` → sees the realigned QUICK rows and can still edit them (still DB-driven, not hardcoded).
- STRUCTURED + CONTROLLED publish/review flows unchanged.
- `npx tsc --noEmit` passes; new files < 250 lines; no inline styles; no `any`; constants centralized.

