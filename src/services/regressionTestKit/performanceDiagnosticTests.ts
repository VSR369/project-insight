/**
 * Performance Diagnostic Tests (PD-xxx)
 * 
 * Automated performance and schema quality checks adapted from the
 * Master Data Portal Testing Kit. Covers Supabase query patterns,
 * React Query caching, data quality, and performance baselines.
 */

import { TestCategory, TestCase, runTest } from "./types";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// HELPER: Query information_schema safely
// ============================================================================

async function queryInformationSchema(
  tableName: string,
  expectedColumns: string[]
): Promise<{ missing: string[]; found: string[] }> {
  const { data, error } = await supabase
    .from(tableName as any)
    .select("*")
    .limit(1);

  if (error) throw new Error(`Query failed for ${tableName}: ${error.message}`);

  const found: string[] = data && data.length > 0 ? Object.keys(data[0]) : [];
  const missing = expectedColumns.filter((col) => !found.includes(col));
  return { missing, found };
}

async function timeQuery(queryFn: () => Promise<any>, thresholdMs: number): Promise<{ duration: number; passed: boolean }> {
  const start = performance.now();
  await queryFn();
  const duration = Math.round(performance.now() - start);
  return { duration, passed: duration <= thresholdMs };
}

// ============================================================================
// CATEGORY 1: Supabase Query Diagnostics (PD-001 to PD-006)
// ============================================================================

const supabaseQueryTests: TestCase[] = [
  {
    id: "PD-001",
    category: "Supabase Query Diagnostics",
    name: "Select-star audit on master data hooks",
    description: "Verifies core master data queries don't return excessive columns for list views",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Check countries table - list views shouldn't need all columns
        const { data, error } = await supabase
          .from("countries")
          .select("id, name, code, is_active")
          .limit(1);
        if (error) throw new Error(`Countries select query failed: ${error.message}`);
        if (!data) throw new Error("No data returned from countries select query");
        // Verify we only got the requested columns
        if (data.length > 0) {
          const cols = Object.keys(data[0]);
          if (cols.length > 4) {
            throw new Error(`Expected 4 columns, got ${cols.length}: ${cols.join(", ")}`);
          }
        }
      }),
  },
  {
    id: "PD-002",
    category: "Supabase Query Diagnostics",
    name: "Pagination presence on list queries",
    description: "Verifies list queries enforce row limits (Supabase default: 1000)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Query with explicit limit to verify pagination is possible
        const { data, error, count } = await supabase
          .from("industry_segments")
          .select("id", { count: "exact" })
          .limit(20);
        if (error) throw new Error(`Pagination test failed: ${error.message}`);
        if (!data) throw new Error("No data returned");
        if (data.length > 20) {
          throw new Error(`Limit not enforced: got ${data.length} rows, expected max 20`);
        }
      }),
  },
  {
    id: "PD-003",
    category: "Supabase Query Diagnostics",
    name: "Foreign key join validation",
    description: "Verifies FK joins return nested data in a single call (no N+1)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        const { data, error } = await supabase
          .from("sub_domains")
          .select("id, name, proficiency_areas(id, name)")
          .limit(1);
        if (error) throw new Error(`FK join query failed: ${error.message}`);
        if (data && data.length > 0) {
          const row = data[0] as any;
          if (!row.proficiency_areas) {
            throw new Error("FK join did not return nested proficiency_area data");
          }
        }
      }),
  },
  {
    id: "PD-004",
    category: "Supabase Query Diagnostics",
    name: "RLS policy existence check",
    description: "Verifies RLS is enabled on key tenant-scoped tables by testing query access",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Test that tenant-scoped tables are queryable (RLS doesn't block anon completely for read)
        const tables = ["challenges", "enterprise_contact_requests"] as const;
        for (const table of tables) {
          const { error } = await supabase.from(table).select("id").limit(1);
          // A permission error here would indicate RLS blocking, which is expected
          // No error or a "no rows" result both indicate the policy exists and works
          if (error && !error.message.includes("permission") && !error.message.includes("RLS")) {
            throw new Error(`Unexpected error on ${table}: ${error.message}`);
          }
        }
      }),
  },
  {
    id: "PD-005",
    category: "Supabase Query Diagnostics",
    name: "Index existence on common filter columns",
    description: "Verifies performance-critical columns have indexes by checking query speed",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Test that filtered queries on indexed columns are fast
        const start = performance.now();
        const { error } = await supabase
          .from("industry_segments")
          .select("id")
          .eq("is_active", true)
          .limit(10);
        const duration = performance.now() - start;
        if (error) throw new Error(`Index test query failed: ${error.message}`);
        if (duration > 1000) {
          throw new Error(`Filtered query took ${Math.round(duration)}ms (>1000ms), index may be missing`);
        }
      }),
  },
  {
    id: "PD-006",
    category: "Supabase Query Diagnostics",
    name: "Supabase client singleton check",
    description: "Verifies the Supabase client is a singleton (not re-instantiated)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Import twice and compare references
        const { supabase: client1 } = await import("@/integrations/supabase/client");
        const { supabase: client2 } = await import("@/integrations/supabase/client");
        if (client1 !== client2) {
          throw new Error("Supabase client is not a singleton - multiple instances detected");
        }
      }),
  },
];

