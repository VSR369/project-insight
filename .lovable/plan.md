
## Permanent fix plan — SPA only for pure Solution Providers

### Confirmation
Yes — the **Solver/Solution Provider Platform Agreement must appear only for pure Solution Providers**.  
It must **not** appear for Legal Coordinator, Finance Coordinator, Curator, Expert Reviewer, Creator, Platform Admin, Reviewer, Seeker, or Org users.

The screenshot confirms the current bug: an LC path is still being treated as provider-only and the SPA gate is firing.

### Why the current fix is not fully permanent
I re-checked the code and found 3 issues:

1. **`AuthGuard` still uses a negative rule**
   - Current logic: `isSolver && !isWorkforce && !isPlatformAdmin`
   - That is too broad. It can still show SPA for hybrid accounts that are not “pure providers”.

2. **`useUserPortalRoles` has only a partial workforce pool fix**
   - It checks pool codes `R8`, `R9`, `R10` only.
   - That is incomplete/inconsistent with your role architecture, which already maps workforce roles through `roleCodeMapping.constants.ts`.

3. **Login + root redirect still use separate role logic**
   - `Login.tsx` and `RoleBasedRedirect.tsx` still do their own parallel queries.
   - They do **not** use the same audience classification as `AuthGuard`.
   - So a pool-based LC/FC user can still be routed into provider flow first, which is how this bug can keep resurfacing.

### Safe permanent solution
#### Phase 1 — Create one shared audience classifier
Create a single shared hook/service for portal/legal gating decisions.

It should classify:
- `isPureSolutionProvider`
- `isWorkforce`
- `isPlatformAdmin`
- `isReviewer`
- `isSeeker`
- `isOrgUser`
- `hasCogniAccess`

Sources:
- `user_roles`
- `solution_providers`
- `org_users`
- `get_user_all_challenge_roles`
- `platform_provider_pool.role_codes`

Important:
- Normalize pool role codes using the existing role mapping conventions, not hardcoded partial values.
- Keep all DB access in hooks/services, not components.

#### Phase 2 — Tighten SPA gate in `AuthGuard`
Update SPA gating to a **positive** rule:

- SPA shows only when `isPureSolutionProvider === true`
- Workforce users continue to use **PWA** where applicable
- PMA flow stays unchanged

This avoids brittle “exclude these roles” logic and prevents future regressions when new non-provider roles are added.

#### Phase 3 — Make login/redirect use the same source of truth
Refactor:
- `src/pages/Login.tsx`
- `src/components/routing/RoleBasedRedirect.tsx`

So they consume the same audience classification as `AuthGuard`.

Result:
- LC/FC pool users land in CogniBlend workspace, not provider-first flow
- SPA no longer appears during login/role switching for workforce accounts
- Navigation behavior stays the same for real providers

### What I will not change
- No DB schema changes
- No RLS changes
- No RPC changes
- No AI Pass 1 / Pass 2 changes
- No autosave changes
- No curation lifecycle changes
- No role-switcher UX redesign
- No route-specific hacks like “hide SPA on `/cogni/lc-queue`” because that would be brittle, not permanent

### Files to touch
- `src/hooks/queries/useUserPortalRoles.ts` or a new shared auth audience hook/service
- `src/components/auth/AuthGuard.tsx`
- `src/pages/Login.tsx`
- `src/components/routing/RoleBasedRedirect.tsx`

### Expected result after fix
- Pure Solution Provider → SPA appears if not yet accepted
- LC / FC / CU / ER / CR → no SPA
- Platform Admin / Reviewer / Seeker / Org user → no SPA
- Hybrid accounts → SPA only if they are truly provider-only in audience classification
- Workforce PWA behavior remains intact on MP pages

### Regression checks
1. Login as LC → no SPA, lands in Cogni workspace
2. Login as FC → no SPA, lands in Cogni workspace
3. Switch to LC role from inside Cogni shell → no SPA
4. Pure Solution Provider with no SPA acceptance → SPA still appears
5. MP workforce pages still show PWA where required
6. Root redirect and cached portal behavior remain correct

This is the safest permanent fix because it removes duplicated role logic and makes **one shared classification** drive SPA gating, portal routing, and login behavior consistently.
