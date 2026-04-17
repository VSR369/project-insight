

## Root Cause Analysis

Looking at `AuthGuard.tsx`, the SPA gate fires for **every authenticated user** with no role check:

```ts
if (hasSpa === false && !spaAccepted) { return <SpaAcceptanceGate ... /> }
```

`useSpaStatus` returns `false` for anyone who has never accepted SPA → so Curators (CU), Legal (LC), Finance (FC), Evaluation Reviewer (ER), Challenge Creator (CR), Platform Admins, and Org users **all hit the Solver agreement** — which is wrong, and then the Accept button crashes with `400 invalid uuid: ""` (challenge_id empty), trapping them.

**Why it "worked before":** SPA gate was likely added recently and was never role-gated. Prior demo flows worked because either (a) the gate was absent, or (b) the affected demo users had an SPA acceptance row pre-seeded. Either way, the current gate has no role discrimination — that's the regression.

**Per project memory** (`mem://cogniblend/legal/v2-workforce-pwa-policy`):
- **SPA** = Solution Provider Platform Agreement → only Solvers/Solution Providers
- **PWA** = Platform Workforce Agreement → workforce roles (CR, CU, ER, LC, FC, platform_admin)
- PWA is handled per-challenge inside workforce flows (existing `PwaAcceptanceGate`), NOT as a global gate

So the fix is: **scope the SPA global gate to Solvers only**, and fix the broken insert so real Solvers can actually pass it.

---

## Fix Plan

### 1. New hook: `src/hooks/queries/useUserPortalRoles.ts` (~70 lines)
Single source of truth for "what kind of user is this". Parallel queries (mirrors `RoleBasedRedirect` logic):
- `user_roles` → platform_admin / panel_reviewer / seeker
- `solution_providers` → has solver record
- `org_users` → tenant member
- `get_user_all_challenge_roles` RPC → cogni workforce roles (CR/CU/ER/LC/FC)

Returns: `{ isPlatformAdmin, isSolver, isWorkforce, isOrgUser, isReviewer, isLoading }`.
Cache 5 min, no refetch on focus (same as `useUserRoles`).

### 2. `src/components/auth/AuthGuard.tsx` — Gate the SPA gate

```ts
const { isSolver, isWorkforce, isPlatformAdmin, isOrgUser, isLoading: rolesLoading } = useUserPortalRoles(user?.id);

// SPA only applies to pure Solvers (not workforce, not admin, not org-only)
const requiresSpa = isSolver && !isWorkforce && !isPlatformAdmin;

if (loading || rolesLoading || (requiresSpa && spaLoading && hasSpa === undefined)) {
  return <Spinner/>;
}

if (requiresSpa && hasSpa === false && !spaAccepted) {
  return <SpaAcceptanceGate ... />;
}
```

Outcome:
- **CR / CU / ER / LC / FC** → no SPA gate → demo & real logins land on their workspace ✅
- **Platform Admin** → no SPA gate ✅
- **Org users** → no SPA gate ✅
- **Solver (Solution Provider)** → SPA gate appears once, can be accepted ✅
- **Hybrid (Solver + workforce role)** → workforce wins, no SPA gate (PWA handled per-challenge)

### 3. `src/components/cogniblend/solver/SpaAcceptanceGate.tsx` — Fix the 400

Replace the ledger-based mutation (which requires `challenge_id UUID NOT NULL`) with a direct insert into `legal_acceptance_log` (the table `useSpaStatus` reads from, with nullable `challenge_id`):

```ts
const { error } = await supabase.from('legal_acceptance_log').insert({
  user_id: userId,
  template_id: spaTemplate.template_id,
  document_code: 'SPA',
  document_version: spaTemplate.version,
  action: 'ACCEPT',
  trigger_event: 'USER_REGISTRATION',
  accepted_at: new Date().toISOString(),
  ip_address: ipAddress || null,
  user_agent: navigator.userAgent,
});
queryClient.invalidateQueries({ queryKey: ['spa-acceptance-status', userId] });
```

This makes acceptance persistent (gate won't re-appear next session) and eliminates the UUID crash.

---

## Verification Matrix

| Role / Demo Card | Expected | What we test |
|---|---|---|
| Casey Underwood (CU - Curator) | Lands on `/cogni/curation`, no SPA | demo login |
| Larry Counsel (LC - Legal) | Lands on `/cogni/lc-queue`, no SPA | demo login |
| Felicia Controller (FC - Finance) | Lands on `/cogni/escrow`, no SPA | demo login |
| Erin Reviewer (ER) | Lands on `/cogni/review`, no SPA | demo login |
| Chris Creator (CR) | Lands on `/cogni/dashboard`, no SPA | demo login |
| Platform Admin | Lands on `/admin`, no SPA | real login |
| Real Solver (no demo) | SPA gate → Accept → dashboard → reload → no re-prompt | full real flow |
| Org user | Lands on `/org/dashboard`, no SPA | real login |

---

## Files Touched

- **NEW** `src/hooks/queries/useUserPortalRoles.ts` (~70 lines)
- **EDIT** `src/components/auth/AuthGuard.tsx` (add role gate around SPA check)
- **EDIT** `src/components/cogniblend/solver/SpaAcceptanceGate.tsx` (fix insert to use `legal_acceptance_log`)

No DB migrations. No edge function changes.

