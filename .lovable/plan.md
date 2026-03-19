

# Add Cross-Navigation Between Login Screens

## What

Add a link on each login page to navigate to the other:
- **CogniBlend Login** (`/cogni/login`): Add a link "Switch to Platform Login →" pointing to `/login`
- **Platform Login** (`/login`): Add a link "Switch to CogniBlend Login →" pointing to `/cogni/login`

## Changes

### 1. `src/pages/cogniblend/CogniLoginPage.tsx`
Add a navigation link below the form (after the sign-in button area, around line 270), styled consistently with the existing page:
```
Looking for the Platform login? → /login
```

### 2. `src/pages/Login.tsx`
Add a navigation link in the footer area (after the "Registering an organization?" link, around line 549):
```
Looking for CogniBlend login? → /cogni/login
```

Both links use `react-router-dom`'s `Link` component for client-side navigation. Minimal styling matching each page's existing design language.

