# Phase 7 — Final Cleanup & SKPA Placement

Closes the remaining gaps from the v3 legal plan and removes dead code.

## Audit summary

| Plan item | Status |
|---|---|
| Phase 1 — `assemble_role_doc` v_geo fix | Done |
| Phase 2a — Remove per-page PWA gates from CU/LC/FC pages | Done |
| Phase 2b — `WorkforcePwaGate` route wrappers in App.tsx | **Open** |
| Phase 2c — Mount SKPA at org registration | **Open** |
| Phase 3 — Role-grant auto-enqueue (DB trigger) | Done — covers all paths (edge functions + admin UIs all insert into `role_assignments`, trigger fires) |
| Phase 4a — Relabel PWA → "Role Agreement (Prize & Work)" | Done |
| Phase 4b — Deactivate ghost trigger_config rows (PMA/CA/PSA/IPAA/EPIA) | Already inactive in DB — no work needed |
| Phase 5 — Template body content edits | Out of code scope (Platform Admin data work) |
| Stale file deletions | **Open** |

## What this phase does

### 1. Remove `WorkforcePwaGate` from routing
PWA acceptance is now handled centrally by `RoleLegalGate` inside `AuthGuard` at first login. The per-route defensive guard is redundant and adds a query per navigation.

- `src/App.tsx` — drop the `WorkforcePwaGate` import; unwrap 6 routes (`/cogni/curation`, `/cogni/curation/:id`, `/cogni/curation/:id/preview`, `/cogni/curation/:id/diagnostics`, `/cogni/lc-queue`, `/cogni/fc-queue`) and any related ER routes.

### 2. Mount SKPA at org registration
SKPA must be signed during organisation onboarding, not deferred until the admin's next login.

- Add an SKPA acceptance step to `src/pages/registration/CompliancePage.tsx` (the natural legal-acceptance step in the flow). Block "Next" until accepted.
- Use the existing `useAcceptRoleLegal` hook + `RoleLegalGate`-style document loader (server-assembled SKPA via `assemble_role_doc`).
- The DB trigger already enqueues a pending SKPA row when `R2` is granted; this UI resolves it inline during registration instead of post-login.
- Keep `RoleLegalGate` as the safety net for legacy R2 admins who registered before this change.

### 3. Delete dead files

- `src/components/auth/WorkforcePwaGate.tsx`
- `src/hooks/legal/usePendingPwaForRole.ts`

(Earlier cleanup already removed `PwaAcceptanceGate.tsx`, `SkpaAcceptanceDialog.tsx`, `usePwaGateContext.ts`.)

### 4. Phase 6 — Regression smoke (manual)
After deploy, walk through the 5 scenarios in the v3 plan:
1. New Seeker Org → SKPA appears once at registration step, never again.
2. Grant CR → next login shows RA_CR once; subsequent challenge submits silent.
3. Grant CU → next login shows RA_CU once; opening 3 curation workspaces silent.
4. SP joins QUICK challenge ×2 → CPA_QUICK appears each time (correct, per-challenge).
5. SP joins CONTROLLED+AGG → CPA_CONTROLLED with escrow + anti-disintermediation clauses.

## Out of scope

- **Phase 5 template content edits** — Platform Admin updates PWA / CPA_QUICK / CPA_STRUCTURED / CPA_CONTROLLED bodies in the admin UI after deploy. No code change.
- `roleAssignmentLegalService.ts` — not needed; the database trigger `trg_role_assignment_create_pending_legal` handles every grant path (edge-function invitations and any direct admin inserts).

## Files affected

**Edits (2)**
- `src/App.tsx` — remove `WorkforcePwaGate` wrappers + import
- `src/pages/registration/CompliancePage.tsx` — add SKPA acceptance gate

**New (1)**
- `src/components/registration/SkpaRegistrationGate.tsx` — small reusable component that renders the assembled SKPA, captures consent, and calls `useAcceptRoleLegal`

**Deletes (2)**
- `src/components/auth/WorkforcePwaGate.tsx`
- `src/hooks/legal/usePendingPwaForRole.ts`

No migrations. No edge function changes. No data migration.

## Effort
One short cycle. Pure code cleanup + one new ~150-line registration gate component.
