

# Fix Plan: Creator → Curator Pipeline — Silent Auto-Assign Failures

## Root Cause Analysis (Verified Against Live DB)

**Casey's pool entry IS correctly linked** (`user_id = 5c67ff44...`), so Root Cause 1 from the analysis is not the current blocker. However, the `displayName`-based linking is still fragile and should be fixed.

**The real blocker is the silent catch block (Root Cause 2)**. Two Phase-3 challenges exist (`170e577a`, `0f5d6315`) with NO CU assigned — only CR. The auto-assign failure is completely invisible. The cause could be:
- The `validateRoleAssignment` call defaults `governanceProfile` to `'STRUCTURED'` instead of reading the challenge's actual mode (`CONTROLLED`)
- An RPC-level error swallowed by the empty `catch {}`

**Root Cause 3 (org context)** is NOT a blocker: Casey's `org_users` entry points to `d5a0a0f6` (New Horizon Company) — same org as the challenges.

---

## Changes (4 files + 1 migration + 1 edge function)

### Step 1: Fix seed — email-based linking + auth fallback

**File:** `supabase/functions/setup-test-scenario/index.ts` (lines 425-454)

- Change `userIds.find((u) => u.displayName === entry.name)` → `userIds.find((u) => u.email === entry.email)` (note: pool entry emails don't match scenario user emails — Casey is `nh-cu@testsetup.dev` in both, so this will work for New Horizon)
- Add auth fallback lookup when `linkedUser` is null (for cross-scenario runs)
- Add `user_id=linked/UNLINKED` to the result log for visibility
- Redeploy edge function

### Step 2: Fix silent catch blocks — add logging + user warnings

**Files:** `LcLegalWorkspacePage.tsx` (line 579), `LegalDocumentAttachmentPage.tsx` (line 688)

Replace empty `catch {}` blocks with:
- `logWarning(...)` call (per workspace rules — no console.error)
- `toast.warning(...)` to inform user that CU auto-assignment failed
- Check `autoAssignChallengeRole` return value — if null, show "No eligible Curator found" warning

### Step 3: Pass actual governance mode to validateRoleAssignment

**File:** `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`

The `findValidCandidate` function calls `validateRoleAssignment` without passing `governanceProfile`, which defaults to `'STRUCTURED'`. For CONTROLLED challenges, this could cause incorrect conflict evaluation.

Fix: Query the challenge's governance mode in `autoAssignChallengeRole` and pass it through to `findValidCandidate` → `validateRoleAssignment`.

### Step 4: Make `pool_member_id` nullable in `challenge_role_assignments`

**Migration:** `ALTER TABLE challenge_role_assignments ALTER COLUMN pool_member_id DROP NOT NULL;`

And update `assign_challenge_role` RPC to skip pool workload increment when `p_pool_member_id IS NULL`. This enables direct org-based CU assignment as a fallback path.

### Step 5: Add org_users fallback in auto-assign

**File:** `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`

After pool candidates return empty, query `org_users` for users with platform-level CU capability in the same org, then assign via `assign_challenge_role` RPC with `p_pool_member_id = null`.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Email-based pool linking + auth fallback |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | Replace empty catch with logging + toast warning |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | Same catch block fix |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Pass governance mode to validation + org_users fallback |
| New migration | Make `pool_member_id` nullable + update `assign_challenge_role` RPC |

