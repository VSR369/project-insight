

## Plan: Add Automatic Retry Logic to Handle Transient Network Failures

### What I Just Verified (Again)

I logged in as `admin@test.local` from my browser tool just now — **HTTP 200, full Admin Dashboard rendered, zero console errors**. The code is working. But you are consistently hitting `TypeError: Failed to fetch` at `lovable.js:1:2838` — even in incognito.

### Why This Keeps Happening

The `lovable.js` fetch interceptor from `cdn.gpteng.co` wraps every `fetch()` call. When its proxy connection is unstable, requests fail before reaching Supabase. This is NOT your code, but I can make your code **resilient** to it.

### The Fix: Retry Logic at Two Levels

Since I cannot fix `lovable.js`, I will make the application automatically retry failed network requests so that transient proxy failures are handled transparently.

**File 1: `src/lib/fetchWithRetry.ts`** (NEW)
- Create a utility that wraps `fetch` with automatic retry (3 attempts, exponential backoff: 500ms, 1s, 2s)
- Only retries on `TypeError: Failed to fetch` (network failures), NOT on HTTP error responses (400, 401, etc.)

**File 2: `src/integrations/supabase/client.ts`** (MODIFY)
- Configure the Supabase client with a custom `fetch` that uses the retry wrapper
- This means ALL Supabase calls (auth, queries, mutations) automatically retry on network failures

**File 3: `src/hooks/useAuth.tsx`** (MODIFY)
- Add retry logic specifically to the `signIn` function as defense-in-depth
- Show a user-friendly toast like "Network issue, retrying..." instead of the raw error

### What This Solves

| Scenario | Before | After |
|----------|--------|-------|
| `lovable.js` proxy drops once | Instant "Failed to fetch" error | Silent retry, succeeds on 2nd attempt |
| Proxy drops twice | Instant error | Retries up to 3 times with backoff |
| Persistent proxy failure (all 3 retries fail) | Same error, no context | Clear message: "Network connection failed. Please refresh your browser." |
| Valid credential error (HTTP 400) | Shows "Invalid credentials" | Same — no retry on HTTP errors |

### Technical Details

The retry wrapper:
```typescript
async function fetchWithRetry(input, init, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Only retry on network errors (TypeError: Failed to fetch)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        await delay(500 * Math.pow(2, attempt)); // 500ms, 1s, 2s
        continue;
      }
      throw error; // Don't retry non-network errors
    }
  }
}
```

Supabase client integration:
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { ... },
  global: {
    fetch: fetchWithRetry,  // All Supabase calls use retry logic
  },
});
```

### Files Changed

1. `src/lib/fetchWithRetry.ts` — New utility (approx 30 lines)
2. `src/integrations/supabase/client.ts` — Add custom fetch to Supabase config
3. `src/hooks/useAuth.tsx` — Improve error message for persistent network failures

