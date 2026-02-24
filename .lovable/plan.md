

## Root Cause Analysis: "Failed to Fetch" for ALL Users

### The Problem is NOT in the Code

I just tested the login flow myself using the browser tool — **admin login works perfectly**. The auth request returned HTTP 200, all role/data queries succeeded with 200, and the admin dashboard rendered correctly.

### What the Console Logs Actually Show

Every single error in your console is:
```
TypeError: Failed to fetch
  at window.fetch (https://cdn.gpteng.co/lovable.js:1:2838)
  at signInWithPassword(...)
```

Key detail: the error originates from `lovable.js` — the Lovable preview wrapper's fetch interceptor. The request **never reaches Supabase at all**. This is confirmed by:

1. **Auth logs are completely empty** for the time window of your attempts — zero requests arrived at Supabase
2. **When I tested from the browser tool**, the exact same login (`admin@test.local` / `Admin123!`) succeeded immediately with HTTP 200
3. **All four parallel data queries** (user_roles, solution_providers, panel_reviewers, org_users) also returned 200

### 5 WHY Analysis

| WHY | Answer |
|-----|--------|
| **WHY 1:** Why can't you log in? | The `signInWithPassword` call throws `TypeError: Failed to fetch` |
| **WHY 2:** Why does fetch fail? | The HTTP request never leaves the browser — it fails at the network level before reaching Supabase |
| **WHY 3:** Why does it fail at the network level? | The preview iframe's fetch wrapper (`lovable.js`) is intercepting and failing the request |
| **WHY 4:** Why is the fetch wrapper failing? | The Lovable preview iframe session has a stale or broken connection state — this is a known transient issue in the preview environment |
| **WHY 5:** Why does this affect ALL users? | Because the problem is at the network transport layer (before any user-specific code runs), not at the authentication or data layer |

### Evidence This is a Preview Environment Issue, Not a Code Bug

| Evidence | Detail |
|----------|--------|
| Auth logs empty | No requests reached Supabase — network failure before transport |
| Error origin | `lovable.js:1:2838` — Lovable's fetch interceptor, not app code |
| My test succeeded | Same credentials, same code, different browser session → works |
| All users affected equally | If it were a code/RLS bug, at least some user types would work |
| No Postgres errors | Zero error-severity entries in Postgres logs |

### Solution: Refresh the Preview

This is resolved by **refreshing the preview iframe**. There are no code changes needed.

**How to refresh:**
1. In the Lovable editor, click the refresh button on the preview panel (top of the preview iframe)
2. If that doesn't work, try opening the preview URL directly in a new browser tab: `https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app/login`
3. Try the login again after the page fully loads

### Previously Fixed Code Bug (Already Applied)

The `useCurrentOrg.ts` fix from the last edit (changing `org_subscriptions` to `seeker_subscriptions`) is correct and already applied. Once you can get past the transient network issue by refreshing, the seeking organization login should work properly.

### Pending: RLS Defense-in-Depth Policies

The two RLS policies proposed earlier (self-access on `org_users` and membership-based on `seeker_organizations`) are still recommended as defense-in-depth. These are not blocking login right now, but they make the system more resilient. They require a database migration to apply.

