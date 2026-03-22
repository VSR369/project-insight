

# Plan: Remove Redundant "My Requests" Nav Link + Hide SOLVER Section for Seeking Org Roles

## Problem

1. **"My Requests" sidebar link is redundant** — The dashboard already shows "My Requests" as Section 1. Having a separate nav item and dedicated page (`/cogni/my-requests`) duplicates the same data.

2. **SOLVER section visible to all users** — The three Solver items (Browse Challenges, My Solutions, My Portfolio) have `requiredRoles: []`, meaning they show for everyone. Seeking org roles (AM, CR, CA, RQ, CU, ID, ER, LC, FC) are not solvers and should never see these items.

## Changes

### 1. Remove "My Requests" from sidebar navigation
**File**: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

Remove the `My Requests` entry from the CHALLENGES section items array (line 43). The dashboard already covers this data.

### 2. Remove "My Requests" from shell breadcrumb map
**File**: `src/components/cogniblend/shell/CogniShell.tsx`

Remove the `/cogni/my-requests` entry from the breadcrumb title map.

### 3. Remove the `/cogni/my-requests` route
**File**: `src/App.tsx`

Remove the route definition for `/cogni/my-requests` that renders `CogniMyRequestsPage`. The `/cogni/my-requests/:id/view` route for the AM read-only brief stays.

### 4. Hide SOLVER section from seeking org roles
**File**: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

The Solver items currently use `requiredRoles: []` which makes them visible to everyone. Change to use a dedicated solver role code (e.g., `'SV'`) or add explicit logic: if the user's roles are exclusively from the seeking-org set (`AM, CR, CA, RQ, CU, ID, ER, LC, FC`), hide the entire SOLVER section. The simplest approach: give solver items `requiredRoles: ['SV']` and only users with a solver role assignment will see them. If no solver role system exists yet, gate visibility by checking that the user has **none** of the seeking-org roles (i.e., they are a pure solver).

### 5. Clean up ROLE_NAV_RELEVANCE
**File**: `src/types/cogniRoles.ts`

Remove `/cogni/my-requests` from the AM relevance paths since the route no longer exists. Remove solver paths from seeking-org role relevance maps.

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | Remove "My Requests" item; hide SOLVER section for seeking org roles |
| `src/components/cogniblend/shell/CogniShell.tsx` | Remove breadcrumb entry |
| `src/App.tsx` | Remove `/cogni/my-requests` route |
| `src/types/cogniRoles.ts` | Clean up relevance paths |

