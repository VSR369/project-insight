

# Add Governance Mode Context Header to Challenge Create Page

## What

Add a prominent header bar at the top of the Challenge Create page showing:
```
New Challenge :: Org level: CONTROLLED ; Challenge level: STRUCTURED
```

This gives the Creator immediate visibility into both the organization's default governance mode and the currently selected challenge-level governance mode.

## How

**File: `src/pages/cogniblend/ChallengeCreatePage.tsx`**

Replace the current page header (lines 238-243) with a styled context header that displays:
- **Org level**: resolved from `currentOrg.governanceProfile` using `resolveGovernanceMode()`
- **Challenge level**: the current `governanceMode` state (what the Creator has selected)

Each mode label will use the governance color scheme from `GOVERNANCE_MODE_CONFIG` for visual clarity (green for QUICK, blue for STRUCTURED, purple for CONTROLLED).

The implementation will be a simple inline section — no new file needed since it's just a few lines replacing the existing header text. The `resolveGovernanceMode` import already exists via `getDefaultGovernanceMode` usage, we just need to add it explicitly.

### Render structure
```
┌─────────────────────────────────────────────────────────┐
│  New Challenge :: Org level: [CONTROLLED]  ;            │
│                   Challenge level: [STRUCTURED]         │
└─────────────────────────────────────────────────────────┘
```

Each `[MODE]` rendered as a colored badge using `GovernanceProfileBadge` (compact).

## Changes

| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Import `resolveGovernanceMode`, replace page header with dual-level governance display using `GovernanceProfileBadge` |

