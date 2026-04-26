# Final Legal Module Fix Plan (v3 — incorporating your two clarifications)

## Your two clarifications, locked in

1. **PWA is signed once at role enrollment, not per-challenge.** Today the system re-prompts CU/ER/LC/FC every time they enter a workspace. That's wrong scope — fixed in Phase 2.
2. **Seeker Org Admin ≠ Creator.** SKPA is signed once when an org *registers* (by the Seeker Org Admin). Creator (CR) is a separate user role granted by Platform Admin or Seeker Org Admin — it needs its own role-enrollment signature, just like CU/ER/LC/FC.

These two corrections change the gate **placement** (not the architecture).

---

## Corrected model

```
TIER 1  PLATFORM / ORG-REGISTRATION  (one-time, lifetime)
  SPA   Solution Provider           — at SP signup
  SKPA  Seeker Org Admin            — at ORG REGISTRATION (NOT at first challenge)

TIER 2  ROLE ENROLLMENT             (one-time per role grant, per user)
  RA_CR  Creator role agreement     — when CR role is granted
  RA_CU  Curator role agreement     — when CU role is granted
  RA_ER  Expert Reviewer agreement  — when ER role is granted
  RA_LC  Legal Coordinator agreement — when LC role is granted
  RA_FC  Finance Coordinator agreement — when FC role is granted
  (all 5 use the existing PWA template family — per-role body via {{role_code}})

TIER 3  PER-CHALLENGE                (only Tier with per-challenge signature)
  CPA_QUICK / STRUCTURED / CONTROLLED — signed by Solution Provider per challenge
  Variables filled by assemble_cpa(); seeking-org override allowed for AGG.
```

Examples of total signatures a user ever sees:
- Pure SP joining 5 challenges: 1 SPA + 5 CPAs.
- Curator working on 20 challenges: 1 RA_CU. Period.
- Seeker Org Admin who's also Creator: 1 SKPA at org reg + 1 RA_CR at role grant.

This matches Kaggle, HeroX, InnoCentive exactly.

---

## Authoring authority

| Document | Authored by |
|---|---|
| SPA, SKPA | Platform Admin only |
| RA_CR, RA_CU, RA_ER, RA_LC, RA_FC | Platform Admin only |
| CPA × 3 governance modes | Platform Admin (default); Seeking Org Admin may override for AGG challenges |

---

## Per-mode CPA content (your QUICK / STRUCTURED / CONTROLLED questions)

`assemble_cpa()` already interpolates 16+ variables and varies clauses by governance + engagement mode. We only need to enrich template *content* (Phase 5):

| Mode | Roles in play | What CPA must say |
|---|---|---|
| QUICK | Creator does all | IP, direct-from-Creator payment, evaluation, "no LC/FC/ER panel" — short |
| STRUCTURED | Curator wears LC + FC hats | IP, payment, "Curator exercises consolidated LC/FC authority for this challenge", optional escrow |
| CONTROLLED | Dedicated LC, FC, ER panel | Full IP, escrow & staged payments, named LC/FC/ER, dispute resolution |
| AGG (any mode) | + anti-disintermediation clause | Auto-toggled when `{{engagement_model}} == AGG` |

---

## The Plan — 6 phases

### Phase 1 — UNBLOCK (1 migration)
Fix `assemble_role_doc` `v_geo RECORD` bug → use scalar TEXT vars with defaults. Unblocks the loading loop you're hitting now.

### Phase 2 — RE-SCOPE THE GATES (code only)
- **Remove per-challenge PWA prompts** from CU/LC/FC workspaces (CurationReviewPage, LcLegalWorkspacePage, FcFinanceWorkspacePage) and any ER review surface. PWA is no longer per-challenge.
- **Move SKPA gate** out of `ChallengeCreatorForm` and into the Org Registration flow (last step of org onboarding). Org cannot complete registration without it.
- **Cache invalidations** in `useLegalGateAction` and `useAcceptRoleLegal` for `['legal-gate']`, `['pending-role-legal-acceptance']`, `['assemble-role-doc']`.

