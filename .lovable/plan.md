

# Quick Role-Switch for Testing

## Problem
You're seeing a blank page on `/cogni/lc-queue` — likely a stale/expired session. To test as Curator, you need to go through the full demo login flow each time you switch roles.

## Current Testing Options (No Code Changes Needed)

**Option A — Use the "Switch Role" FAB button:**
Every CogniBlend page has a floating blue "Switch Role" button at the bottom-right corner. Click it to go to `/cogni/demo-login` and pick a different role (e.g., Casey Underwood for Curator). This already exists in `CogniShell.tsx` (line 94-101).

**Option B — Direct URL:**
Navigate to `/cogni/demo-login` in your browser, then click the Curator card.

## Proposed Enhancement: Inline Role Quick-Switcher

Add a lightweight **dev-only quick-switch dropdown** directly in the CogniShell top bar that lets you switch demo users instantly without navigating away from the current page.

### How it works
1. Add a new component `DevRoleSwitcher.tsx` in `src/components/cogniblend/shell/`
2. It renders a dropdown listing all 7 demo users with their role badges
3. Clicking a user triggers: sign out → sign in as that user → reload current page
4. Only renders when `window.location.hostname` includes `lovableproject.com` or `localhost` (dev-only guard)
5. Placed in `CogniTopBar` next to the existing `RoleSwitcher`

### Files to create/edit
- **Create:** `src/components/cogniblend/shell/DevRoleSwitcher.tsx` (~80 lines)
  - Imports the same `getDemoUsers` list and `TEST_PASSWORD` from DemoLoginPage (will need to export them)
  - Renders a dropdown with user cards
  - On click: `supabase.auth.signOut()` → `signInWithPassword()` → set `cogni_active_role` → `window.location.reload()`
- **Edit:** `src/pages/cogniblend/DemoLoginPage.tsx` — Export `getDemoUsers` and `TEST_PASSWORD`
- **Edit:** `src/components/cogniblend/shell/CogniTopBar.tsx` — Add `<DevRoleSwitcher />` next to RoleSwitcher

### Safety
- Dev-only: hostname check ensures it never appears in production
- No changes to auth guards, routing, or main business logic
- Uses the same login mechanism as the existing demo login page

