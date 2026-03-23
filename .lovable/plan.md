
# Fix: AM → CA Data Flow + Demo Data Cleanup — COMPLETED

## Changes Made

### 1. DB Migration — CA/CR Role Equivalence ✅
- Created `roles_equivalent(p_required, p_actual)` function treating CR↔CA as interchangeable
- Updated `can_perform()` to use `roles_equivalent()` instead of exact match
- Updated `get_user_dashboard_data()` to use `roles_equivalent()` for needs_action routing

### 2. Edge Function Cleanup Order Fixed ✅
- Added cascading deletes: `audit_trail → sla_timers → cogni_notifications → challenge_legal_docs → challenge_package_versions → challenge_qa → user_challenge_roles → challenges`
- Prevents FK constraint violations that silently blocked old data cleanup

### 3. CA Login Destination Fixed ✅
- Chris Rivera (CA) now lands on `/cogni/dashboard` instead of `/cogni/challenges/create`

## Next Steps
- Re-seed the demo scenario via the Seed button on `/cogni/demo-login`
- Login as Chris (CA) → should see "Predictive Maintenance" in dashboard needs_action
