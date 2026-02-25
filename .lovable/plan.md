

## Plan: Fix Seeker Organization Test Failures (4 Tests)

### Problem

Four seeker platform tests fail due to PostgreSQL `NUMERIC` type handling. PostgREST returns `NUMERIC` columns as strings (e.g., `"8.00"` instead of `8`). The tests use strict equality (`!==`) which fails when comparing a string to a number.

### Affected Tests

| Test ID | Line | Issue |
|---------|------|-------|
| TC-M1-044 | 218 | `data.discount_percentage !== 8` — value is `"8.00"` |
| TC-M1-045 | 231 | `data.discount_percentage !== 17` — value is `"17.00"` |
| TC-M6-001 | 443 | Same comparison + arithmetic on string `"8.00"` produces wrong result |
| TC-M6-002 | 459 | Same comparison + arithmetic on string `"17.00"` produces wrong result |

### Fix (Single File Change)

**File:** `src/services/regressionTestKit/seekerPlatformTests.ts`

Wrap all `discount_percentage` reads with `Number()` coercion before comparison and arithmetic:

1. **TC-M1-044 (line 218):** Change `data.discount_percentage !== 8` to `Number(data.discount_percentage) !== 8`
2. **TC-M1-045 (line 231):** Change `data.discount_percentage !== 17` to `Number(data.discount_percentage) !== 17`
3. **TC-M6-001 (lines 443-446):** Wrap `data.discount_percentage` with `Number()` for both the comparison and the arithmetic calculation
4. **TC-M6-002 (lines 459-462):** Same `Number()` wrapping for comparison and arithmetic

### Impact Assessment

- **Zero production impact.** All changes are in test assertion code only.
- No database, RLS, edge function, UI, or service layer changes.
- The test kit is read-only — it never writes data.

### Technical Detail

PostgreSQL `NUMERIC` type is an arbitrary-precision decimal. PostgREST serializes it as a JSON string (e.g., `"8.00"`) to preserve precision. JavaScript's `Number()` safely converts these to IEEE 754 doubles for comparison and arithmetic. The `months` column is `INTEGER` and already returns as a number, so no fix is needed there.

