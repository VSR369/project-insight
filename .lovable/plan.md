

# Remove Governance Mode from Top Header Areas

## What Changes

Two removals to declutter the top-level headers:

### 1. CogniSidebar — Remove badge under org name
**File:** `src/components/cogniblend/shell/CogniSidebar.tsx` (lines 83-89)
Remove the `<div>` containing `<GovernanceProfileBadge>` below the org name.

### 2. ChallengeCreatePage — Simplify header to just "New Challenge"
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx` (lines 241-251)
Replace the multi-part header (`New Challenge :: Org level: [badge] ; Challenge level: [badge]`) with a simple `<h1>New Challenge</h1>`. Remove the `GovernanceProfileBadge` import if no longer used.

## What Stays

- Governance badges on dashboard challenge cards (MyChallengesSection, OpenChallengesSection)
- Governance badges in CurationHeaderBar, ChallengeManagePage, PublicationReadinessPage
- The GovernanceEngagementSelector on the create page (where the user actually picks the mode)

