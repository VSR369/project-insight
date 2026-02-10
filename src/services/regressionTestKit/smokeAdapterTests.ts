/**
 * Smoke Test Runner Adapter
 * Wraps smokeTestRunner.ts tests (different type system) into the unified regression kit TestCase format.
 * smokeTestRunner uses { id, operation, label, run } vs kit's { id, name, description, role, module, run }
 */

import { moduleTestConfigs } from "@/services/smokeTestRunner";
import type { TestCase, TestCategory, TestResult } from "./types";

let counter = 0;

function adaptSmokeTest(
  moduleId: string,
  moduleName: string,
  smokeTest: { id: string; operation: string; label: string; run: () => Promise<{ status: "pass" | "fail"; duration: number; error?: string }> }
): TestCase {
  counter++;
  return {
    id: `SM-${String(counter).padStart(3, "0")}`,
    category: `Smoke: ${moduleName}`,
    name: `${moduleName} - ${smokeTest.label}`,
    description: `${smokeTest.operation} operation on ${moduleName}`,
    role: "platform_admin",
    module: "master_data",
    run: async (): Promise<TestResult> => {
      const result = await smokeTest.run();
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
