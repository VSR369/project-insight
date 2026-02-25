/**
 * Regression Test Kit - Main Orchestrator
 * 
 * Consolidates all test runners and provides a unified interface for:
 * - Running all tests
 * - Filtering by role, module, or category
 * - Progress tracking
 * - Result export
 * 
 * Test Categories:
 * - Admin Portal (AP-xxx): Platform admin functionality
 * - Role Access (RA-xxx): RBAC and RLS validation
 * - Reviewer Portal (RP-xxx): Panel reviewer workflows
 * - Data Integrity (DI-xxx): FK, soft delete, audit trails
 * - Integration (CI-xxx): Cross-portal workflows
 * - Edge Functions (EF-xxx): RPC and edge function tests
 * 
 * Plus existing imported runners:
 * - Master Data CRUD (from smokeTestRunner)
 * - Enrollment Lifecycle (from enrollmentTestRunner)
 * - Pulse Social (from pulseSocialTestRunner)
 */

// Import types
export * from "./types";

// Import new test categories
import { adminPortalTestCategories, getAdminPortalTests, getAdminPortalTestCount } from "./adminPortalTests";
import { roleAccessTestCategories, getRoleAccessTests, getRoleAccessTestCount } from "./roleAccessTests";
import { reviewerPortalTestCategories, getReviewerPortalTests, getReviewerPortalTestCount } from "./reviewerPortalTests";
import { dataIntegrityTestCategories, getDataIntegrityTests, getDataIntegrityTestCount } from "./dataIntegrityTests";
import { integrationTestCategories, getIntegrationTests, getIntegrationTestCount } from "./integrationTests";
import { edgeFunctionTestCategories, getEdgeFunctionTests, getEdgeFunctionTestCount } from "./edgeFunctionTests";
import { performanceDiagnosticCategories, getPerformanceDiagnosticTests, getPerformanceDiagnosticTestCount } from "./performanceDiagnosticTests";

// Import adapter test categories
import { enrollmentAdapterCategories, getEnrollmentAdapterTests, getEnrollmentAdapterTestCount } from "./enrollmentAdapterTests";
import { pulseSocialAdapterCategories, getPulseSocialAdapterTests, getPulseSocialAdapterTestCount } from "./pulseSocialAdapterTests";
import { seekerPlatformCategories, getSeekerPlatformTests, getSeekerPlatformTestCount } from "./seekerPlatformTests";
import { smokeAdapterCategories, getSmokeAdapterTests, getSmokeAdapterTestCount } from "./smokeAdapterTests";

import {
  TestCase,
  TestCategory,
  TestSuite,
  TestSuiteRun,
  TestCaseResult,
  TestRole,
  TestModule,
  TestFilters,
  TestLogEntry,
  generateRunId,
  formatDuration,
  ROLE_DISPLAY_NAMES,
  MODULE_DISPLAY_NAMES,
} from "./types";

// ============================================================================
// CONSOLIDATED TEST SUITE
// ============================================================================

/**
 * Get all test categories from all runners
 */
export function getAllTestCategories(): TestCategory[] {
  return [
    // New test categories
    ...adminPortalTestCategories,
    ...roleAccessTestCategories,
    ...reviewerPortalTestCategories,
    ...dataIntegrityTestCategories,
    ...integrationTestCategories,
    ...edgeFunctionTestCategories,
    ...performanceDiagnosticCategories,
    // Adapted from existing runners
    ...enrollmentAdapterCategories,
    ...pulseSocialAdapterCategories,
    ...smokeAdapterCategories,
    // Seeker Platform (140 TCs)
    ...seekerPlatformCategories,
  ];
}

/**
 * Get all tests flattened
 */
export function getAllTests(): TestCase[] {
  return [
    ...getAdminPortalTests(),
    ...getRoleAccessTests(),
    ...getReviewerPortalTests(),
    ...getDataIntegrityTests(),
    ...getIntegrationTests(),
    ...getEdgeFunctionTests(),
    ...getPerformanceDiagnosticTests(),
    ...getEnrollmentAdapterTests(),
    ...getPulseSocialAdapterTests(),
    ...getSmokeAdapterTests(),
    ...getSeekerPlatformTests(),
  ];
}

/**
 * Get total test count
 */
export function getTotalTestCount(): number {
  return (
    getAdminPortalTestCount() +
    getRoleAccessTestCount() +
    getReviewerPortalTestCount() +
    getDataIntegrityTestCount() +
    getIntegrationTestCount() +
    getEdgeFunctionTestCount() +
    getPerformanceDiagnosticTestCount() +
    getEnrollmentAdapterTestCount() +
    getPulseSocialAdapterTestCount() +
    getSmokeAdapterTestCount() +
    getSeekerPlatformTestCount()
  );
}

/**
 * Get test count by category
 */
