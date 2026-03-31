

# Fix: Challenge Detail "Not Found" + Browse Challenges Robustness

## Root Cause

**Every single challenge in the database has `published_at = NULL`.** The detail page hook (`usePublicChallenge`) filters with `.not('published_at', 'is', null)` — meaning it requires challenges to be published. Since none are published, clicking ANY challenge from Browse always returns "Challenge Not Found".

The Browse page works fine because `useBrowseChallenges` does NOT filter by `published_at`.

Database proof (all 10 challenges):
```
published_at: null (every row)
```

## Fix Plan

### Step 1: Fix `usePublicChallenge.ts` — Remove mandatory `published_at` filter

The detail page is inside the authenticated CogniShell (`/cogni/challenges/:id/view`), so it should show all non-deleted challenges to authenticated users, not just published ones.

**Changes:**
- Remove `.not('published_at', 'is', null)` filter
- For authenticated users: show all non-deleted challenges
- For unauthenticated users: only show published challenges (keep the filter)
- Use `.maybeSingle()` instead of `.single()` to avoid errors when no row found
- Add org data to the query (join `seeker_organizations` for org name display)

### Step 2: Enrich detail page with org context

The detail page currently shows no organization info. Add org name/industry fetched via a join so solvers know WHO posted the challenge.

**Changes to `usePublicChallenge.ts`:**
- Add join to `seeker_organizations` and `industry_segments` in the select
- Add `organization_name`, `trade_brand_name`, `industry_name` to `PublicChallengeData` interface
- Map joined data in `buildResult`

### Step 3: Fix `PublicChallengeDetailPage.tsx` — Show org info + handle unpublished

- Display org name and industry in the hero section
- Show "In Preparation" badge for unpublished challenges
- Show meaningful content even when JSONB fields (reward_structure, evaluation_criteria, deliverables) are empty — instead of blank cards

### Step 4: Fix `BrowseChallengesPage.tsx` — forwardRef warning

Console shows "Function components cannot be given refs" for `ChallengeCard`. This is because the `Card` passes a ref through to `ChallengeCard`. Not critical but should be cleaned up.

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/cogniblend/usePublicChallenge.ts` | **Modified** — Remove `published_at` filter for auth users, add org join, use `maybeSingle()` |
| `src/pages/cogniblend/PublicChallengeDetailPage.tsx` | **Modified** — Show org info, handle empty JSONB fields gracefully |
| `src/pages/cogniblend/BrowseChallengesPage.tsx` | **Minor** — No functional change needed (ref warning is cosmetic) |

## Impact

- Clicking any challenge from Browse → shows full detail page instead of "Not Found"
- Detail page shows org context (who posted the challenge)
- Empty sections handled gracefully (no blank cards)
- Works for both published and unpublished challenges within the platform

