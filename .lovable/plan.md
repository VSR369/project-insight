

# Plan: Add Governance & Engagement Selectors to Demo Login Page

## Problem

The governance mode and engagement model selectors are on `ChallengeCreatePage` (post-login), but the user wants them visible **on the demo login page itself** (`/cogni/demo-login`) — so testers can pick a governance mode + engagement model BEFORE logging in as a role, and the selection carries through to the creation flow.

## Approach

1. Add the `GovernanceEngagementSelector` UI to `DemoLoginPage.tsx` between the Seed Card and the Tabs
2. Persist selections in `sessionStorage` (e.g., `cogni_demo_governance`, `cogni_demo_engagement`)
3. On `ChallengeCreatePage`, read these sessionStorage values as initial defaults (overriding org defaults when present)

## Changes

### 1. `src/pages/cogniblend/DemoLoginPage.tsx`

- Import governance utilities (`GovernanceMode`, `GOVERNANCE_MODE_CONFIG`, `getAvailableGovernanceModes`, `resolveGovernanceMode`) and the selector UI elements (cards grid + engagement dropdown) — inline since this page doesn't have org context pre-login
- Add `governanceMode` and `engagementModel` state (defaults: `STRUCTURED`, `MP`)
- Render a "Challenge Configuration" section between the Seed Card and the Tabs containing:
  - 3-column governance mode cards (QUICK / STRUCTURED / CONTROLLED) — all enabled since this is a demo page for testing all behaviors
  - Engagement model dropdown (MP / AGG)
- On login (`handleLogin`), persist selections to sessionStorage:
  - `sessionStorage.setItem('cogni_demo_governance', governanceMode)`
  - `sessionStorage.setItem('cogni_demo_engagement', engagementModel)`

### 2. `src/pages/cogniblend/ChallengeCreatePage.tsx`

- In the `useEffect` that initializes `governanceMode`, check `sessionStorage.getItem('cogni_demo_governance')` first — if present, use it instead of org default
- In the `useEffect` that initializes `engagementModel`, check `sessionStorage.getItem('cogni_demo_engagement')` first — if present, use it instead of org default
- Clear these sessionStorage keys after reading (one-time override)

## Files Modified

| File | Changes |
|------|---------|
| `DemoLoginPage.tsx` | Add governance mode cards + engagement model dropdown before the tabs; persist to sessionStorage on login |
| `ChallengeCreatePage.tsx` | Read sessionStorage overrides for governance/engagement on mount |

