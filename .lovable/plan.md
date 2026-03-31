

# Final Plan: Fix 7 Creator Bugs + Browse Challenges Enhancement

## Confirmation: My Challenges vs Browse Challenges

- **My Challenges** (`/cogni/my-challenges`) = Your own challenges (drafts, submitted, active). CRUD operations.
- **Browse Challenges** (`/cogni/browse`) = Discovery marketplace showing published ACTIVE challenges from ALL organizations. Read-only for discovery.

**Browse Challenges already has:** search by title/org/industry, tabs (All/Active/In Preparation/Published), card grid with status badges, complexity/maturity filters. This is working correctly.

**Enhancement needed:** Add dropdown filters for Industry and Complexity Level alongside existing search.

---

## All Changes (7 bugs + 1 enhancement)

### 1. SQL Migration (Bugs 4, 5, 7)

**`get_phase_required_role`** — Replace `AM` → `CR`, `ID` → `CU` for phases 1-6.

**`auto_assign_roles_on_creation`** — QUICK assigns `['CR','CU','ER','LC','FC']`, STRUCTURED/CONTROLLED assigns `['CR']`. Remove deprecated `AM`/`ID`.

**Test data cleanup** — Soft-delete drafts with empty problem statements; deactivate orphan roles.

### 2. `src/hooks/cogniblend/useSubmitSolutionRequest.ts` (Bugs 2, 3)

- **Bug 3**: Fix legal template query — remove `is_default` and `content_summary` columns (don't exist). Use `description` instead.
- **Bug 2**: Add `referenceUrls`, `currentDeficiencies`, `maturityLevel`, `ipModel` to `SubmitPayload`. Include them in the single Write 1 update so Write 2 doesn't overwrite `extended_brief`.

### 3. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (Bug 2)

- Pass `contextBackground`, `rootCauses`, `affectedStakeholders`, `preferredApproach`, `approachesNotOfInterest`, `currentDeficiencies`, `referenceUrls`, `maturityLevel`, `ipModel` in `buildPayload`.
- Remove the post-submit `.update()` that overwrites `extended_brief`. Keep only file upload logic.

### 4. `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` (Bug 1)

- Line 138: `/cogni/my-requests/${challengeId}/view` → `/cogni/challenges/${challengeId}/view`

### 5. `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` (Bug 6)

- Line 53: Change fallback from `{ label: 'Set Up Access', route: '/cogni/demo-login' }` to `{ label: 'Create Challenge', route: '/cogni/challenges/create' }`
- Make all 3 stat cards clickable → navigate to `/cogni/my-challenges`

### 6. `src/hooks/cogniblend/useCogniUserRoles.ts` (Sidebar fix)

- After computing `allRoleCodes`, if empty and user is authenticated, add `'CR'` as baseline so sidebar items appear for new Creators.

### 7. `src/pages/cogniblend/BrowseChallengesPage.tsx` (Enhancement)

- Add Industry filter dropdown (extracted from challenge data)
- Add Complexity Level filter dropdown (extracted from challenge data)
- Place filters in a row next to the search bar

---

## CRUD Operations — Business Rules Verification

| Operation | Business Rule | Status |
|---|---|---|
| **Create** — New challenge via form | `initialize_challenge` RPC creates row + assigns roles | DONE |
| **Read** — My Challenges list | Filtered by `user_challenge_roles` for current user | DONE |
| **Read** — Browse Challenges | Only `ACTIVE` + `published_at IS NOT NULL` | DONE |
| **Update** — Save Draft | Updates existing challenge (not new row) | DONE |
| **Update** — Resume Draft | Loads via `?draft=<id>`, form pre-populated | DONE |
| **Delete** — Soft delete draft | Sets `is_deleted=true`, only on DRAFT status | DONE |
| **Submit** — Send to Curator | `complete_phase` RPC advances Phase 1→2 | DONE (Bug 4 fixes role check) |
| **Legal auto-attach** — QUICK mode | Tier 1 templates auto-inserted | FIXED by Bug 3 |
| **extended_brief preservation** | Single write, no overwrite | FIXED by Bug 2 |
| **View** — Creator detail page | Hides solver components, shows status | DONE |

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Bugs 4, 5, 7 |
| `useSubmitSolutionRequest.ts` | Bugs 2, 3 |
| `ChallengeCreatorForm.tsx` | Bug 2 |
| `MyActionItemsSection.tsx` | Bug 1 |
| `ActionItemsWidget.tsx` | Bug 6 + sidebar fallback |
| `useCogniUserRoles.ts` | Default CR for new users |
| `BrowseChallengesPage.tsx` | Industry + Complexity filters |

Total: 1 migration + 6 frontend files.

