

# Plan: Add CogniBlend Portal Access from Main Login

## Problem
The CogniBlend portal has a dedicated login page at `/cogni/login`, but there is no way for users to discover or navigate to it. The main login page at `/login` only shows 4 portal tabs (Provider, Reviewer, Admin, Organization) — no CogniBlend option. Users with CogniBlend challenge roles (CR, CU, ID, ER, etc.) have no entry point.

## What needs to change

### 1. Add "CogniBlend" tab to the main Login page (`src/pages/Login.tsx`)
- Add a 5th portal tab: **CogniBlend** with a distinctive icon (e.g., `Lightbulb` or `Sparkles`), teal/blue color scheme
- When selected, the form submits credentials and on success navigates to `/cogni/dashboard` instead of the standard portal redirect
- The portal type `'cogniblend'` would be added to the PortalType union

### 2. Update RoleBasedRedirect (`src/components/routing/RoleBasedRedirect.tsx`)
- Add a check: if user has records in `user_challenge_roles`, include `'cogniblend'` as a valid portal
- Add `cogniblend` to the priority chain (after Organization, before falling back to Provider)
- Map `cogniblend → '/cogni/dashboard'` in `PORTAL_ROUTES`

### 3. Add CogniBlend to the session portal cache
- Support `'cogniblend'` in `sessionStorage.getItem('activePortal')` validation
- On sign-out, clear it (already handled generically)

### 4. Cross-link from CogniBlend login page
- The existing `/cogni/login` page already works standalone. Add a "Back to main login" link for users who land there by mistake.

## Files to modify
| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Add CogniBlend tab + redirect logic |
| `src/components/routing/RoleBasedRedirect.tsx` | Add cogniblend portal detection + route |

## Files NOT modified (as instructed)
All existing code remains untouched. Changes are additive only (new tab entry in array, new condition branches).

