

## Fix Alt+Tab Data Loss — Corrected 3-Layer Defense

### Current State
- **Layer 3** (ChallengeCreatePage.tsx useRef guards): Already implemented (lines 49-78)
- **Layer 1** (useAuth.tsx — prevent cache wipe on token refresh): NOT implemented
- **Layer 2** (OrgContext.tsx — prevent tree unmount during refetch): NOT implemented

The form still loses data because Supabase fires `SIGNED_IN` on token refresh → `queryClient.clear()` runs unconditionally → OrgProvider unmounts children → form destroyed.

### Changes

**File 1: `src/hooks/useAuth.tsx` — Layer 1 (Root Cause)**

Add `previousUserIdRef` to skip `queryClient.clear()` when the user hasn't actually changed (token refresh = same user):

1. Add `previousUserIdRef = useRef<string | null>(null)` (line ~25)
2. In `onAuthStateChange` handler (line 50), replace the unconditional `queryClient.clear()` block with user-change detection:
   ```typescript
   if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
     const newUserId = newSession?.user?.id ?? null;
     const userChanged = newUserId !== previousUserIdRef.current;
     previousUserIdRef.current = newUserId;
     
     if (userChanged) {
       queryClient.clear();
       sessionStorage.removeItem('activeEnrollmentId');
       if (event === 'SIGNED_OUT') {
         sessionStorage.removeItem('activePortal');
         sessionStorage.removeItem('proofPoint.lastCategory');
         sessionStorage.removeItem('cogniblend_legal_gate_passed');
       }
     }
   }
   ```
3. **Critical Gap 1 fix**: In `getSession().then()` (line 68), seed the ref to prevent startup race:
   ```typescript
   previousUserIdRef.current = existingSession?.user?.id ?? null;
   ```
4. In `signOut()` (line 113): Remove the direct `queryClient.clear()` call — let the handler handle it uniformly via `SIGNED_OUT` event. Keep the `setUser(null)` / `setSession(null)` immediate clears and sessionStorage cleanup.

**File 2: `src/contexts/OrgContext.tsx` — Layer 2 (Defense-in-Depth)**

Prevent OrgProvider from unmounting the entire component tree during a brief refetch:

1. Add `useRef` to the import (line 7)
2. Add `orgLoadedOnce` ref inside `OrgProvider`:
   ```typescript
   const orgLoadedOnce = useRef(false);
   ```
3. After the hooks section, track successful load:
   ```typescript
   if (org) orgLoadedOnce.current = true;
   ```
4. Change the loading conditional (line 86) from:
   ```typescript
   if (isLoading || isAutoCreating)
   ```
   to:
   ```typescript
   if ((isLoading && !orgLoadedOnce.current) || isAutoCreating)
   ```
   This means: show spinner only on first load or during auto-creation. Once org has loaded once, keep rendering children during background refetches.

### Summary

| Layer | File | Fix | Prevents |
|-------|------|-----|----------|
| 1 (Root cause) | `useAuth.tsx` | `previousUserIdRef` + seed from `getSession()` | Cache wipe on token refresh |
| 2 (Defense) | `OrgContext.tsx` | `orgLoadedOnce` ref, conditional spinner | Tree unmount during refetch |
| 3 (Resilience) | `ChallengeCreatePage.tsx` | Already done | Governance/engagement reset |

### Technical Notes
- Gap 1 (startup race) is addressed by seeding `previousUserIdRef` in `getSession().then()`
- Gap 2 (Layer 3 missing) is already resolved in the current codebase
- Gap 3 (missing `useRef` import in OrgContext) is included
- Gap 4 (signOut double-clear) is cleaned up by removing the direct `queryClient.clear()` from `signOut()`

