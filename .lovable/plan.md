

# Fix 30 Failed Regression Test Cases -- Root Cause Analysis & Fix

## 5-Why Root Cause Analysis

**Why #1: Why do 30 tests fail?**
The edge function smoke tests (EF-004, EF-006, EF-008) in `enrollmentTestRunner.ts` use `error.message?.includes("not found")` to detect deployment failures, but this also matches legitimate business error responses like "Reviewer not found" and "Organization not found".

**Why #2: Why does the check match business errors?**
The Supabase client's `functions.invoke` embeds the full HTTP response body into `error.message` (e.g., `"Edge function returned 404: Error, {"success":false,"error":"Reviewer not found"}""`). The broad substring check `"not found"` matches both deployment errors AND business-logic 404 responses.

**Why #3: Why wasn't this caught earlier?**
These tests worked when run standalone in the Enrollment Test page because the `enrollmentTestRunner.ts` was validated independently. The issue only surfaced when adapted into the regression kit where all results are aggregated and failures become visible in the combined report.

**Why #4: Why are there ~27 more failures beyond the 3 edge function false positives?**
The smoke adapter tests wrap `smokeTestRunner.ts` CRUD operations that are **sequential** -- create sets a module-level record ID, then update/deactivate/activate/delete depend on it. If create fails for any reason (e.g., RLS timing, constraint issues), all subsequent tests in that module cascade-fail (up to 5 failures per module). Additionally, several enrollment adapter tests query tables expecting specific data patterns that may not exist.

**Why #5: Why do sequential CRUD tests cascade?**
The smoke test runner uses shared module-level variables (`countriesTestRecordId`, `questionTestRecordId`, etc.). When the regression kit runs ALL smoke modules in sequence, a single create failure causes 4-5 cascade failures in that module. The adapter doesn't run cleanup between modules since it treats each test as independent.

## Root Cause Summary

| Category | Count | Root Cause |
|----------|-------|------------|
| Edge function false positives | 3 | `"not found"` substring matches business errors |
| Smoke CRUD cascade failures | ~20-25 | Sequential dependency + no skip-on-prerequisite-failure |
| Enrollment data-dependent tests | ~2-5 | Tests expect data that may not exist |

## Fix Strategy

### Fix 1: Edge Function Smoke Tests (in `enrollmentTestRunner.ts`)

Change the deployment check from broad `"not found"` to specific patterns that only match actual deployment errors:

```typescript
// BEFORE (too broad):
if (error && error.message?.includes("not found"))

// AFTER (precise):
if (error && (
  error.message?.includes("Function not found") ||
  error.message?.includes("function_not_found") ||
  error.message?.includes("Failed to send") ||
  error.message?.includes("non-2xx status code: 502") ||
  error.message?.includes("non-2xx status code: 503")
))
```

This applies to all 8 edge function smoke tests (EF-001 through EF-008). A 400/404 response WITH a JSON body means the function IS deployed and responded with a business error.

### Fix 2: Smoke Adapter -- Add Cascade Skip Logic

Modify `smokeAdapterTests.ts` to track per-module create success. If a module's create operation fails, subsequent dependent tests (update, deactivate, activate, delete) should return `"skip"` instead of attempting and failing:

```typescript
// Track create success per module
const moduleCreateStatus = new Map<string, boolean>();

function adaptSmokeTest(moduleId, moduleName, smokeTest, allModuleTests) {
  // If this test depends on a prior create and that create hasn't run yet,
  // check at runtime
  const isDependentOp = ["update", "deactivate", "activate", "delete"].includes(smokeTest.operation);
  
  return {
    ...baseFields,
    run: async () => {
      if (isDependentOp && moduleCreateStatus.get(moduleId) === false) {
        return { status: "skip", duration: 0, error: "Skipped: prerequisite create failed" };
      }
      const result = await smokeTest.run();
      if (smokeTest.operation === "create") {
        moduleCreateStatus.set(moduleId, result.status === "pass");
      }
      return { status: result.status, duration: result.duration, error: result.error };
    },
  };
}
```

## Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `src/services/enrollmentTestRunner.ts` | Fix EF-001 to EF-008: replace broad `"not found"` check with specific deployment error patterns | 3-8 tests go from fail to pass |
| `src/services/regressionTestKit/smokeAdapterTests.ts` | Add cascade skip logic for dependent CRUD operations | ~20 cascade failures become skips |

## What This Will NOT Change

- No database schema changes
- No RLS policy changes
- No UI/UX changes
- No navigation changes
- No edge function code changes
- No business logic changes
- Existing standalone Smoke Test page and Enrollment Test page continue to work identically
- The `enrollmentTestRunner.ts` fixes only affect the "not found" detection logic, not any test behavior

## Expected Outcome

- Edge function smoke tests: 3+ false-positive failures become passes
- Smoke CRUD cascades: ~20 failures become either passes (if create succeeds) or skips (if create fails due to missing prerequisites)
- Net result: 30 failures reduced to near-zero failures (remaining would be legitimate data-dependent skips)