### Phase 3 — ROLE-GRANT ACCEPTANCE FLOW (the missing piece)
- New service `enqueueRoleLegalAcceptance(userId, roleCode, orgId)` inserts a row into existing `pending_role_legal_acceptance` table when any of CR/CU/ER/LC/FC is granted.
- Wire this into Platform Admin's and Seeker Org Admin's role-assignment UIs.
- On user's next login, `RoleLegalGate` (already built) shows the role doc for signature. Pending row resolved on accept.
- Add CR to `roleToDocumentMap.ts` (today the map covers CU/ER/LC/FC only).

### Phase 4 — DOCUMENT FAMILY (no schema change)
- Keep `PWA` template code; use existing `applies_to_roles` column to publish either one shared body (covering all 5 roles) or per-role variants — admin's choice.
- Relabel in `DOCUMENT_CODE_LABELS`: "PWA" → "Role Agreement". Per-role suffix shown to user ("Role Agreement — Curator").
- Deactivate ghost trigger_config rows for archived docs (PMA/CA/PSA/IPAA/EPIA) so admin UI stops listing them.

### Phase 5 — TEMPLATE CONTENT (Platform Admin data edits, post-deploy)
- **Role Agreement (PWA) body**: shared base + role-specific paragraph per `{{role_code}}` (CR/CU/ER/LC/FC).
- **CPA_QUICK**: direct-payment-from-Creator clause; "no LC/FC/ER panel" statement.
- **CPA_STRUCTURED**: "Curator exercises consolidated LC/FC authority" clause.
- **CPA_CONTROLLED**: verify named `{{lc_name}}` and `{{fc_name}}`; full escrow schedule.

### Phase 6 — REGRESSION SMOKE
1. Register new Seeker Org → SKPA appears once at registration; never again.
2. Grant CR role to a user → on next login, RA_CR appears once; user submits 3 challenges, no further prompt.
3. Grant CU role → on next login, RA_CU appears once; CU opens 3 curation workspaces, no further prompt.
4. SP joins QUICK challenge → CPA_QUICK with filled variables. SP joins 2nd QUICK challenge → CPA_QUICK appears again (correct — per-challenge).
5. SP joins CONTROLLED+AGG → CPA_CONTROLLED with escrow + anti-disintermediation clauses.

---

## Out of scope (explicit)

- Mega-document collapse — rejected.
- Schema rename PWA → RA — cosmetic; deferred.
- Re-acceptance on version bump — separate feature.
- "My Agreements" self-serve page — separate feature.
- Server-side guards inside `complete_phase` — UI + RLS sufficient.

---

## Files affected

**1 migration** — assemble_role_doc v_geo fix + deactivate ghost trigger_config rows.

**Code edits (~7 files)**
- `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — unmount SKPA
- Org registration page (final step) — mount SKPA
- `CurationReviewPage.tsx`, `LcLegalWorkspacePage.tsx`, `FcFinanceWorkspacePage.tsx`, ER review surface — remove PwaAcceptanceGate
- `src/services/legal/roleToDocumentMap.ts` — add CR mapping
- `src/services/legal/roleAssignmentLegalService.ts` (new) — enqueue helper
- Role-assignment UIs (Platform Admin + Seeker Org Admin) — call enqueue on grant
- `src/hooks/legal/useLegalGateAction.ts`, `useAcceptRoleLegal.ts` — invalidations
- `src/types/legal.types.ts` `DOCUMENT_CODE_LABELS` — relabel PWA as "Role Agreement"

**Code deletions**
- `src/components/auth/WorkforcePwaGate.tsx`
- `src/components/cogniblend/workforce/PwaAcceptanceGate.tsx` (after callers removed)
- `src/hooks/legal/usePendingPwaForRole.ts`
- `src/hooks/queries/usePwaGateContext.ts`

**Template content** — 4 documents updated in admin UI after deploy.

---

## Effort
One short build cycle. No new tables, no data migration, no breaking API changes.
