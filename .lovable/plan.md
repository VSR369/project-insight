
# Plan: Fix Demo Login for All Engagement Models & Governance Modes — ✅ COMPLETED

## Changes Made

### 1. `supabase/functions/setup-test-scenario/index.ts`
- Added robust cascading cleanup: resolves all scenario user IDs from auth, deletes orphaned `org_users`, `user_roles`, and `user_challenge_roles` before org cleanup
- Added `sync_operating_model` action handler as fallback for RLS-blocked client updates
- Redeployed edge function

### 2. `src/pages/cogniblend/DemoLoginPage.tsx`
- Wrapped `operating_model` update in try-catch with edge function fallback
- Improved error message when org_users is missing: "Please click Seed Demo Scenario first"
- Non-fatal warning toast if sync fails entirely
