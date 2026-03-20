

## Plan: Fix LC and FC Workflow — Root Cause Analysis and Corrections

### Root Causes

1. **LC lands on wrong page**: `aiDestination` for LC is `/cogni/legal-review` which renders the old `LcReviewQueuePage` — a queue that waits for `legal_review_requests` table entries (the Manual path's review model). The AI-assisted `LcLegalWorkspacePage` exists at `/cogni/challenges/:id/lc-legal` but requires a challenge ID, so there's no landing page that lists challenges awaiting LC action.

2. **No LC challenge queue page**: The LC in the AI path needs a page that lists challenges passed from the Creator (Phase 2, needing legal docs). From there, clicking a challenge opens `LcLegalWorkspacePage`. This page doesn't exist.

3. **FC page works but is disconnected from sidebar/demo**: The `EscrowManagementPage` at `/cogni/escrow` is functional but the sidebar still shows it under "SOLUTIONS" section rather than making it contextually prominent for the FC role.

4. **Sidebar "Legal Documents" and "Legal Review" are confusing**: Two separate LC menu items don't distinguish AI vs Manual paths. In AI path, LC should see a unified "Legal Workspace" entry.

### Changes

**File 1: New `src/pages/cogniblend/LcChallengeQueuePage.tsx`**

A new landing page for the LC role that shows challenges needing legal document preparation:
- Queries `user_challenge_roles` for challenges where user has `LC` role
- Fetches challenge details (title, phase, status, governance_profile)
- Filters to show challenges in Phase 2 (or configurable) that need legal docs
- Each row shows: challenge title, governance mode, phase status, existing doc count
- "Open Workspace" button navigates to `/cogni/challenges/:id/lc-legal` (AI path) or `/cogni/challenges/:id/legal` (manual path) based on `sessionStorage.getItem('cogni_demo_path')`
- Path-aware: in AI mode, button says "AI Legal Workspace"; in manual mode, "Review Documents"

**File 2: Update `src/App.tsx`**

- Add route: `/cogni/lc-queue` → `LcChallengeQueuePage`
- Keep existing `/cogni/legal-review` route (still used for ad-hoc review requests)

**File 3: Update `src/pages/cogniblend/DemoLoginPage.tsx`**

- Change LC `aiDestination` from `/cogni/legal-review` to `/cogni/lc-queue`
- Change LC `manualDestination` from `/cogni/legal-review` to `/cogni/lc-queue`

**File 4: Update `src/components/cogniblend/shell/CogniSidebarNav.tsx`**

- Replace "Legal Documents" (`/cogni/legal`) with "Legal Workspace" (`/cogni/lc-queue`) for the LC role
- Keep "Legal Review" as a secondary item for ad-hoc review requests

**File 5: Update `src/components/cogniblend/shell/CogniShell.tsx`**

- Add breadcrumb mapping: `/cogni/lc-queue` → "Legal Workspace"

### What This Fixes
- LC logs in via AI path → lands on challenge queue → clicks challenge → opens AI-assisted legal workspace with suggestions
- LC logs in via Manual path → same queue → clicks challenge → opens manual legal doc attachment page
- FC flow is already functional at `/cogni/escrow` — no changes needed
- Both paths share the same landing page, with path-aware routing to the correct workspace

### Technical Details
- `LcChallengeQueuePage` uses `user_challenge_roles` filtered by `role_code = 'LC'` to find assigned challenges
- Path detection via `sessionStorage.getItem('cogni_demo_path')` determines which workspace page to link to
- No database changes needed