export function getTestCountsByCategory(): Record<string, number> {
  return {
    "Admin Portal": getAdminPortalTestCount(),
    "Role Access": getRoleAccessTestCount(),
    "Reviewer Portal": getReviewerPortalTestCount(),
    "Data Integrity": getDataIntegrityTestCount(),
    "Integration": getIntegrationTestCount(),
    "Edge Functions": getEdgeFunctionTestCount(),
    "Performance Diagnostics": getPerformanceDiagnosticTestCount(),
    "Enrollment Lifecycle": getEnrollmentAdapterTestCount(),
    "Pulse Social": getPulseSocialAdapterTestCount(),
    "Smoke/Master Data": getSmokeAdapterTestCount(),
    "Seeker Platform": getSeekerPlatformTestCount(),
  };
}

/**
 * Get test count by role
 */
export function getTestCountsByRole(): Record<TestRole, number> {
  const tests = getAllTests();
  const counts: Record<TestRole, number> = {
    platform_admin: 0,
    solution_provider: 0,
    panel_reviewer: 0,
    cross_portal: 0,
    system: 0,
  };
  
  for (const test of tests) {
    counts[test.role]++;
  }
  
  return counts;
}

/**
 * Get test count by module
 */
export function getTestCountsByModule(): Record<TestModule, number> {
  const tests = getAllTests();
  const counts: Record<TestModule, number> = {
    master_data: 0,
    enrollment: 0,
    assessment: 0,
    interview: 0,
    pulse_social: 0,
    reviewer_portal: 0,
    admin_portal: 0,
    role_access: 0,
    data_integrity: 0,
    edge_functions: 0,
    integration: 0,
    performance: 0,
  };
  
  for (const test of tests) {
    counts[test.module]++;
  }
  
  return counts;
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filter tests by criteria
 */
export function filterTests(tests: TestCase[], filters: Partial<TestFilters>): TestCase[] {
  let filtered = [...tests];
  
  if (filters.roles && filters.roles.length > 0) {
    filtered = filtered.filter(t => filters.roles!.includes(t.role));
  }
  
  if (filters.modules && filters.modules.length > 0) {
    filtered = filtered.filter(t => filters.modules!.includes(t.module));
  }
  
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(t => filters.categories!.includes(t.category));
  }
  
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(t => 
      t.id.toLowerCase().includes(query) ||
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}

/**
 * Get tests by role
 */
export function getTestsByRole(role: TestRole): TestCase[] {
  return getAllTests().filter(t => t.role === role);
}

/**
 * Get tests by module
 */
export function getTestsByModule(module: TestModule): TestCase[] {
  return getAllTests().filter(t => t.module === module);
}

// ============================================================================
// TEST RUNNER
// ============================================================================

export interface RunnerCallbacks {
  onTestStart?: (test: TestCase) => void;
  onTestComplete?: (test: TestCase, result: TestCaseResult) => void;
  onProgress?: (current: number, total: number, test: TestCase) => void;
  onLog?: (entry: TestLogEntry) => void;
}

/**
 * Run tests with progress callbacks
 */
export async function runTests(
  tests: TestCase[],
  callbacks?: RunnerCallbacks,
  signal?: AbortSignal
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  const total = tests.length;
  
  for (let i = 0; i < tests.length; i++) {
    // Check for abort
    if (signal?.aborted) {
      break;
    }
    
    const test = tests[i];
    
    // Notify test start
    callbacks?.onTestStart?.(test);
    callbacks?.onProgress?.(i + 1, total, test);
    callbacks?.onLog?.({
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Running: ${test.id} - ${test.name}`,
      testId: test.id,
    });
    
    // Run the test
    const startTime = Date.now();
    const result = await test.run();
    
    const testResult: TestCaseResult = {
      id: test.id,
      category: test.category,
      name: test.name,
      role: test.role,
      module: test.module,
      status: result.status === "pass" ? "pass" : result.status === "skip" ? "skip" : "fail",
      duration: result.duration,
      error: result.error,
      testedAt: new Date().toISOString(),
    };
    
    results.push(testResult);
    
    // Notify test complete
    callbacks?.onTestComplete?.(test, testResult);
    callbacks?.onLog?.({
      timestamp: new Date().toISOString(),
      level: result.status,
      message: result.status === "pass" 
        ? `✓ ${test.id} ${test.name} (${result.duration}ms)`
        : result.status === "skip"
        ? `⊘ ${test.id} ${test.name} - ${result.error || "Skipped"}`
        : `✗ ${test.id} ${test.name} - ${result.error}`,
      testId: test.id,
      duration: result.duration,
    });
  }
  
  return results;
}

// ============================================================================
// RESULT AGGREGATION
// ============================================================================

/**
 * Generate a test suite run report
 */
export function generateRunReport(results: TestCaseResult[], startTime: number): TestSuiteRun {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const skipped = results.filter(r => r.status === "skip").length;
  
  // Group by role
  const byRole: Record<TestRole, { passed: number; failed: number; skipped: number; total: number }> = {
    platform_admin: { passed: 0, failed: 0, skipped: 0, total: 0 },
    solution_provider: { passed: 0, failed: 0, skipped: 0, total: 0 },
    panel_reviewer: { passed: 0, failed: 0, skipped: 0, total: 0 },
    cross_portal: { passed: 0, failed: 0, skipped: 0, total: 0 },
    system: { passed: 0, failed: 0, skipped: 0, total: 0 },
  };
  
  // Group by module
  const byModule: Record<TestModule, { passed: number; failed: number; skipped: number; total: number }> = {
    master_data: { passed: 0, failed: 0, skipped: 0, total: 0 },
    enrollment: { passed: 0, failed: 0, skipped: 0, total: 0 },
    assessment: { passed: 0, failed: 0, skipped: 0, total: 0 },
    interview: { passed: 0, failed: 0, skipped: 0, total: 0 },
    pulse_social: { passed: 0, failed: 0, skipped: 0, total: 0 },
    reviewer_portal: { passed: 0, failed: 0, skipped: 0, total: 0 },
    admin_portal: { passed: 0, failed: 0, skipped: 0, total: 0 },
    role_access: { passed: 0, failed: 0, skipped: 0, total: 0 },
    data_integrity: { passed: 0, failed: 0, skipped: 0, total: 0 },
    edge_functions: { passed: 0, failed: 0, skipped: 0, total: 0 },
    integration: { passed: 0, failed: 0, skipped: 0, total: 0 },
    performance: { passed: 0, failed: 0, skipped: 0, total: 0 },
  };
  
  const failures: { id: string; name: string; category: string; role: TestRole; module: TestModule; error: string; duration: number }[] = [];
  
  for (const result of results) {
    // By role
    byRole[result.role].total++;
    if (result.status === "pass") byRole[result.role].passed++;
    else if (result.status === "fail") byRole[result.role].failed++;
    else byRole[result.role].skipped++;
    
    // By module
    byModule[result.module].total++;
    if (result.status === "pass") byModule[result.module].passed++;
    else if (result.status === "fail") byModule[result.module].failed++;
    else byModule[result.module].skipped++;
    
    // Collect failures
    if (result.status === "fail") {
      failures.push({
        id: result.id,
        name: result.name,
        category: result.category,
        role: result.role,
        module: result.module,
        error: result.error || "Unknown error",
        duration: result.duration,
      });
    }
  }
  
  return {
    runId: generateRunId(),
    timestamp: new Date().toISOString(),
    environment: window.location.hostname.includes("preview") ? "preview" : "production",
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
      duration: formatDuration(duration),
    },
    byRole,
    byModule,
    results,
    failures,
  };
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export results as JSON
 */
export function exportResultsAsJson(report: TestSuiteRun): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export results as CSV
 */
export function exportResultsAsCsv(results: TestCaseResult[]): string {
  const headers = ["ID", "Category", "Name", "Role", "Module", "Status", "Duration (ms)", "Error", "Tested At"];
  const rows = results.map(r => [
    r.id,
    r.category,
    `"${r.name.replace(/"/g, '""')}"`,
    r.role,
    r.module,
    r.status,
    r.duration.toString(),
    r.error ? `"${r.error.replace(/"/g, '""')}"` : "",
    r.testedAt,
  ]);
  
  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

// ============================================================================
// RE-EXPORT INDIVIDUAL MODULES
// ============================================================================

export { adminPortalTestCategories, getAdminPortalTests, getAdminPortalTestCount };
export { roleAccessTestCategories, getRoleAccessTests, getRoleAccessTestCount };
export { reviewerPortalTestCategories, getReviewerPortalTests, getReviewerPortalTestCount };
export { dataIntegrityTestCategories, getDataIntegrityTests, getDataIntegrityTestCount };
export { integrationTestCategories, getIntegrationTests, getIntegrationTestCount };
export { edgeFunctionTestCategories, getEdgeFunctionTests, getEdgeFunctionTestCount };
export { performanceDiagnosticCategories, getPerformanceDiagnosticTests, getPerformanceDiagnosticTestCount };
export { enrollmentAdapterCategories, getEnrollmentAdapterTests, getEnrollmentAdapterTestCount };
export { pulseSocialAdapterCategories, getPulseSocialAdapterTests, getPulseSocialAdapterTestCount };
export { smokeAdapterCategories, getSmokeAdapterTests, getSmokeAdapterTestCount };
export { seekerPlatformCategories, getSeekerPlatformTests, getSeekerPlatformTestCount };

// Re-export display names
export { ROLE_DISPLAY_NAMES, MODULE_DISPLAY_NAMES };
