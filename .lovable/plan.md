

# Fix: Public HomePage as Entry Point with Dev Tools Access

## Problem
1. Root `/` redirects unauthenticated users to `/login` — the public HomePage at `/home` is unreachable by default
2. The `DevEnvironmentModal` component exists but is never rendered anywhere — testers landing on the homepage have no way to quick-login as demo users
3. Once a tester logs in via Dev Tools, there's no way back to the homepage without manually typing `/home`

## Changes

### 1. RoleBasedRedirect — redirect unauthenticated to `/home`
**File:** `src/components/routing/RoleBasedRedirect.tsx` (line 34)
- Change `navigate('/login', { replace: true })` → `navigate('/home', { replace: true })`

### 2. HomePage — add DevEnvironmentModal
**File:** `src/pages/public/HomePage.tsx`
- Import and render `<DevEnvironmentModal />` at the bottom of the page
- This gives the floating "Dev Tools" button on the public homepage (dev/preview only)
- The modal already has quick-login for all demo users + screen navigation

### 3. HeroSection — add navigation buttons
**File:** `src/components/public/HeroSection.tsx`
- Add a "Sign In" button linking to `/login` so visitors can still reach the login page
- Add a "Browse Challenges" button linking to `/browse-challenges`

These three changes ensure: visitors land on the homepage → can access Dev Tools for testing → can navigate to login → after login, role-based redirect sends them to the correct portal → and portal navigation includes a way back to `/home`.

