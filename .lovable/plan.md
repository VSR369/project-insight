

# Integrate Master Data Portal Performance Testing Kit into Regression Test Suite

## Overview

The uploaded `master-data-portal-testing-kit.jsx` is a standalone reference component with 4 diagnostic categories (Supabase Query, React Rendering, Network/Bundle, Lovable-specific) containing 18 static test descriptions with code samples and a 10-item checklist. This plan converts the applicable diagnostics into **runnable automated tests** within the existing `src/services/regressionTestKit/` framework.

## What Can Be Automated vs. What Cannot

The uploaded kit contains two types of content:

| Type | Count | Automatable? |
|------|-------|-------------|
| Supabase query pattern checks (select star, pagination, N+1, indexes, RLS) | 5 | Yes -- query hooks can be validated via code pattern or live query checks |
| React rendering diagnostics (re-renders, suspense, caching, virtualization) | 4 | Partially -- React Query usage and cache config can be validated at runtime |
| Network/Bundle diagnostics (bundle size, code splitting, client singleton, subscription leaks) | 4 | Partially -- Supabase client singleton and subscription cleanup can be checked |
| Lovable-specific prompt templates | 5 | No -- these are reference prompts, not testable assertions |
| Quick checklist items | 10 | Most overlap with the above categories |

## New Test File

Create `src/services/regressionTestKit/performanceDiagnosticTests.ts` with test prefix `PD-xxx` (Performance Diagnostics).

### Test Cases (18 total)

**Category 1: Supabase Query Diagnostics (PD-001 to PD-006)**

| ID | Test | What It Does |
|----|------|-------------|
| PD-001 | Select-star audit on master data hooks | Imports key query hooks and runs sample queries, checking that response payloads don't exceed expected column counts for list views |
| PD-002 | Pagination presence on list queries | Queries several master data tables without `.range()` to verify the hooks enforce limits (checks row count is capped) |
| PD-003 | Foreign key join validation | Queries tables with known FK relationships (e.g., `proficiency_areas` -> `industry_segments`) and verifies nested data is returned in a single call |
| PD-004 | RLS policy existence check | Queries `pg_policies` via RPC or direct query to verify RLS is enabled on key tenant-scoped tables |
| PD-005 | Index existence on common filter columns | Queries `pg_indexes` to verify indexes exist on `tenant_id`, `is_active`, `lifecycle_status` columns of key tables |
| PD-006 | Supabase client singleton check | Verifies that importing `@/integrations/supabase/client` returns the same reference (not re-instantiated) |

**Category 2: React Query & Caching Diagnostics (PD-007 to PD-010)**

| ID | Test | What It Does |
|----|------|-------------|
| PD-007 | React Query provider exists | Checks that `QueryClient` is accessible (the test runner itself uses React Query, so this validates the setup) |
| PD-008 | Master data staleTime configuration | Verifies that reference data hooks use `staleTime >= 5 minutes` by checking the query cache defaults |
| PD-009 | Soft-delete filter enforcement | Queries tables with `is_deleted` or `is_active` columns and verifies the default hooks filter correctly |
| PD-010 | Cache invalidation on mutation | Runs a no-op query then checks that the query key structure follows the `['entity', { filters }]` convention |

**Category 3: Data Quality & Schema Diagnostics (PD-011 to PD-015)**

| ID | Test | What It Does |
|----|------|-------------|
| PD-011 | Audit fields present on business tables | Queries `information_schema.columns` to verify `created_at`, `updated_at`, `created_by`, `updated_by` exist on key tables |
| PD-012 | UUID primary keys validation | Verifies key tables use UUID primary keys (not serial/integer) |
| PD-013 | Foreign key constraints exist | Queries `information_schema.table_constraints` to verify FK constraints on known relationship columns |
| PD-014 | Select-star occurrence scan | Runs a sample of the actual hooks' queries and counts returned columns vs expected list-view columns |
| PD-015 | Subscription tier features data integrity | Verifies all 3 tiers have features configured and `access_type` values are valid |

**Category 4: Performance Baseline (PD-016 to PD-018)**

| ID | Test | What It Does |
|----|------|-------------|
| PD-016 | Master data query response time | Times queries to core tables (countries, industry_segments, etc.) and fails if any exceed 500ms |
| PD-017 | Pricing overview data load time | Times the full pricing overview data fetch (all hooks) and fails if it exceeds 2 seconds total |
| PD-018 | Bulk query URL length safety | Verifies that `.in()` filter arrays in the codebase don't exceed 50 items per batch |

## Integration with Existing Framework

### Types Update (`types.ts`)

- Add `"performance"` to `TestModule` type
- Add `PD` prefix to `TEST_PREFIXES`
- Add `"Performance"` to `MODULE_DISPLAY_NAMES`

### Index Update (`index.ts`)

- Import and wire up `performanceDiagnosticTests` alongside the existing 9 test modules
- Add to `getAllTestCategories()`, `getAllTests()`, `getTotalTestCount()`, and `getTestCountsByCategory()`

## Files Changed

| File | Action |
|------|--------|
| `src/services/regressionTestKit/performanceDiagnosticTests.ts` | **New** -- 18 test cases in 4 categories |
| `src/services/regressionTestKit/types.ts` | **Modify** -- Add `performance` module, `PD` prefix |
| `src/services/regressionTestKit/index.ts` | **Modify** -- Import and wire up performance diagnostics |

## What Is NOT Included

The following items from the uploaded kit are **not converted to automated tests** because they require manual browser-based verification or are prompt templates:

- Bundle size analysis (requires build tooling, not runtime)
- React DevTools Profiler checks (manual only)
- Route-based code splitting verification (build-time)
- The 5 Lovable.dev prompt templates (reference documentation, not tests)
- WebSocket leak detection (requires sustained runtime observation)

These remain available as reference documentation in the original uploaded file.

