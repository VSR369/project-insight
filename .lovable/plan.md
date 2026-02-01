

## Root Cause Analysis

The issue is a **duplicate `PORTAL_ROUTES` constant** that wasn't synchronized when the RoleBasedRedirect.tsx was updated.

### The Problem

There are **TWO different locations** defining portal routes:

| Location | Line | Provider Route | Status |
|----------|------|---------------|--------|
| `src/components/routing/RoleBasedRedirect.tsx` | Line 8 | `/pulse/feed` | Updated |
| `src/pages/Login.tsx` | **Line 99-103** | `/dashboard` | **NOT UPDATED** |

### Code Evidence

**Login.tsx (Lines 99-103) - NOT UPDATED:**
```typescript
const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/dashboard',  // ← Still pointing to dashboard!
  reviewer: '/reviewer/dashboard',
};
```

**RoleBasedRedirect.tsx (Lines 8-12) - Already Updated:**
```typescript
const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/pulse/feed',  // ← Correctly updated
  reviewer: '/reviewer/dashboard',
};
```

### Login Flow Analysis

When a user logs in:
1. Login.tsx `onSubmit()` function handles authentication
2. After successful login, it uses **its own** `PORTAL_ROUTES` constant (Line 307)
3. This redirects providers to `/dashboard` instead of `/pulse/feed`

**The affected code path in Login.tsx (Line 307):**
```typescript
navigate(PORTAL_ROUTES[targetPortal], { replace: true });
```

### Why RoleBasedRedirect Doesn't Help

`RoleBasedRedirect` is only used:
- When visiting the root path (`/`)
- When a user is already logged in and needs routing

But when logging in fresh, the redirect happens **inside Login.tsx** directly, bypassing `RoleBasedRedirect` entirely.

---

## Fix Plan

### Change 1: Update Login.tsx PORTAL_ROUTES (Line 99-103)

**Current:**
```typescript
const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/dashboard',
  reviewer: '/reviewer/dashboard',
};
```

**Updated:**
```typescript
const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/pulse/feed',  // Industry Pulse is the gateway for all providers
  reviewer: '/reviewer/dashboard',
};
```

### Change 2: Also update fallback redirect (Line 310)

There's a fallback redirect at Line 310 that also hardcodes `/dashboard`:

**Current (Line 310):**
```typescript
navigate('/dashboard', { replace: true });
```

**Updated:**
```typescript
navigate('/pulse/feed', { replace: true });
```

---

## Additional Fix: Clear Stale Session Storage

The user may have a cached `activePortal` value in sessionStorage that still points to `/dashboard`. The fix includes:

1. When `activePortal` is `provider`, the redirect will now correctly go to `/pulse/feed`
2. User may need to clear browser sessionStorage or logout/login again to reset

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Login.tsx` | 101 | Change `provider: '/dashboard'` to `provider: '/pulse/feed'` |
| `src/pages/Login.tsx` | 310 | Change `navigate('/dashboard')` to `navigate('/pulse/feed')` |

---

## Testing Verification

After fix, verify:
1. Fresh login as provider → lands on `/pulse/feed`
2. Already logged in provider visiting `/login` → redirects to `/pulse/feed`
3. Dashboard still accessible via manual navigation or sidebar links
4. Admin and Reviewer logins unaffected

