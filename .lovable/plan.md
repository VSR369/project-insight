
## Final Plan — SPA Visible Only for Solution Providers

### Confirmation
**Yes** — SPA must show only for pure Solution Providers, never for LC, FC, CR, CU, ER, Platform Admin, Seeker, or Org-only users.

### Current state
`AuthGuard` already gates correctly in intent: `requiresSpa = isSolver && !isWorkforce && !isPlatformAdmin`. The defect is in `useUserPortalRoles.isWorkforce`, which only checks **challenge-level** assignments. Workforce users sitting in `platform_provider_pool` without an active challenge get `isWorkforce=false` → SPA wrongly fires.

### Fix — single hook, ~15 LOC
**File:** `src/hooks/queries/useUserPortalRoles.ts`

1. Add a 5th parallel query:
   ```ts
   supabase.from('platform_provider_pool')
     .select('role_codes')
     .eq('user_id', userId)
     .eq('is_active', true)
   ```
2. After existing challenge-role workforce check, OR-in a pool check for org-level workforce codes (`R8` FC, `R9` LC, `R10` CU/ER):
   ```ts
   const POOL_WORKFORCE_CODES = new Set(['R8','R9','R10']);
   if (!isWorkforce && !poolRes.error) {
     for (const row of poolRes.data ?? []) {
       if ((row.role_codes ?? []).some((c: string) => POOL_WORKFORCE_CODES.has(c))) {
         isWorkforce = true; break;
       }
     }
   }
   ```
3. Bump query key to `['user-portal-roles', userId, 'v2']` to invalidate stale `false` for currently-logged-in users.

### Behaviour matrix after fix
| User type | isSolver | isWorkforce | isPlatformAdmin | SPA shows? |
|---|---|---|---|---|
| Pure Solution Provider | ✅ | ❌ | ❌ | **Yes** ✅ |
| LC (R9 in pool) | maybe | ✅ | ❌ | No |
| FC (R8 in pool) | maybe | ✅ | ❌ | No |
| CU / ER (R10 in pool) | maybe | ✅ | ❌ | No |
| Platform Admin | n/a | n/a | ✅ | No |
| Seeker / Org-only | ❌ | ❌ | ❌ | No |
| Solver also assigned as Curator | ✅ | ✅ | ❌ | No |

### Safety (zero ripple)
- No DB / RLS / RPC / migration changes — `platform_provider_pool` SELECT already permitted for self.
- AuthGuard logic untouched — only `isWorkforce` widens for legitimate workforce.
- AI Pass 1/2, autosave, curation lifecycle, Zustand store, Solver portal: untouched.
- PMA legal gate (general first-login) is independent — unchanged.

### Test gates
1. Login `nh-lc@testsetup.dev` → lands on `/cogni/lc-queue`, **no SPA modal**.
2. Login `nh-fc@testsetup.dev` → lands on `/cogni/fc-queue`, no SPA modal.
3. Login a real Solution Provider with no SPA acceptance → SPA modal still appears.
4. Login Platform Admin / Seeker / Org-only user → unchanged.
5. PMA still appears for first-time users.

### Files touched
| File | LOC |
|---|---|
| `src/hooks/queries/useUserPortalRoles.ts` | +15 / −1 |

Single file, fully reversible, no migration.
