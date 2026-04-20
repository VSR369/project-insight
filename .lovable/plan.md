

## 5 Whys Root Cause — Two Defects, One Login Session

### Symptom recap
1. Logging in as **`nh-lc@testsetup.dev`** the user lands on a screen that *looks like* a Curator workspace.
2. The challenge `25ca71a0…` (frozen by Curator `nh-cu@testsetup.dev`) is **not visible** in LC's "Legal Workspace" inbox.

---

### Why #1 — "It looks like Curator login"
| # | Why? | Answer |
|---|---|---|
| 1 | LC sees a Curator-style screen. | The `/cogni/dashboard` page (`CogniDashboardPage`) is **not role-adaptive**. It renders `ActionItemsWidget + MyActionItemsSection + RequestJourneySection` — all tuned for the Creator/Curator persona. |
| 2 | Why does an LC user land on `/cogni/dashboard`? | Login routing only chooses a portal (cogniblend), not a sub-page. After auth → `/cogni/dashboard` for everyone. |
| 3 | Why isn't the active workspace switched to LC? | `CogniRoleProvider` initialises `activeRole` from localStorage → fallback `getPrimaryRole(['CR','CU','ER','LC','FC'])`. If LC has no localStorage key, the **first available role in priority order wins** — but for a pure-LC user that *is* LC, so the role flag is correct. The visible "Curator-looking" UI is purely because **the dashboard page never branches by `activeRole`**. There is no LC dashboard composition. |
| 4 | Why is the deep-link (`/cogni/lc-queue`) not used? | Login routes to `/cogni/dashboard`, not the role's `ROLE_PRIMARY_ACTION.route`. So even though `LC.route = '/cogni/lc-queue'`, the user never lands there post-login. |
| 5 | Root cause | **Login never honours the user's primary CogniBlend role landing page.** Generic `/cogni/dashboard` + non-adaptive dashboard makes a pure LC look like a Curator. |

### Why #2 — "Curator's frozen challenge not visible in LC inbox"
| # | Why? | Answer |
|---|---|---|
| 1 | LC inbox shows nothing. | `LcChallengeQueuePage` lists rows from `useCogniUserRoles` filtered by `row.role_codes.includes('LC') && current_phase >= 2`. |
| 2 | Why is the row missing for `nh-lc`? | Verified via DB: `user_challenge_roles` for challenge `25ca71a0…` has only `CR` (creator) and `CU` (curator). There is **no LC row**. Pool: `nh-lc@testsetup.dev` has `role_codes = NULL` — they are not even in `platform_provider_pool`. |
| 3 | Why was no LC role assigned when curator clicked **Freeze for Legal Review**? | `freeze_for_legal_review` RPC only sets `curation_lock_status='FROZEN'` + writes content_hash. **It does NOT insert any LC assignment** in `user_challenge_roles`. Same for `assemble_cpa` — it inserts a `challenge_legal_docs` row but no role assignment. |
| 4 | Then who is supposed to assign LC? | The expected flow is `complete_phase` (Phase 2 → 3) calling the `assignment-pipeline` to auto-assign LC + FC. But Curator **never advanced the phase** — they only froze + assembled CPA (which itself failed historically due to `v_geo`, just fixed). Challenge is still `current_phase=2`. |
| 5 | Root cause | **Freeze + assemble are not coupled to LC assignment.** LC users only ever appear in the inbox after a phase advance triggers the assignment pipeline. The Curator's "Send to Legal" action (Freeze + Assemble CPA) is incomplete — it must either (a) call the assignment pipeline directly, or (b) auto-advance to the parallel-compliance phase. Until then, no LC ever sees the challenge regardless of how the queue is filtered. |

**One-line summary:** `nh-lc` has zero `user_challenge_roles.role_code='LC'` rows because the Curator's freeze/assemble flow never assigns an LC. The dashboard *looks* like Curator because there's no LC-specific landing page.

---

## Permanent Fix Plan — Two Phases

### Phase A — LC/FC assignment on "Send to Legal"
Single new RPC `send_to_legal_review(p_challenge_id, p_user_id)` orchestrates the existing pieces atomically:

1. Calls `freeze_for_legal_review` (already idempotent for already-FROZEN).
2. Calls `assemble_cpa`.
3. **NEW**: Calls existing `assign_workforce_role(p_challenge_id, 'LC')` — and for CONTROLLED also `'FC'` — to auto-pick from `platform_provider_pool` workload-balanced.
4. Inserts notification rows for the assigned LC/FC users.
5. Returns `{success, lc_user_id, fc_user_id?, content_hash, doc_id}`.

UI change: `LegalReviewPanel`'s "Send to Legal" button calls the new RPC instead of two separate hooks.

If `assign_workforce_role` does not yet exist, I'll create a thin wrapper that selects the least-loaded active pool member with `'R9'` (LC) or `'R8'` (FC) and inserts into `user_challenge_roles` with `is_active=true`.

**Backfill**: Single-shot SQL inside the same migration — for every challenge where `curation_lock_status='FROZEN'` AND no active LC role exists, run the assignment pipeline. This lights up the existing `25ca71a0…` and any siblings retroactively.

### Phase B — Role-adaptive landing
1. After login, route by `ROLE_PRIMARY_ACTION[primaryRole].route` instead of hardcoded `/cogni/dashboard`. So a pure-LC user lands directly on `/cogni/lc-queue`.
2. Update `CogniDashboardPage` to branch on `activeRole`:
   - `CR/CU` → existing creator/curator composition.
   - `LC` → embeds `LcChallengeQueuePage` content (or redirects to it).
   - `FC` → embeds `FcChallengeQueuePage` content.
   - `ER` → review queue.
3. No SPA/PWA logic touched.

### What this does NOT touch
- AI Pass 1 / Pass 2 / autosave.
- `complete_phase`, `unfreeze_for_recuration`, `complete_legal_review`, `complete_financial_review`.
- RLS, SPA gating (`useAudienceClassification`), PWA.
- `assemble_cpa` content (already fixed).
- Legal Architecture V2 freeze-review-publish.

### Files
| File | Change |
|---|---|
| `supabase/migrations/<ts>_send_to_legal_pipeline.sql` | New RPC `send_to_legal_review` + (if missing) `assign_workforce_role` + one-shot backfill |
| `src/hooks/cogniblend/useSendToLegal.ts` | New mutation hook calling the new RPC |
| `src/components/cogniblend/legal/LegalReviewPanel.tsx` | Replace dual mutation with single call |
| `src/pages/Login.tsx` | Route cogniblend users to `ROLE_PRIMARY_ACTION[primaryRole].route` (fallback `/cogni/dashboard`) |
| `src/components/routing/RoleBasedRedirect.tsx` | Same as above |
| `src/pages/cogniblend/CogniDashboardPage.tsx` | Branch by `activeRole` (LC/FC/ER/CU/CR) |

### Test gates
1. Login `nh-lc@testsetup.dev` → lands on `/cogni/lc-queue`, no SPA, header reads "Legal Workspace".
2. Backfill makes challenge `25ca71a0…` appear in LC's queue immediately.
3. Login as Curator on a fresh challenge → click **Send to Legal** → an LC pool user is auto-assigned, queue updates within React Query cache invalidation.
4. CONTROLLED challenge → both LC and FC are assigned in one call.
5. Login as `nh-fc@testsetup.dev` → lands on `/cogni/fc-queue`.
6. Login Solution Provider → SPA flow unchanged.
7. Curator login still lands on existing dashboard composition.
8. Re-clicking Send-to-Legal on already-frozen challenge is idempotent (no duplicate LC rows).

