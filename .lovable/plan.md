

# Fix: Challenge Creator Page — Remove Old Flows, Render New 2-Tab Form

## Summary
Rewrite `ChallengeCreatePage.tsx` from ~530 lines to ~120 lines. Remove governance mode selection, track cards, AI conversational intake, and wizard rendering. Show only the engagement model selector + 2-tab `ChallengeCreatorForm`. Clean up related routing and demo login session storage.

## Changes

### 1. Rewrite `src/pages/cogniblend/ChallengeCreatePage.tsx` (MAJOR)
**Remove entirely:**
- `GovernanceEngagementSelector` component (~120 lines of governance mode cards)
- `GovernanceFooter` component
- `MODE_CARDS` constant
- `TrackCard` component
- `ActiveView` state machine (`landing`/`ai`/`editor` views)
- `ConversationalIntakeContent` and `ChallengeWizardPage` rendering blocks
- `SharedIntakeState` type and all shared state logic
- `governanceMode` state, `sharedState`, `searchParams`-based view routing
- `demoPath`/`resolvedTab` logic
- All governance-related imports

**Replace with:**
- Simple page: `CreationContextBar` + page header + engagement model `Select` + `ChallengeCreatorForm`
- Keep: `useCurrentOrg`, `useOrgModelContext`, loading skeleton, no-org guard
- Keep: `cogni_demo_engagement` sessionStorage read for engagement model init
- Remove: `cogni_demo_governance` and `cogni_demo_path` reads (no longer relevant to this page)

### 2. Update `src/App.tsx` (1 line)
- Change redirect: `<Route path="/cogni/challenges/new" element={<Navigate to="/cogni/challenges/create" replace />} />`
- Remove `?tab=editor` query param (no longer meaningful)

### 3. Update `src/pages/cogniblend/DemoLoginPage.tsx` (~30 lines)
- Remove the two-tab AI/Manual path selection (no longer needed — Creator always sees 2-tab form)
- Remove `sessionStorage.setItem('cogni_demo_path', path)` — this key is dead for Creator
- Keep `cogni_demo_governance` (still used by Curator pages)
- Keep `cogni_demo_engagement` (still used by new ChallengeCreatePage)
- Simplify: single grid of demo users with one "Login" button each (no AI vs Manual split)
- Update Creator user destinations to `/cogni/challenges/create` (no `?tab=` param)
- Keep governance mode selector (affects Curator flow)
- Remove `DemoPath` type export and `path` prop from `DemoUserCard` usage

### 4. Files NOT changed
- `ChallengeCreatorForm.tsx`, `EssentialDetailsTab.tsx`, `AdditionalContextTab.tsx` — already correct
- `AISpecReviewPage.tsx`, `LcLegalWorkspacePage.tsx`, `LcChallengeQueuePage.tsx` — still reference `cogni_demo_path` for their own AI-path logic; leave as-is (they degrade gracefully if the key is absent)

## Technical Notes
- The `ConversationalIntakePage` and `ChallengeWizardPage` files are NOT deleted — they remain importable for other routes (e.g., `/cogni/challenges/:id/wizard`). They are simply no longer rendered from `ChallengeCreatePage`.
- `SharedIntakeState` export is removed. If any file imports it, a search confirms only `ChallengeCreatePage.tsx` defines it — no external consumers.
- `DemoPath` type is exported from `DemoLoginPage.tsx` — check if `DemoUserCard` imports it. If so, simplify that component too.

