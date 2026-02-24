

## Diagnosis Complete: Two Separate Issues Identified

### Issue 1: Your account (`vsr@btbt.co.in`) — Invalid Credentials (HTTP 400)

When I tested your exact credentials (`vsr@btbt.co.in` / `Bulbul@1234`) from my browser tool, Supabase returned:

```
HTTP 400: {"code":"invalid_credentials","message":"Invalid login credentials"}
```

This means **the password is wrong** for this user account. The request reached Supabase successfully (no "Failed to fetch") and Supabase explicitly rejected the credentials. This is NOT a code bug — the password simply doesn't match what's stored in Supabase Auth.

**Fix:** Reset the password for `vsr@btbt.co.in` in the Supabase Auth dashboard, or use the "Forgot password?" link on the login page.

### Issue 2: "Failed to fetch" in YOUR preview iframe — Lovable Preview Network Issue

The `TypeError: Failed to fetch` errors you see in your preview iframe originate from `lovable.js:1:2838` — the Lovable preview environment's fetch interceptor. The request never leaves your browser.

**Proof this is NOT a code bug:**
- I just tested `admin@test.local` login from my browser tool → **HTTP 200, Admin Dashboard rendered perfectly** (screenshot captured above)
- Previously tested `seeker@test.local` → **HTTP 200, Org Dashboard rendered correctly**
- Auth logs confirm: when requests DO reach Supabase, they succeed for valid test accounts
- Your preview's network log shows the request to Supabase had `Error: Failed to fetch` — meaning the browser couldn't even establish the connection

### What YOU Need to Do

1. **Open the app directly in a NEW browser tab** (not the Lovable preview iframe):
   `https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app/login`

2. **Try logging in with test accounts first** to confirm the system works:
   - Admin: `admin@test.local` / `Admin123!`
   - Provider: `provider@test.local` / `Provider123!`
   - Reviewer: `reviewer@test.local` / `Reviewer123!`
   - Seeker Org: `seeker@test.local` / `Seeker123!`

3. **For your personal account** (`vsr@btbt.co.in`): Reset the password via the Supabase dashboard or use "Forgot password?" on the login page.

### Why the Lovable Preview Iframe Sometimes Fails

The Lovable editor embeds your app in an iframe with a fetch interceptor (`lovable.js`). This interceptor can occasionally lose connection to the proxy layer, causing ALL fetch requests to fail with `TypeError: Failed to fetch`. This is:
- **Not caused by your code** (same code works from other browser sessions)
- **Not caused by Supabase** (auth logs show zero requests arrived during your failed attempts)
- **Transient** — refreshing or opening in a new tab resolves it

### No Code Changes Needed

The application code is working correctly. All previous fixes (FK disambiguation in `useCurrentOrg.ts`, RLS policies) are in place and verified. The two issues are:
1. Wrong password for `vsr@btbt.co.in` → reset password
2. Preview iframe network glitch → open in new tab