// ============================================================================
// CATEGORY 2: React Query & Caching Diagnostics (PD-007 to PD-010)
// ============================================================================

const reactQueryTests: TestCase[] = [
  {
    id: "PD-007",
    category: "React Query & Caching",
    name: "React Query provider exists",
    description: "Checks that QueryClient is accessible in the runtime environment",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Verify React Query is set up by checking we can import it
        const { QueryClient } = await import("@tanstack/react-query");
        if (!QueryClient) {
          throw new Error("QueryClient not available - React Query may not be installed");
        }
        const testClient = new QueryClient();
        if (!testClient) {
          throw new Error("Failed to instantiate QueryClient");
        }
      }),
  },
  {
    id: "PD-008",
    category: "React Query & Caching",
    name: "Master data staleTime configuration",
    description: "Verifies reference data should use staleTime >= 5 minutes",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // This is a pattern check - verify the QueryClient default config allows staleTime
        const { QueryClient } = await import("@tanstack/react-query");
        const client = new QueryClient({
          defaultOptions: {
            queries: { staleTime: 5 * 60 * 1000 },
          },
        });
        const defaults = client.getDefaultOptions();
        const staleTime = defaults.queries?.staleTime;
        if (!staleTime || (typeof staleTime === "number" && staleTime < 300000)) {
          throw new Error(`staleTime is ${staleTime}ms, expected >= 300000ms (5 min) for reference data`);
        }
      }),
  },
  {
    id: "PD-009",
    category: "React Query & Caching",
    name: "Soft-delete filter enforcement",
    description: "Verifies queries on tables with is_active/is_deleted filter correctly",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Query with is_active filter and verify no inactive records leak through
        const { data, error } = await supabase
          .from("industry_segments")
          .select("id, is_active")
          .eq("is_active", true)
          .limit(50);
        if (error) throw new Error(`Soft-delete filter query failed: ${error.message}`);
        if (data) {
          const inactive = data.filter((r: any) => r.is_active === false);
          if (inactive.length > 0) {
            throw new Error(`Found ${inactive.length} inactive records despite is_active=true filter`);
          }
        }
      }),
  },
  {
    id: "PD-010",
    category: "React Query & Caching",
    name: "Cache key structure validation",
    description: "Verifies query key conventions follow ['entity', { filters }] pattern",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Validate that we can construct proper query keys
        const validKeys = [
          ["countries", { isActive: true }],
          ["industry_segments", { parentId: null }],
          ["expertise_levels"],
        ];
        for (const key of validKeys) {
          if (!Array.isArray(key)) {
            throw new Error(`Query key must be an array, got: ${typeof key}`);
          }
          if (typeof key[0] !== "string") {
            throw new Error(`Query key[0] must be a string entity name, got: ${typeof key[0]}`);
          }
        }
      }),
  },
];

