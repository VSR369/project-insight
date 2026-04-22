

# Plan — Make the FC workspace reachable for `nh-fc@testsetup.dev` + remove the dead `/cogni/escrow` path

## Five-why root-cause analysis (verified against DB + code)

1. **You see "No challenges requiring escrow are assigned to you" and no tabs.** → Because the page never receives a challenge to render.
2. **Why no challenge?** → `EscrowManagementPage` and `FcChallengeQueuePage` both query `user_challenge_roles WHERE user_id = <you> AND role_code = 'FC' AND is_active = true`. For Frank Coleman (`8f429cdb-…`, `nh-fc@testsetup.dev`) that query returns **zero rows**.
3. **Why zero rows?** → DB confirms it. The **only** FC assignment in the entire database is on user `nh-pp-fc@testsetup.dev` (challenge `25ca71a0…`, CONTROLLED, Phase 2). Frank Coleman has never been assigned the FC role on any challenge.
4. **Why doesn't the sidebar show "Finance Workspace" then?** → It's gated by `canSeeEscrow → requiresHumanActor(['FC'])`, which requires at least one active `user_challenge_roles` FC row. He has none → sidebar entry is correctly hidden → he can only land on `/cogni/escrow` by URL.
5. **Why is `/cogni/escrow` still showing the old "queue with empty state" instead of routing him to `Finance Workspace`?** → It's a leftover page kept as a "fallback" but it duplicates the queue and doesn't surface the new tabs/workspace. With the new per-challenge workspace at `/cogni/challenges/:id/finance` and the new queue at `/cogni/fc-queue`, `/cogni/escrow` is now confusing dead weight.

**Conclusion:** the UX *is* working as designed — the user simply has no FC assignment to act on. We need to (a) seed an FC role on Frank so he can actually exercise the workspace, (b) eliminate the confusing `/cogni/escrow` page by redirecting it to `/cogni/fc-queue`, and (c) tighten the empty-state message so a future FC understands *why* their queue is empty.

## Changes (one focused PR)

### 1. Assign Frank Coleman the FC role on the existing test challenge

Migration (additive, idempotent):

```sql
INSERT INTO user_challenge_roles (challenge_id, user_id, role_code, is_active, assigned_via)
VALUES (
  '25ca71a0-3880-4338-99b3-e157f2b88b3b',
  '8f429cdb-20c6-49ab-8a3a-75b4a4cd257b',
  'FC',
  true,
  'manual_seed'
)
ON CONFLICT (challenge_id, user_id, role_code) DO UPDATE SET is_active = true;
```

After this, Frank's queue has exactly one card under "Upcoming (in curation)" (challenge is at Phase 2), with a `View challenge context` button → opens `/cogni/challenges/25ca71a0…/finance` in **preview mode** showing both tabs (Finance Review + Curated Challenge). Once the curator advances it to Phase 3, the deposit form + submit footer light up. (`nh-pp-fc@testsetup.dev` keeps its existing assignment — both users share the workspace, harmless for testing.)

### 2. Replace `/cogni/escrow` with a redirect to `/cogni/fc-queue`

`src/App.tsx` — change the route:

```tsx
// Before
<Route path="/cogni/escrow" element={<LazyRoute><EscrowManagementPage /></LazyRoute>} />
// After
<Route path="/cogni/escrow" element={<Navigate to="/cogni/fc-queue" replace />} />
```

Drop the `EscrowManagementPage` lazy import. Delete the file `src/pages/cogniblend/EscrowManagementPage.tsx` (its sole responsibility is duplicated by `FcChallengeQueuePage` + workspace). One source of truth for the FC entry point — same pattern LC uses (`/cogni/lc-queue`).

### 3. Make the empty-queue message diagnostic, not generic

`src/pages/cogniblend/FcChallengeQueuePage.tsx` — when `queue.length === 0` AND there's no search filter, render:

> **No FC assignments yet.**
> You haven't been assigned as Finance Coordinator on any CONTROLLED challenges. New CONTROLLED challenges will appear here once a Curator advances them out of Phase 1 and routes you in.
> [View Dashboard]

When the user is a current FC on something but everything is filtered out (e.g., all challenges complete), keep the existing "match your search" branch.

This stops the false "screen is broken" impression a future FC would get on a clean account.

### 4. Fix the QUICK/STRUCTURED filter wording in the queue

The queue currently silently drops STRUCTURED + QUICK challenges (correct: FC isn't required there). Add a one-line note under the page subtitle so the FC understands the scope:

> "Finance review applies to **CONTROLLED** governance challenges only."

No logic change — comment-only clarity.

## Files

| File | Action | ~lines |
|---|---|---|
| Supabase migration (`assign_fc_to_frank.sql`) | CREATE — idempotent INSERT into `user_challenge_roles` | 7 |
| `src/App.tsx` | MODIFY — `/cogni/escrow` → `<Navigate>` redirect; drop lazy import | -3 / +2 |
| `src/pages/cogniblend/EscrowManagementPage.tsx` | DELETE | -200 |
| `src/pages/cogniblend/FcChallengeQueuePage.tsx` | MODIFY — diagnostic empty-state + scope note | ~20 |

All files ≤ 250 lines. Zero changes to: `complete_financial_review` RPC, `EscrowDepositForm`, `escrow_records` schema or RLS, `escrow-proofs` bucket, LC workspace, AI passes, QUICK mode, Curator flows, sidebar, role context, permissions.

## What you'll see after the change

1. Log in as `nh-fc@testsetup.dev` → Sidebar now shows **Finance Workspace** under CHALLENGES (because Frank now holds an active FC role).
2. Click **Finance Workspace** → `/cogni/fc-queue` → "Upcoming (in curation)" section lists the test challenge with **View challenge context** button.
3. Click the button → `/cogni/challenges/25ca71a0…/finance` → header + step indicator + **two tabs: "Finance Review" and "Curated Challenge"** render. Preview banner: "Finance review unlocks at Phase 3."
4. **Finance Review** tab shows Legal Agreement viewer (or "Legal documents being reviewed" placeholder if LC hasn't approved yet) + Recommended Escrow card. No deposit form (preview).
5. **Curated Challenge** tab shows the full 33-section read-only spec via `FcChallengeDetailView`.
6. Visiting old URL `/cogni/escrow` → instantly redirects to `/cogni/fc-queue` (no more dead-end "No challenges" page).
7. As Curator, advance challenge to Phase 3 → reload as FC → preview banner gone, deposit form + submit footer appear, full happy path works (unchanged behaviour).
8. `npx tsc --noEmit` passes.

## Verification

- DB: `SELECT * FROM user_challenge_roles WHERE user_id = '8f429cdb-…' AND role_code = 'FC';` returns 1 active row.
- Sidebar: pure-FC users still don't see SOLVER items (unchanged).
- LC user (`nh-lc@…`): sidebar and routes unchanged.
- `/cogni/escrow` returns HTTP 302 → `/cogni/fc-queue` (client-side redirect via `<Navigate>`).
- No file >250 lines; no `console.*`; no `any` introduced.

## Out of scope

- Auto-assigning the FC role at challenge creation (separate spec — `assignment_pipeline_authority`).
- Allowing FC to act before Phase 3 (production gate preserved).
- Changing the deposit form, RPC, fees, or proof upload.
- Touching the LC workspace, AI passes, or Curator flows.

