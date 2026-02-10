

# Fix 35 Failed Regression Test Cases

## Root Cause Analysis

After thorough schema verification against all 6 native test files (181 tests), I identified the following categories of failures:

### Category 1: `question_bank` Schema Mismatch (7 tests)

The `question_bank` table does NOT have `is_deleted`, `deleted_at`, `deleted_by`, or `difficulty_level` columns. It uses `is_active` for soft delete and `difficulty` instead of `difficulty_level`.

| Test ID | Issue | Fix |
|---------|-------|-----|
| AP-007 | Queries `.eq("is_deleted", false)` | Change to `.eq("is_active", true)` |
| AP-010 | Queries `.eq("is_deleted", false)` | Change to `.eq("is_active", true)` |
| AP-026 | Selects `is_deleted, deleted_at, deleted_by` | Change to `is_active, updated_at, updated_by` |
| DI-006 | Queries `.eq("is_deleted", false)` and checks `speciality_id` | Change filter to `.eq("is_active", true)` |
| DI-009 | Queries `question_bank` with `is_deleted` assumption | Remove `is_deleted` filter, use `is_active` |

### Category 2: `reviewer_workload_distribution` View Column Mismatch (2 tests)

The view has columns: `id, name, email, expertise_level_ids, industry_segment_ids, interviews_30d, interviews_7d, days_since_last, workload_status, load_bucket`. Tests query non-existent `pending_count` and `completed_count`.

| Test ID | Issue | Fix |
|---------|-------|-----|
| RP-021 | Selects `pending_count, completed_count` | Change to `interviews_30d, interviews_7d, workload_status` |
| EF-015 | May fail due to `.select("*")` if RLS restricts | Already handles errors gracefully, likely passes |

### Category 3: `question_bank` Column Name Mismatch (1 test)

| Test ID | Issue | Fix |
|---------|-------|-----|
| AP-007 | Selects `difficulty_level` | Change to `difficulty` |

### Category 4: Duplicate Category Key (1 UI bug causing console warning)

Both `reviewerPortalTests.ts` and `roleAccessTests.ts` define a category with `id: "reviewer-rls"`. This causes React key collision in the Accordion.

| File | Fix |
|------|-----|
| `roleAccessTests.ts` line 755 | Change category id to `"ra-reviewer-rls"` |

### Category 5: Adapted Test Runners May Have Schema Issues

The adapter tests (`enrollmentAdapterTests.ts`, `pulseSocialAdapterTests.ts`, `smokeAdapterTests.ts`) wrap existing runners that were already validated. If those runners pass on their own pages, they should pass here too. However, the skips (52) are expected -- those are tests that require specific roles (e.g., `solution_provider`, `panel_reviewer`) that the logged-in platform admin user doesn't have.

### Category 6: Additional Potential Failures from Column Analysis

| Test ID | Issue | Fix |
|---------|-------|-----|
| CI-022 | Joins `question:question_bank(id)` -- FK exists but column `question_id` in `assessment_attempt_responses` references `question_bank`, so the Supabase auto-named relationship should work. Verify no issue. | No change needed |

## Summary of Failing Tests (Estimated 8-12 from native tests)

The 35 failures likely include:
- ~7 from `question_bank` schema mismatch (`is_deleted` vs `is_active`, `difficulty_level` vs `difficulty`)
- ~2 from `reviewer_workload_distribution` view column names
- ~1 from duplicate key causing rendering issues
- Remaining ~25 likely from the **adapted test runners** (enrollment/pulse/smoke) which may have their own schema issues when run through the adapter layer

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/regressionTestKit/adminPortalTests.ts` | Fix AP-007, AP-010, AP-026: replace `is_deleted` with `is_active`, `difficulty_level` with `difficulty` |
| `src/services/regressionTestKit/dataIntegrityTests.ts` | Fix DI-006, DI-009: replace `is_deleted` with `is_active` for `question_bank` queries |
| `src/services/regressionTestKit/reviewerPortalTests.ts` | Fix RP-021: update workload view column names |
| `src/services/regressionTestKit/roleAccessTests.ts` | Fix duplicate category id `"reviewer-rls"` to `"ra-reviewer-rls"` |

## Technical Details

### adminPortalTests.ts Changes

**AP-007** (line ~153-160):
```typescript
// Before: .eq("is_deleted", false) and selects "difficulty_level"
// After:  .eq("is_active", true) and selects "difficulty"
const { data, error } = await client
  .from("question_bank")
  .select("id, question_text, question_type, difficulty")
  .eq("is_active", true)
  .limit(20);
```

**AP-010** (line ~206-211):
```typescript
// Before: .eq("is_deleted", false)
// After:  .eq("is_active", true)
.eq("is_active", true)
```

**AP-026** (line ~578-583):
```typescript
// Before: selects "is_deleted, deleted_at, deleted_by"
// After:  selects "is_active, updated_at, updated_by"
.select("id, created_at, created_by, is_active, updated_at, updated_by")
```

### dataIntegrityTests.ts Changes

**DI-006** (line ~148-164):
```typescript
// Before: .eq("is_deleted", false)
// After:  .eq("is_active", true)
.eq("is_active", true)
```

**DI-009** (line ~228-241):
```typescript
// Before: queries question_bank assuming is_deleted
// After:  no filter needed or use is_active
const { data, error } = await supabase
  .from("question_bank")
  .select("id, question_text")
  .eq("is_active", true)
  .limit(10);
```

### reviewerPortalTests.ts Changes

**RP-021** (line ~588-593):
```typescript
// Before: .select("id, name, pending_count, completed_count")
// After:  .select("id, name, interviews_30d, interviews_7d, workload_status")
```

### roleAccessTests.ts Changes

**Duplicate key fix** (line 755):
```typescript
// Before: id: "reviewer-rls"
// After:  id: "ra-reviewer-rls"
```

## What This Will NOT Change
- No database schema changes
- No RLS policy changes
- No UI/UX changes
- No navigation changes
- No existing test runner modifications (smoke, enrollment, pulse runners untouched)
- No business logic changes

## Expected Outcome After Fix
- The 7-12 tests with schema mismatches will pass
- The 52 skipped tests remain skipped (expected -- role-specific tests run under platform_admin)
- Remaining failures from adapted runners need separate investigation if they persist

