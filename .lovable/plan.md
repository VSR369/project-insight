

# Phase-Based Edit Locking + Change Notifications for CA/CR

## The Problem

Currently, the Challenge Architect (CA/CR) can click "Edit" and modify challenge content **at any phase** -- even after the challenge has moved to Phase 3 (Curation) or beyond. The Curator has no way to know content was changed behind their back. This breaks governance integrity.

## Solution: Two Layers of Protection

### Layer 1: Phase-Based Edit Lock (AMRequestViewPage)

**File: `src/pages/cogniblend/AMRequestViewPage.tsx`**

Fetch the challenge's `current_phase` using the existing `useChallengeDetail` hook. Based on the active role and current phase, control whether the Edit button is shown:

- **CA/CR**: Edit allowed only in Phase 1 and Phase 2 (their ownership phases). Phase 3+ = view-only with a tooltip explaining "This challenge is now with the Curator."
- **AM/RQ**: Edit allowed only in Phase 1 (intake). Phase 2+ = view-only.

When editing is locked, the Edit button is replaced with a disabled state + info badge showing who currently owns the challenge (e.g., "With Curator" or "With Legal").

### Layer 2: Change Notification to Downstream Roles (Safety Net)

**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`** (in `handleUpdateChallenge`)

If the challenge is in Phase 3+ and the user somehow edits (e.g., via a race condition or future admin override), insert a `cogni_notifications` record to alert the Curator:

- `notification_type: 'CONTENT_MODIFIED'`
- `message: "Challenge spec was updated by [role] after handoff to curation"`
- Target: all users with `CU` role for that challenge (queried from `user_challenge_roles`)

### Implementation Details

**AMRequestViewPage changes:**
```
1. Import useChallengeDetail
2. Fetch challenge data using the challengeId
3. Derive editAllowed:
   - CA/CR: current_phase <= 2
   - AM/RQ: current_phase <= 1
4. Show phase ownership badge when locked
5. Pass mode='view' unconditionally when !editAllowed
```

**ConversationalIntakePage changes (handleUpdateChallenge):**
```
After successful save, if current_phase >= 3:
  1. Query user_challenge_roles for CU role holders on this challenge
  2. Insert cogni_notifications for each CU user
```

**Phase ownership labels:**
| Phase | Owner Label |
|-------|------------|
| 1 | Intake |
| 2 | Spec Review (CR/CA) |
| 3 | Curation (CU) |
| 4 | Approval (ID) |
| 5+ | Active / Published |

**Files modified**: 2 (`AMRequestViewPage.tsx`, `ConversationalIntakePage.tsx`)

