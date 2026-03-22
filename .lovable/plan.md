
# Plan: Fix Demo Seed to Support Marketplace Model — ✅ COMPLETED

## Changes Made

### 1. `supabase/functions/setup-test-scenario/index.ts`
- Added `nh-am@testsetup.dev` (Alex Morgan, roles: `["AM"]`) to the `new_horizon_demo` users list
- Updated Sam Solo's roles to include both `AM` and `RQ`

### 2. `src/pages/cogniblend/DemoLoginPage.tsx`
- Updated `handleLogin` to also select `organization_id` from `org_users`
- After login, syncs the org's `operating_model` to match the selected engagement model (MP or AGG)

### 3. Edge function redeployed
