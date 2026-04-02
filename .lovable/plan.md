

# Fix: Demo Roles All Showing Creator Screens

## Problem

When logging in as different demo roles (Curator, Legal, Evaluator, Finance), all users see Creator (CR) screens and navigation instead of their role-specific UX. Two root causes:

### Root Cause 1: Legacy Role Codes Not Resolved
The seed function (`setup-test-scenario`) assigns legacy role codes like `CA`, `ID`, `AM`, `RQ` to `user_challenge_roles`. But `useCogniUserRoles.ts` reads raw codes from the database and adds them to `allRoleCodes` without mapping through `resolveRoleCode()`. Since `ROLE_PRIORITY` only contains modern codes (`CR`, `CU`, `ER`, `LC`, `FC`), legacy codes like `CA` and `ID` are filtered out in `CogniRoleContext`, leaving the set empty.

### Root Cause 2: Empty Roles Default to CR
When `allRoleCodes` is empty (because legacy codes were filtered out), line 51-53 of `useCogniUserRoles.ts` unconditionally adds `CR` as a fallback. This means every user — Curator, Legal, Finance — gets Creator navigation and screens.

## Plan

### Step 1: Resolve legacy codes in `useCogniUserRoles.ts`
**File:** `src/hooks/cogniblend/useCogniUserRoles.ts`

- Import `resolveRoleCode` from `@/types/cogniRoles`
- When building `allRoleCodes` from RPC results, run each code through `resolveRoleCode()` before adding to the Set
- Also resolve codes in each `row.role_codes` array so `challengeRoleMap` uses modern codes
- Remove the unconditional CR fallback (line 51-53). If the user genuinely has no challenge roles, the set should be empty — they should see the appropriate empty state, not a false CR workspace

### Step 2: Update seed scenario to use modern role codes
**File:** `supabase/functions/setup-test-scenario/index.ts`

- Replace legacy codes in the `new_horizon_demo` scenario:
  - `CA` → `CR` (Chris Rivera, Sam Solo)
  - `AM` → `CR` (Alex Morgan, Sam Solo)
  - `RQ` → `CR` (Alex Morgan, Sam Solo)
  - `ID` → `CU` (Dana Irving, Sam Solo)
- This ensures new seed runs produce modern codes. Existing seeded data will be fixed by Step 1's runtime resolution.

### Step 3: Update DemoLoginPage user definitions to match
**File:** `src/pages/cogniblend/DemoLoginPage.tsx`

- Update `buildDemoUsers()` to use modern role codes and correct destinations:
  - `nh-cr` already has `['CR']` — correct
  - `nh-cu` already has `['CU']` — correct, destination `/cogni/curation` — correct  
  - `nh-lc` already has `['LC']` — correct
  - `nh-er1`/`nh-er2` already have `['ER']` — correct
  - `nh-fc` already has `['FC']` — correct
  - `nh-solo` already has all roles — correct
- Remove the separate `nh-am` and `nh-rq` entries since AM/RQ map to CR (redundant with `nh-cr`)

### Step 4: Fix CurationQueuePage permission fallback
**File:** `src/pages/cogniblend/CurationQueuePage.tsx`

- The existing permission check (querying `user_challenge_roles` for `CU`) is correct and will work once legacy codes are resolved at the DB level (Step 2 for new seeds). For existing seeded data with legacy `CU` codes, the query already works since `CU` was never a legacy code — it's already modern.

### Step 5: Redeploy edge function
- The `setup-test-scenario` edge function must be redeployed after the code change so re-seeding produces correct modern codes.

## Technical Details

**Key mapping (legacy → modern):**
- `AM` (Admin/Manager) → `CR` (Creator)
- `RQ` (Requestor) → `CR` (Creator)  
- `CA` (Challenge Architect) → `CR` (Creator)
- `ID` (Innovation Director) → `CU` (Curator)

**Files changed:** 3 source files + 1 edge function
- `src/hooks/cogniblend/useCogniUserRoles.ts` — resolve legacy codes, remove CR fallback
- `src/pages/cogniblend/DemoLoginPage.tsx` — clean up demo user list
- `supabase/functions/setup-test-scenario/index.ts` — use modern codes
- Edge function redeployment required

