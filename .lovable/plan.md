

# Plan: Lift Governance & Engagement Selectors to Landing Page

## What Changes

Move the Governance Mode cards and Engagement Model dropdown from inside `ConversationalIntakeContent` (AI-only) up to `ChallengeCreatePage` (the landing page). Both the AI-Assisted and Manual Editor paths will inherit the selection. When a demo user logs in and lands on this page, the first thing they see is the governance/engagement selection, followed by the path cards.

## Changes

### 1. `src/pages/cogniblend/ChallengeCreatePage.tsx`

- Add `governanceMode` and `engagementModel` state at page level, initialized from org defaults via `resolveGovernanceMode` and org operating model
- Import `GovernanceMode`, `getAvailableGovernanceModes`, `GOVERNANCE_MODE_CONFIG`, `resolveGovernanceMode` and icons (`Zap`, `ShieldCheck`, `Info`)
- Add `useEffect` to sync defaults from `currentOrg` once loaded
- Render the **Governance Mode 3-card grid** and **Engagement Model dropdown** on the landing view — between the page header ("New Challenge") and the Track Cards
- Also show them on the AM/RQ landing view (above `SimpleIntakeForm`)
- Pass `governanceMode` and `engagementModel` as props to `ConversationalIntakeContent` and `ChallengeWizardPage`

### 2. `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Add optional `governanceMode` and `engagementModel` props to `ConversationalIntakeContentProps`
- If props are provided, use them instead of local state (remove the local `useState` + `useEffect` for these two)
- Remove the Governance Mode cards UI block (lines 606-683) and Engagement Model UI block (lines 685-712) from the rendered output — they now live on the parent page
- Keep the logic that uses `governanceMode` for routing (`getPostGenerationRoute`) and `engagementModel` for the creation payload

### 3. `src/pages/cogniblend/ChallengeWizardPage.tsx`

- Accept optional `governanceMode` and `engagementModel` props
- Use them in the wizard's creation payload so Manual Editor also respects the landing page selection

## Files Modified

| File | Changes |
|------|---------|
| `ChallengeCreatePage.tsx` | Add governance/engagement state + selector UI on all landing views, pass as props to children |
| `ConversationalIntakePage.tsx` | Accept governance/engagement as props, remove duplicate selector UI |
| `ChallengeWizardPage.tsx` | Accept and use governance/engagement props |

