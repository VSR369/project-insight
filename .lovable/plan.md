

# Issue: MFA Guard Blocking Admin Login with 404

## What's Happening

The `MfaGuard` component (added as part of the RBAC remediation) enforces Multi-Factor Authentication for admin users. When admin@test.local logs in:

1. `AdminGuard` wraps routes with `<MfaGuard requireMfa={true}>`
2. MfaGuard checks if the user has a verified TOTP factor via `supabase.auth.mfa.listFactors()`
3. Since no MFA is enrolled, it shows "Multi-Factor Authentication Required" with a "Set Up MFA" button
4. That button navigates to `/settings/security` -- **which doesn't exist** (only `/settings` is a registered route)
5. Result: 404 page, admin is completely locked out

## Root Cause

The MfaGuard was implemented before an MFA setup page was created. The `/settings/security` route was never added to `App.tsx`, and the existing `/settings` page has no MFA enrollment UI.

## Fix (2 parts)

### Part 1: Stop MFA from blocking access (immediate)
Change `MfaGuard` to use **graceful degradation** -- since there is no MFA enrollment infrastructure yet, the guard should warn but not block. Specifically:
- Change the default `requireMfa` to `false` in `AdminGuard.tsx` until MFA setup is built
- Or: make MfaGuard show a dismissible warning banner instead of a full-screen block

### Part 2: Create MFA Setup Page (proper fix)
- Add a `/settings/security` route in `App.tsx`
- Create a `SecuritySettingsPage` component with TOTP enrollment flow:
  - Call `supabase.auth.mfa.enroll({ factorType: 'totp' })` to get QR code
  - Display QR code for authenticator app scanning
  - Verify with 6-digit code via `supabase.auth.mfa.challengeAndVerify()`
  - Show enrolled factors with option to unenroll
- Once MFA setup page exists, re-enable `requireMfa={true}` in AdminGuard

### Recommended approach
Implement both parts: disable the blocking behavior immediately so admins can log in, and create the MFA settings page so the feature can be properly enabled later.