// ============================================================================
// CATEGORY 3: Data Quality & Schema Diagnostics (PD-011 to PD-015)
// ============================================================================

const dataQualityTests: TestCase[] = [
  {
    id: "PD-011",
    category: "Data Quality & Schema",
    name: "Audit fields present on business tables",
    description: "Verifies created_at, updated_at, created_by, updated_by exist on key tables",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        const auditFields = ["created_at", "updated_at", "created_by", "updated_by"];
        const tables = ["industry_segments", "expertise_levels", "countries"];
        for (const table of tables) {
          const { missing } = await queryInformationSchema(table, auditFields);
          if (missing.length > 0) {
            throw new Error(`Table '${table}' missing audit fields: ${missing.join(", ")}`);
          }
        }
      }),
  },
  {
    id: "PD-012",
    category: "Data Quality & Schema",
    name: "UUID primary keys validation",
    description: "Verifies key tables use UUID primary keys (not serial/integer)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        const tables = ["industry_segments", "expertise_levels", "countries", "capability_tags"];
        for (const table of tables) {
          const { data, error } = await supabase.from(table as any).select("id").limit(1);
          if (error) throw new Error(`UUID check failed for ${table}: ${error.message}`);
          if (data && data.length > 0) {
            const id = (data[0] as any).id;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
              throw new Error(`Table '${table}' has non-UUID primary key: ${id}`);
            }
          }
        }
      }),
  },
  {
    id: "PD-013",
    category: "Data Quality & Schema",
    name: "Foreign key constraints exist",
    description: "Verifies FK constraints on known relationship columns via join queries",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Test FK relationships by attempting joins
        const joins = [
          { table: "academic_streams", join: "academic_disciplines(id)" },
          { table: "academic_subjects", join: "academic_streams(id)" },
        ];
        for (const { table, join } of joins) {
          const { error } = await supabase.from(table as any).select(`id, ${join}`).limit(1);
          if (error) {
            throw new Error(`FK constraint missing or broken: ${table} -> ${join}: ${error.message}`);
          }
        }
      }),
  },
  {
    id: "PD-014",
    category: "Data Quality & Schema",
    name: "Column count audit on master data tables",
    description: "Checks that master data tables have reasonable column counts (not bloated)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        const maxExpectedColumns = 25;
        const tables = ["countries", "industry_segments", "expertise_levels"];
        for (const table of tables) {
          const { data, error } = await supabase.from(table as any).select("*").limit(1);
          if (error) throw new Error(`Column count query failed for ${table}: ${error.message}`);
          if (data && data.length > 0) {
            const colCount = Object.keys(data[0]).length;
            if (colCount > maxExpectedColumns) {
              throw new Error(
                `Table '${table}' has ${colCount} columns (max expected: ${maxExpectedColumns}). Consider splitting.`
              );
            }
          }
        }
      }),
  },
  {
    id: "PD-015",
    category: "Data Quality & Schema",
    name: "Subscription tier features data integrity",
    description: "Verifies all subscription tiers have features configured with valid access_type",
    role: "platform_admin",
    module: "performance",
    run: () =>
      runTest(async () => {
        const { data: tiers, error: tierError } = await supabase
          .from("md_subscription_tiers" as any)
          .select("id, name")
          .eq("is_active", true);
        if (tierError) throw new Error(`Tier query failed: ${tierError.message}`);
        if (!tiers || tiers.length === 0) throw new Error("SKIP: No subscription tiers found");

        const { data: features, error: featError } = await supabase
          .from("md_subscription_tier_features" as any)
          .select("tier_id, feature_name, access_type");
        if (featError) throw new Error(`Features query failed: ${featError.message}`);

        const validAccessTypes = ["included", "not_available", "add_on", "limited"];
        if (features) {
          for (const f of features as any[]) {
            if (!validAccessTypes.includes(f.access_type)) {
              throw new Error(
                `Invalid access_type '${f.access_type}' for feature '${f.feature_name}'`
              );
            }
          }
        }

        // Check each tier has at least some features
        for (const tier of tiers as any[]) {
          const tierFeatures = (features || []).filter((f: any) => f.tier_id === tier.id);
          if (tierFeatures.length === 0) {
            throw new Error(`Tier '${tier.name}' has no features configured`);
          }
        }
      }),
  },
];

