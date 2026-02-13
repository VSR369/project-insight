/**
 * Regression Test Kit - Shared Types
 * 
 * Unified type definitions for all test runners in the regression suite.
 * Supports categorization by role, module, and test type.
 */

// ============================================================================
// TEST STATUS & RESULT TYPES
// ============================================================================

export type TestStatus = "pending" | "running" | "pass" | "fail" | "skip";

export interface TestResult {
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
  details?: string;
}

export interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  role: TestRole;
  module: TestModule;
  run: () => Promise<TestResult>;
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  role: TestRole;
  module: TestModule;
  tests: TestCase[];
}

// ============================================================================
// ROLE & MODULE CLASSIFICATION
// ============================================================================

export type TestRole = 
  | "platform_admin"
  | "solution_provider" 
  | "panel_reviewer"
  | "cross_portal"
  | "system";

export type TestModule =
  | "master_data"
  | "enrollment"
  | "assessment"
  | "interview"
  | "pulse_social"
  | "reviewer_portal"
  | "admin_portal"
  | "role_access"
  | "data_integrity"
  | "edge_functions"
  | "integration"
  | "performance";

// ============================================================================
// TEST SUITE ORGANIZATION
// ============================================================================

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  categories: TestCategory[];
  totalTests: number;
}

export interface TestSuiteRun {
  runId: string;
  timestamp: string;
  environment: string;
  summary: TestSummary;
  byRole: Record<TestRole, RoleSummary>;
  byModule: Record<TestModule, ModuleSummary>;
  results: TestCaseResult[];
  failures: FailureDetail[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
}

export interface RoleSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface ModuleSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestCaseResult {
  id: string;
  category: string;
  name: string;
  role: TestRole;
  module: TestModule;
  status: TestStatus;
  duration: number;
  error?: string;
  testedAt: string;
}

export interface FailureDetail {
  id: string;
  name: string;
  category: string;
  role: TestRole;
  module: TestModule;
  error: string;
  duration: number;
}

// ============================================================================
// TEST RUNNER STATE
// ============================================================================

export interface TestRunnerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTest: string | null;
  progress: number;
  startTime: number | null;
  results: Map<string, TestCaseResult>;
  logs: TestLogEntry[];
}

export interface TestLogEntry {
  timestamp: string;
  level: "info" | "pass" | "fail" | "skip" | "warn";
  message: string;
  testId?: string;
  duration?: number;
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export interface TestFilters {
  roles: TestRole[];
  modules: TestModule[];
  categories: string[];
  status: TestStatus[];
  searchQuery: string;
}

// ============================================================================
// TEST PREFIX CONVENTIONS
// ============================================================================

export const TEST_PREFIXES = {
  // Existing runners (will be imported)
  SM: { name: "Smoke/Master Data", module: "master_data" as TestModule },
  EN: { name: "Enrollment", module: "enrollment" as TestModule },
  PS: { name: "Pulse Social", module: "pulse_social" as TestModule },
  
  // New test categories
  RP: { name: "Reviewer Portal", module: "reviewer_portal" as TestModule },
  AP: { name: "Admin Portal", module: "admin_portal" as TestModule },
  RA: { name: "Role Access", module: "role_access" as TestModule },
  CI: { name: "Cross-Integration", module: "integration" as TestModule },
  DI: { name: "Data Integrity", module: "data_integrity" as TestModule },
  EF: { name: "Edge Functions", module: "edge_functions" as TestModule },
  
  // Enrollment sub-categories (from existing runner)
  LR: { name: "Lifecycle Ranks", module: "enrollment" as TestModule },
  LL: { name: "Lifecycle Locks", module: "enrollment" as TestModule },
  CR: { name: "Cascade Reset", module: "enrollment" as TestModule },
  ED: { name: "Enrollment Deletion", module: "enrollment" as TestModule },
  PP: { name: "Proof Points", module: "enrollment" as TestModule },
  OA: { name: "Org Approval", module: "enrollment" as TestModule },
  AS: { name: "Assessment", module: "assessment" as TestModule },
  IS: { name: "Interview Scheduling", module: "interview" as TestModule },
  AT: { name: "Audit Trail", module: "data_integrity" as TestModule },
  SR: { name: "Security & RLS", module: "role_access" as TestModule },
  MD: { name: "Master Data", module: "master_data" as TestModule },
  TS: { name: "Terminal States", module: "enrollment" as TestModule },
  EH: { name: "Error Handling", module: "enrollment" as TestModule },
  SS: { name: "System Settings", module: "admin_portal" as TestModule },
  LP: { name: "Lifecycle Progression", module: "enrollment" as TestModule },
  MA: { name: "Manager Approval", module: "enrollment" as TestModule },
  IR: { name: "Interview Rescheduling", module: "interview" as TestModule },
  CE: { name: "Cross-Enrollment", module: "enrollment" as TestModule },
  SM_STATE: { name: "State Machine", module: "enrollment" as TestModule },
  RE: { name: "Reviewer Enrollment", module: "reviewer_portal" as TestModule },
  ME: { name: "Multi-Enrollment", module: "enrollment" as TestModule },
  ES: { name: "Enrollment-Scoped", module: "enrollment" as TestModule },
  PD: { name: "Performance Diagnostics", module: "performance" as TestModule },
} as const;

// ============================================================================
// ROLE DISPLAY NAMES
// ============================================================================

export const ROLE_DISPLAY_NAMES: Record<TestRole, string> = {
  platform_admin: "Platform Admin",
  solution_provider: "Solution Provider",
  panel_reviewer: "Panel Reviewer",
  cross_portal: "Cross-Portal",
  system: "System",
};

export const MODULE_DISPLAY_NAMES: Record<TestModule, string> = {
  master_data: "Master Data",
  enrollment: "Enrollment Lifecycle",
  assessment: "Assessment",
  interview: "Interview",
  pulse_social: "Pulse Social",
  reviewer_portal: "Reviewer Portal",
  admin_portal: "Admin Portal",
  role_access: "Role-Based Access",
  data_integrity: "Data Integrity",
  edge_functions: "Edge Functions",
  integration: "Integration",
  performance: "Performance",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Run a test function with timing and error handling
 */
export async function runTest(testFn: () => Promise<void>): Promise<TestResult> {
  const start = performance.now();
  try {
    await testFn();
    return {
      status: "pass",
      duration: Math.round(performance.now() - start),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Handle SKIP: prefix for skipped tests
    if (message.startsWith("SKIP:")) {
      return {
        status: "skip",
        duration: Math.round(performance.now() - start),
        details: message.replace("SKIP:", "").trim(),
      };
    }
    return {
      status: "fail",
      duration: Math.round(performance.now() - start),
      error: message,
    };
  }
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  return `REG-${dateStr}-${timeStr}`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
