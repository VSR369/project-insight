

# Restore Dual-Level Governance Header on Challenge Create Page

## Problem

The previous change incorrectly removed the Org-level and Challenge-level governance badges from the page header. The user wants **both** levels always visible -- even when they show the same mode -- so the Creator has explicit clarity on what the org default is vs. what they've selected for this challenge.

## What Changes

### 1. `src/pages/cogniblend/ChallengeCreatePage.tsx` — Restore dual-level header

Replace the plain "New Challenge" `<h1>` (lines 241-243) with the dual-badge header:

```
New Challenge :: Org level: [GovernanceProfileBadge] ; Challenge level: [GovernanceProfileBadge]
```

- **Org level** badge: resolved via `resolveGovernanceMode(currentOrg.governanceProfile)` -- shows the org's raw profile
- **Challenge level** badge: the local `governanceMode` state (what the Creator has selected/is selecting)

Both use `GovernanceProfileBadge` (compact) with standard color coding.

Re-add the `GovernanceProfileBadge` import.

### 2. `src/components/cogniblend/CreationContextBar.tsx` — Fix tier clamping on Governance badge

The existing Governance badge in CreationContextBar already uses `getDefaultGovernanceMode(tierCode, governanceProfile)` which clamps to tier-allowed modes. This is correct and stays as-is. No change needed here.

### 3. Data fix — Clamp org governance_profile to tier ceiling (migration)

Create a migration to update `seeker_organizations` where `governance_profile` exceeds tier allowance. For orgs on Basic tier (or no subscription), reset `governance_profile` from CONTROLLED/STRUCTURED to QUICK. This prevents the root cause of showing "CONTROLLED" for a Basic-tier org.

## Summary of changes

| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Restore dual-level governance header with `GovernanceProfileBadge` for both Org and Challenge levels |
| New migration | Clamp `governance_profile` values to tier-permitted modes for data consistency |

