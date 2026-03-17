

# Plan: Fix CogniBlend 404 Errors on Sidebar Menu Items

## Problem
The CogniBlend sidebar defines 14 navigation items, but only 3 routes are registered in `App.tsx` (`/cogni/dashboard`, `/cogni/curation`, `/cogni/challenges/*`). Clicking any other menu item results in a 404.

## Registered vs Missing Routes

| Sidebar Item | Path | Status |
|---|---|---|
| Dashboard | `/cogni/dashboard` | Exists |
| Submit Request | `/cogni/submit-request` | **Missing** |
| My Requests | `/cogni/my-requests` | **Missing** |
| Create Challenge | `/cogni/create-challenge` | **Missing** (but `/cogni/challenges/new` exists) |
| My Challenges | `/cogni/my-challenges` | **Missing** |
| Curation Queue | `/cogni/curation` | Exists |
| Approval Queue | `/cogni/approval` | **Missing** |
| Legal Documents | `/cogni/legal` | **Missing** |
| Review Queue | `/cogni/review` | **Missing** |
| Evaluation Panel | `/cogni/evaluation` | **Missing** |
| Selection & IP | `/cogni/selection` | **Missing** |
| Escrow Management | `/cogni/escrow` | **Missing** |
| Payment Processing | `/cogni/payments` | **Missing** |
| Browse Challenges | `/cogni/browse` | **Missing** |
| My Solutions | `/cogni/my-solutions` | **Missing** |
| My Portfolio | `/cogni/portfolio` | **Missing** |

## Solution

### 1. Create placeholder page components for all 13 missing routes
Create a reusable `CogniPlaceholderPage` component and 13 thin wrapper pages (one per route) under `src/pages/cogniblend/`. Each shows the page title, a brief description of what it will do, and a "Coming Soon" badge. This keeps the app navigable while features are built out.

### 2. Fix the Create Challenge sidebar path mismatch
The sidebar links to `/cogni/create-challenge` but the route is `/cogni/challenges/new`. Update the sidebar nav item path to match the existing route.

### 3. Register all new routes in App.tsx
Add all 13 routes inside the existing CogniShell `<Route>` block, lazy-loaded.

## Files to create/edit

| File | Action |
|---|---|
| `src/pages/cogniblend/CogniPlaceholderPage.tsx` | Create — reusable placeholder with title + description props |
| `src/App.tsx` | Edit — add 13 route entries inside the CogniShell auth guard block |
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | Edit — fix Create Challenge path from `/cogni/create-challenge` to `/cogni/challenges/new` |

## Technical details

The placeholder component will accept `title` and `description` props and render a styled card with a "Coming Soon" indicator, matching the CogniBlend design language. Each route in App.tsx will use inline arrow functions to pass the correct props, keeping it simple without needing 13 separate files.

