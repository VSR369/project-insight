

# Plan — Hide SOLVER section for pure-workforce users + consolidate FC sidebar

## What the user is asking for

For LC and FC (and any pure-workforce role: CR, CU, ER, LC, FC), the sidebar should **never** show the SOLVER group ("Browse Challenges", "My Solutions", "My Portfolio"). Today the section flashes or stays visible for these users because the visibility check has gaps. Combine that fix with the FC sidebar consolidation so both regressions land together.

## Current behaviour (verified)

- `useCogniPermissions.canSeeSolverFeatures` = `availableRoles.length > 0 && !availableRoles.every(r => SEEKING_ORG_ROLES.has(r))`. `SEEKING_ORG_ROLES = {CR, CU, ER, LC, FC}`. So a pure FC user already evaluates to `false` once roles resolve.
- BUT: while `useCogniUserRoles` is loading, `availableRoles = []` → `canSeeSolverFeatures = false` (correct), then on first paint after resolution it stays false (correct). The actual leak is that **`Browse Challenges` and other SOLVER items in `CogniSidebarNav` use `isVisible: () => true`** instead of gating on `canSeeSolverFeatures`. The SOLVER **section heading** is gated, but the items underneath aren't, so any code path that renders items independently shows them.
- Separate issue: FC sidebar still has three rows (FC Queue / Escrow Management / Payment Processing) instead of one consolidated "Finance Workspace" entry mirroring LC.

## Three changes (one PR)

### 1. Gate every SOLVER item on `canSeeSolverFeatures`

`src/components/cogniblend/shell/CogniSidebarNav.tsx`

- For each item in the SOLVER group (`/cogni/browse`, `/cogni/my-solutions`, `/cogni/portfolio`), set `isVisible: (p) => p.canSeeSolverFeatures` instead of `() => true`.
- Keep the existing section-level guard (also `canSeeSolverFeatures`) — defence in depth.
- Add a loading guard: when `isRolesLoading || availableRoles.length === 0`, treat `canSeeSolverFeatures` as `false` for rendering purposes (prevents first-paint flash). Pull `isRolesLoading` from `useCogniRoleContext()` and AND it into a local `solverVisible` boolean used by both the section and items.

Result: pure CR / CU / ER / LC / FC users never see Browse Challenges, My Solutions, or My Portfolio — not on first paint, not after.

### 2. Consolidate FC sidebar to a single "Finance Workspace" row

`src/components/cogniblend/shell/CogniSidebarNav.tsx`

- Remove from the current FC group: `Escrow Management` (`/cogni/escrow`) and `Payment Processing` (`/cogni/payments`).
- Rename `FC Queue` → **`Finance Workspace`**, icon `Banknote`, route `/cogni/fc-queue`.
- Move it into the CHALLENGES group, directly under `Legal Workspace`, so the two workforce workspaces sit together.
- Visibility unchanged: `isVisible: (p) => p.canSeeEscrow` (already governance-aware via `requiresHumanActor`).

`src/types/cogniRoles.ts`

- `ROLE_PRIMARY_ACTION.FC` → `{ label: 'Open Finance Workspace', route: '/cogni/fc-queue' }`.
- `ROLE_NAV_RELEVANCE.FC` → `['/cogni/fc-queue', '/cogni/challenges', '/cogni/dashboard']`.

`/cogni/escrow` and `/cogni/payments` routes remain registered as fallbacks (no sidebar entry) — same pattern LC uses.

### 3. Make the Phase-2 FC user reachable into the workspace (preview mode)

The Phase-3 write gate is correct; today's dead-end at Phase 2 is what makes the FC think nothing works.

`src/pages/cogniblend/FcChallengeQueuePage.tsx` — split into two sections:
- **"Awaiting your action" (Phase ≥ 3, not complete)** — actionable rows with the existing `Open Finance Workspace` button.
- **"Upcoming (in curation)" (Phase < 3)** — read-only rows with a `Available at Phase 3` chip and a `View challenge context` link → `/cogni/challenges/:id/finance` (workspace renders in preview mode, see below).

`src/pages/cogniblend/FcFinanceWorkspacePage.tsx` — when `current_phase < 3`, replace the dead-end "Not ready" guard with a read-only preview:
- Header + tabs render normally.
- Info banner at the top: "Finance review unlocks at Phase 3. Currently at Phase {n}. You can review the curated challenge below."
- `Curated Challenge` tab: fully populated.
- `Finance Review` tab: `FcLegalDocsViewer` + `RecommendedEscrowCard` only. **No `EscrowDepositForm`. No submit footer.** No DB writes possible.
- Step indicator pinned at step 1.

Production gate is preserved (the form simply isn't there before Phase 3), but the FC has a real workspace to inspect.

## Files

| File | Action | Approx. lines |
|---|---|---|
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | MODIFY — per-item `canSeeSolverFeatures` guard, loading guard, FC group consolidation, move "Finance Workspace" under CHALLENGES | ~35 |
| `src/types/cogniRoles.ts` | MODIFY — `ROLE_PRIMARY_ACTION.FC` + `ROLE_NAV_RELEVANCE.FC` | ~4 |
| `src/pages/cogniblend/FcChallengeQueuePage.tsx` | MODIFY — split into "Awaiting" + "Upcoming" sections | ~35 |
| `src/pages/cogniblend/FcFinanceWorkspacePage.tsx` | MODIFY — replace Phase < 3 dead-end with read-only preview | ~30 |

All four files stay ≤ 250 lines. Zero new files. Zero DB / RPC / RLS changes. `complete_financial_review`, `EscrowDepositForm`, `escrow_records` schema, LC workspace, AI passes, QUICK mode, Curator flows — all untouched.

## Result by user type

| User | Sidebar | SOLVER items |
|---|---|---|
| Pure FC (`nh-pp-fc@…`) | CHALLENGES → Legal Workspace, **Finance Workspace** | Hidden |
| Pure LC | CHALLENGES → **Legal Workspace** | Hidden |
| Pure CR / CU / ER | CHALLENGES → role's own entry | Hidden |
| Solver only | SOLVER group with Browse / My Solutions / Portfolio | Visible |
| Solver + FC (rare hybrid) | Both groups visible | Visible |
| Loading state | SOLVER group hidden until roles resolve | Hidden during load |

## Verification

1. Log in as pure-FC `nh-pp-fc@testsetup.dev`. Sidebar shows **Finance Workspace** under CHALLENGES; no Browse Challenges, no My Solutions, no My Portfolio at any point during load or after.
2. Log in as a pure-LC user. Same — no SOLVER items, ever.
3. Log in as a pure-Solver. SOLVER group renders with all three items.
4. As FC, click **Finance Workspace** → `/cogni/fc-queue` → "Upcoming" lists the Phase-2 test challenge with a "View challenge context" link.
5. Click that link → `/cogni/challenges/:id/finance` → header, tabs, step indicator render. Banner shows "Unlocks at Phase 3". Curated Challenge tab populated. Finance Review tab shows legal docs + recommended escrow context only. No deposit form. No submit footer.
6. Curator advances challenge to Phase 3 → reload as FC → banner gone, deposit form + submit footer appear, full happy path works.
7. CR / Curator sidebars unchanged.
8. `npx tsc --noEmit` passes; every modified file ≤ 250 lines; no `console.*`, no `any`.

## Out of scope

- Renaming `/cogni/fc-queue` route (kept to mirror `/cogni/lc-queue`).
- Changes to LC workspace, AI passes, QUICK mode, Curator flows.
- Any change to the Phase-3 write gate (preserved).
- A Phase-2 banner inside the LC workspace.

