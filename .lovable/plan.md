

# Fix: Seeker Org Test Button Race Condition

## Problem

When clicking the "Seeking Org" quick login button, two things happen simultaneously:
1. `setSelectedRole('organization')` is called (but React hasn't applied it yet)
2. `form.handleSubmit(onSubmit)()` runs immediately

Since React state updates are asynchronous, `selectedRole` is still `'provider'` when `onSubmit` executes. The seeker user also has a provider record, so the system thinks they want the Provider portal and sends them to `/pulse/feed`.

## Solution

Pass the intended portal directly to `onSubmit` instead of relying on React state. This ensures the correct portal is used even when state hasn't updated yet.

## Changes

### File: `src/pages/Login.tsx`

1. **Update `onSubmit` signature** to accept an optional `portalOverride` parameter:
   - `const onSubmit = async (data: LoginFormData, portalOverride?: PortalType)`
   - Use `portalOverride ?? selectedRole` wherever `selectedRole` is referenced inside `onSubmit`

2. **Update test account click handler** (line ~550) to pass the portal directly:
   - Change from: `form.handleSubmit(onSubmit)()`
   - Change to: `form.handleSubmit((data) => onSubmit(data, account.portal))()`

No other files change. No database changes needed.

## Technical Detail

The `onSubmit` function currently reads `selectedRole` from component state in 3 places:
- Line 277: `selectedRole === 'provider'` (first-time provider check)
- Line 295-299: `canAccessSelected` validation
- Line 301: `let targetPortal = selectedRole`

All three will use `portalOverride ?? selectedRole` instead, guaranteeing the correct portal is used when clicking quick-login buttons.

