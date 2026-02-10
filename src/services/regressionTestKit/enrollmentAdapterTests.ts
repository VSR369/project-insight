/**
 * Enrollment Test Runner Adapter
 * Wraps enrollmentTestRunner.ts tests into the unified regression kit TestCase format.
 */

import {
  testCategories as enrollmentCategories,
  getAllTests as getEnrollmentAllTests,
  type TestCase as EnrollmentTestCase,
} from "@/services/enrollmentTestRunner";
import type { TestCase, TestCategory, TestRole, TestModule } from "./types";

// Map enrollment category IDs to role/module
const CATEGORY_ROLE_MODULE_MAP: Record<string, { role: TestRole; module: TestModule }> = {
  "lifecycle-ranks": { role: "system", module: "enrollment" },
  "lifecycle-locks": { role: "solution_provider", module: "enrollment" },
  "cascade-reset": { role: "solution_provider", module: "enrollment" },
  "deletion-rules": { role: "solution_provider", module: "enrollment" },
  "proof-points-min": { role: "solution_provider", module: "enrollment" },
  "org-approval": { role: "platform_admin", module: "enrollment" },
  "enrollment-data": { role: "solution_provider", module: "enrollment" },
  "multi-industry": { role: "solution_provider", module: "enrollment" },
  "multi-enrollment-lifecycle": { role: "solution_provider", module: "enrollment" },
  "assessment-lifecycle": { role: "solution_provider", module: "assessment" },
  "interview-scheduling": { role: "cross_portal", module: "interview" },
  "audit-trail": { role: "system", module: "data_integrity" },
  "security-rls": { role: "system", module: "role_access" },
  "master-data-integrity": { role: "platform_admin", module: "master_data" },
  "terminal-states": { role: "system", module: "enrollment" },
  "primary-action-matrix": { role: "system", module: "role_access" },
  "error-handling": { role: "system", module: "enrollment" },
  "system-settings": { role: "platform_admin", module: "admin_portal" },
  "lifecycle-progression": { role: "solution_provider", module: "enrollment" },
  "manager-approval-workflow": { role: "platform_admin", module: "enrollment" },
  "interview-rescheduling": { role: "cross_portal", module: "interview" },
  "cross-enrollment-rules": { role: "solution_provider", module: "enrollment" },
  "state-machine-validation": { role: "system", module: "enrollment" },
  "edge-function-smoke": { role: "system", module: "edge_functions" },
  "reviewer-enrollment": { role: "panel_reviewer", module: "reviewer_portal" },
  "enrollment-scoped-locks": { role: "solution_provider", module: "enrollment" },
};

function adaptTest(test: EnrollmentTestCase, categoryId: string): TestCase {
  const mapping = CATEGORY_ROLE_MODULE_MAP[categoryId] || { role: "system" as TestRole, module: "enrollment" as TestModule };
  return {
    id: test.id,
    category: test.category,
    name: test.name,
    description: test.description,
    role: mapping.role,
    module: mapping.module,
    run: async () => {
      const result = await test.run();
      return {
        status: result.status === "skipped" ? "skip" as const : result.status as "pass" | "fail",
        duration: result.duration,
        error: result.error,
      };
    },
  };
}

export const enrollmentAdapterCategories: TestCategory[] = enrollmentCategories.map(cat => {
  const mapping = CATEGORY_ROLE_MODULE_MAP[cat.id] || { role: "system" as TestRole, module: "enrollment" as TestModule };
  return {
    id: `enr-${cat.id}`,
    name: cat.name,
    description: cat.description,
    role: mapping.role,
    module: mapping.module,
    tests: cat.tests.map(t => adaptTest(t, cat.id)),
  };
});

export function getEnrollmentAdapterTests(): TestCase[] {
  return enrollmentAdapterCategories.flatMap(cat => cat.tests);
}

export function getEnrollmentAdapterTestCount(): number {
  return getEnrollmentAdapterTests().length;
}
