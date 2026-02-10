/**
 * Smoke Test Runner Adapter
 * Wraps smokeTestRunner.ts tests (different type system) into the unified regression kit TestCase format.
 * smokeTestRunner uses { id, operation, label, run } vs kit's { id, name, description, role, module, run }
 *
 * Cascade skip logic: if a module's "create" operation fails, dependent operations
 * (update, deactivate, activate, delete) are automatically skipped to prevent cascade failures.
 */

import { moduleTestConfigs } from "@/services/smokeTestRunner";
import type { TestCase, TestCategory, TestResult } from "./types";

// Track per-module create success at runtime
const moduleCreateStatus = new Map<string, boolean>();

let counter = 0;

const DEPENDENT_OPERATIONS = ["update", "deactivate", "activate", "delete"];

function adaptSmokeTest(
  moduleId: string,
  moduleName: string,
  smokeTest: { id: string; operation: string; label: string; run: () => Promise<{ status: "pass" | "fail"; duration: number; error?: string }> }
): TestCase {
  counter++;
  const isDependentOp = DEPENDENT_OPERATIONS.includes(smokeTest.operation);

  return {
    id: `SM-${String(counter).padStart(3, "0")}`,
    category: `Smoke: ${moduleName}`,
    name: `${moduleName} - ${smokeTest.label}`,
    description: `${smokeTest.operation} operation on ${moduleName}`,
    role: "platform_admin",
    module: "master_data",
    run: async (): Promise<TestResult> => {
      // Skip dependent operations if create failed for this module
      if (isDependentOp && moduleCreateStatus.get(moduleId) === false) {
        return {
          status: "skip",
          duration: 0,
          error: "Skipped: prerequisite create failed for this module",
        };
      }

      const result = await smokeTest.run();

      // Track create operation success per module
      if (smokeTest.operation === "create") {
        moduleCreateStatus.set(moduleId, result.status === "pass");
      }

      return {
        status: result.status,
        duration: result.duration,
        error: result.error,
      };
    },
  };
}

// Reset counter and build categories
counter = 0;

export const smokeAdapterCategories: TestCategory[] = moduleTestConfigs.map(module => ({
  id: `sm-${module.id}`,
  name: `Smoke: ${module.name}`,
  description: `CRUD smoke tests for ${module.name}`,
  role: "platform_admin",
  module: "master_data",
  tests: module.tests.map(t => adaptSmokeTest(module.id, module.name, t)),
}));

export function getSmokeAdapterTests(): TestCase[] {
  return smokeAdapterCategories.flatMap(cat => cat.tests);
}

export function getSmokeAdapterTestCount(): number {
  return getSmokeAdapterTests().length;
}

/** Reset module tracking state (call before a fresh test run) */
export function resetSmokeAdapterState(): void {
  moduleCreateStatus.clear();
}
