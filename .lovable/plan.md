

## Root Cause Analysis: Challenge View "Not Found" & Curation Queue Issues

### 5 Whys Analysis

1. **Why does clicking "View" on My Challenges show "Challenge Not Found"?**
   Because `usePublicChallenge` query returns `null` — PostgREST returns an error instead of data.

2. **Why does the PostgREST query fail?**
   Two missing/wrong columns in the SELECT: `challenge_enrollment` (doesn't exist in `challenges` table) and `website` (actual column name is `website_url` in `seeker_organizations`).

3. **Why do missing columns break the entire query?**
   PostgREST returns a 400/error for any invalid column reference. The hook treats any error as `null` → renders "Not Found".

4. **Why weren't these column mismatches caught earlier?**
   The columns were likely renamed or never created, and the hook was written against an assumed schema. No TypeScript compile-time check catches DB column mismatches.

5. **Why does this affect curator queue visibility too?**
   Curators navigating to review a challenge use the same `/view` route, hitting the same broken query. The curation queue listing itself may work, but the detail view fails.

### Evidence from DB Logs

```
ERROR: column seeker_organizations_1.website does not exist
ERROR: invalid input syntax for type uuid: "AI/ML"
```

- `challenge_enrollment` — confirmed NOT in `information_schema.columns`
- `seeker_organizations.website` — actual column is `website_url`

### Important Finding: My Challenges List DOES Work

Session replay confirms the challenge card appeared on My Challenges page (title, badges, tags all rendered). The failure happens when clicking **View** → `PublicChallengeDetailPage` → `usePublicChallenge` hook fails.

### Fixes (1 file)

**File: `src/hooks/cogniblend/usePublicChallenge.ts`**

1. **Remove `challenge_enrollment`** from the SELECT — this column doesn't exist. The `challenge_enrollment` field in the type interface should remain but default to `null`.

2. **Change `website` to `website_url`** in the joined `seeker_organizations` select:
   ```
   // Before:
   seeker_organizations!challenges_organization_id_fkey (
     organization_name, trade_brand_name, website, description
   )
   
   // After:
   seeker_organizations!challenges_organization_id_fkey (
     organization_name, trade_brand_name, website_url, description
   )
   ```
   And update `buildResult` to read `org?.website_url` instead of `org?.website`.

3. **Remove `industry_segments (name)`** join if `industry_segments` FK doesn't exist on challenges (potential secondary error source — needs verification during implementation).

These 2-3 line fixes in a single file will unblock both the Creator view and Curator review detail pages.

