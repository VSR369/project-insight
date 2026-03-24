
# Governance Cleanup — COMPLETED

## What was done

### SQL Migration (Part A)
- ✅ Dropped old CHECK constraints on `seeker_organizations` and `role_conflict_rules`
- ✅ Migrated data: `LIGHTWEIGHT` → `QUICK`, `ENTERPRISE` → `STRUCTURED` (disabled trigger during migration)
- ✅ Added new constraints enforcing `QUICK/STRUCTURED/CONTROLLED`
- ✅ Deleted old `ENTERPRISE_ONLY` conflict rules, inserted 14 new rules for STRUCTURED and CONTROLLED modes
- ✅ Replaced 8 SQL functions with backward-compat mode mapping at top of each

### Frontend (Part B)
- ✅ Renamed `isLightweight` → `isQuick` across 18 files
- ✅ Renamed `isEnterpriseGrade` → `isStructuredOrAbove` (deprecated alias kept)
- ✅ Updated GovernanceProfileBadge test (11 tests, all passing)
- ✅ Updated 3 edge functions: `setup-test-scenario`, `seed-cogni-master`, `check-sla-breaches`
- ✅ Renamed internal constants: `PROBLEM_MIN_LIGHTWEIGHT` → `PROBLEM_MIN_QUICK`, etc.

## Result
Zero `isLightweight` variables remain. All governance logic uses QUICK/STRUCTURED/CONTROLLED. Legacy `LIGHTWEIGHT`/`ENTERPRISE` DB values are mapped via backward-compat in `resolveGovernanceMode()` and SQL functions.