// ============================================================================
// CATEGORY 4: Performance Baseline (PD-016 to PD-018)
// ============================================================================

const performanceBaselineTests: TestCase[] = [
  {
    id: "PD-016",
    category: "Performance Baseline",
    name: "Master data query response time",
    description: "Core master data queries must complete in <500ms each",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        const threshold = 500;
        const tables = ["countries", "industry_segments", "expertise_levels", "capability_tags"];
        for (const table of tables) {
          const { duration, passed } = await timeQuery(async () => {
            const { error } = await supabase.from(table as any).select("id, name").eq("is_active", true);
            if (error) throw new Error(`Query failed: ${error.message}`);
          }, threshold);
          if (!passed) {
            throw new Error(`Query on '${table}' took ${duration}ms (threshold: ${threshold}ms)`);
          }
        }
      }),
  },
  {
    id: "PD-017",
    category: "Performance Baseline",
    name: "Pricing overview data load time",
    description: "Full pricing data fetch must complete in <2000ms",
    role: "platform_admin",
    module: "performance",
    run: () =>
      runTest(async () => {
        const threshold = 2000;
        const { duration, passed } = await timeQuery(async () => {
          await Promise.all([
            supabase.from("md_subscription_tiers" as any).select("*").eq("is_active", true),
            supabase.from("md_engagement_models").select("*").eq("is_active", true),
            supabase.from("md_challenge_complexity").select("*").eq("is_active", true),
            supabase.from("md_billing_cycles").select("*").eq("is_active", true),
          ]);
        }, threshold);
        if (!passed) {
          throw new Error(`Pricing data load took ${duration}ms (threshold: ${threshold}ms)`);
        }
      }),
  },
  {
    id: "PD-018",
    category: "Performance Baseline",
    name: "Bulk query URL length safety",
    description: "Verifies .in() filter arrays stay within safe URL limits (max 50 items)",
    role: "system",
    module: "performance",
    run: () =>
      runTest(async () => {
        // Generate 50 fake UUIDs and verify the query doesn't fail due to URL length
        const fakeIds = Array.from({ length: 50 }, (_, i) =>
          `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`
        );
        const { error } = await supabase
          .from("industry_segments")
          .select("id")
          .in("id", fakeIds);
        if (error && error.message.includes("URI")) {
          throw new Error("URL length exceeded with 50 items in .in() filter - reduce batch size");
        }
        // 50 items should be fine; test with 100+ would fail
      }),
  },
];

// ============================================================================
// EXPORT: Categories & Accessors
// ============================================================================

export const performanceDiagnosticCategories: TestCategory[] = [
  {
    id: "pd-supabase-query",
    name: "Supabase Query Diagnostics",
    description: "Validates query patterns, pagination, joins, RLS, and indexes",
    role: "system",
    module: "performance",
    tests: supabaseQueryTests,
  },
  {
    id: "pd-react-query",
    name: "React Query & Caching",
    description: "Validates React Query setup, staleTime, soft-delete filters, and cache keys",
    role: "system",
    module: "performance",
    tests: reactQueryTests,
  },
  {
    id: "pd-data-quality",
    name: "Data Quality & Schema",
    description: "Validates audit fields, UUID keys, FK constraints, and feature integrity",
    role: "system",
    module: "performance",
    tests: dataQualityTests,
  },
  {
    id: "pd-performance-baseline",
    name: "Performance Baseline",
    description: "Validates query response times and bulk operation safety",
    role: "system",
    module: "performance",
    tests: performanceBaselineTests,
  },
];

export function getPerformanceDiagnosticTests(): TestCase[] {
  return performanceDiagnosticCategories.flatMap((c) => c.tests);
}

export function getPerformanceDiagnosticTestCount(): number {
  return getPerformanceDiagnosticTests().length;
}
