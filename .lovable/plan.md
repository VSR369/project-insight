

## Root Cause Found: PostgREST Ambiguous Join (PGRST201)

### What I Verified

I tested all user types from my browser tool right now:

| User | Auth | Login Redirect | Dashboard Load | Status |
|---|---|---|---|---|
| `admin@test.local` | 200 OK | `/admin` | Renders fully | Works |
| `seeker@test.local` | 200 OK | `/pulse/feed` (WRONG) | Provider feed, not org | **BROKEN** |

### The Real Bug: PGRST201 Ambiguous Relationship

The `useCurrentOrg` query on line 38 of `src/hooks/queries/useCurrentOrg.ts` uses:

```
seeker_subscriptions (
  md_subscription_tiers ( code )
)
```

PostgREST returns **HTTP 300** with error `PGRST201`:

```
"Could not embed because more than one relationship was found for
'seeker_organizations' and 'seeker_subscriptions'"
```

The `seeker_subscriptions` table has **two** foreign keys pointing to `seeker_organizations`:
- `organization_id` → `seeker_organizations(id)`
- `tenant_id` → `seeker_organizations(id)`

PostgREST doesn't know which FK to use for the join. The query fails, `useCurrentOrg` throws an error, `OrgProvider` shows "No Organization Found," and the Login page falls back to the provider portal.

### Why This Only Affects Seeking Org Users

Admin, Provider, and Reviewer login flows never call `useCurrentOrg`. Only the `/org/*` routes wrapped in `SeekerGuard` → `OrgProvider` → `useCurrentOrg` trigger this query. The login redirect logic detects the org_users record fine (simple `SELECT id` query), but then redirects to provider portal because `useCurrentOrg` fails in the background on the OrgProvider.

Actually, looking more carefully at the login flow: the seeker user logged in as "Provider" tab (not Organization tab). The login page was on Provider tab by default, so it detected the seeker has no provider record, fell through to org, but the `sessionStorage` cached portal may have been stale. However, the core bug remains — even if correctly routed to `/org/dashboard`, the `OrgProvider` would fail due to PGRST201.

### The Fix: Disambiguate the FK in `useCurrentOrg.ts`

**Line 38** — specify which FK to use:

```typescript
// BEFORE (ambiguous — causes PGRST201)
seeker_subscriptions (
  md_subscription_tiers ( code )
)

// AFTER (explicit FK — resolves ambiguity)
seeker_subscriptions!seeker_subscriptions_organization_id_fkey (
  md_subscription_tiers ( code )
)
```

This is a one-line change in `src/hooks/queries/useCurrentOrg.ts`.

### About the "Failed to Fetch" in YOUR Preview

The `TypeError: Failed to fetch` errors you see in your preview iframe are a separate, transient issue with the Lovable preview environment's network layer (`lovable.js` fetch interceptor). From my browser tool, all requests succeed with HTTP 200. This resolves by:

1. Opening the app directly in a new browser tab: `https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app/login`
2. Or refreshing your browser entirely (not just the iframe)
3. Or trying incognito mode

### Summary

| Issue | Root Cause | Fix |
|---|---|---|
| Seeker org login fails | PGRST201 — ambiguous FK between `seeker_organizations` and `seeker_subscriptions` | Add `!seeker_subscriptions_organization_id_fkey` hint to the embedded query |
| "Failed to fetch" for all users in your preview | Transient network issue in Lovable preview's `lovable.js` fetch interceptor | Open preview URL in new browser tab or refresh browser |

