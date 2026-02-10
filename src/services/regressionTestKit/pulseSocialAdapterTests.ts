/**
 * Pulse Social Test Runner Adapter
 * Wraps pulseSocialTestRunner.ts tests into the unified regression kit TestCase format.
 */

import {
  testCategories as pulseCategories,
  type TestCase as PulseTestCase,
} from "@/services/pulseSocialTestRunner";
import type { TestCase, TestCategory, TestRole, TestModule } from "./types";

// Map pulse category IDs to role/module
const CATEGORY_ROLE_MODULE_MAP: Record<string, { role: TestRole; module: TestModule }> = {
  "content-creation": { role: "solution_provider", module: "pulse_social" },
  "engagements": { role: "solution_provider", module: "pulse_social" },
  "comments": { role: "solution_provider", module: "pulse_social" },
  "connections": { role: "solution_provider", module: "pulse_social" },
  "gamification": { role: "system", module: "pulse_social" },
  "leaderboards": { role: "system", module: "pulse_social" },
  "feed": { role: "solution_provider", module: "pulse_social" },
  "multi-provider": { role: "cross_portal", module: "pulse_social" },
  "notifications": { role: "system", module: "pulse_social" },
  "security": { role: "system", module: "role_access" },
  "pulse-cards": { role: "solution_provider", module: "pulse_social" },
  "daily-standups": { role: "solution_provider", module: "pulse_social" },
  "loot-boxes": { role: "solution_provider", module: "pulse_social" },
  "skills": { role: "solution_provider", module: "pulse_social" },
  "visibility-boost": { role: "system", module: "pulse_social" },
  "edge-functions": { role: "system", module: "edge_functions" },
  "negative-cases": { role: "system", module: "pulse_social" },
};

function adaptTest(test: PulseTestCase, categoryId: string): TestCase {
  const mapping = CATEGORY_ROLE_MODULE_MAP[categoryId] || { role: "system" as TestRole, module: "pulse_social" as TestModule };
  return {
    id: `PS-${test.id}`,
    category: test.category,
    name: test.name,
    description: test.description,
    role: mapping.role,
    module: mapping.module,
    run: async () => {
      const result = await test.run();
      return {
        status: result.status === "skip" ? "skip" as const : result.status === "pass" ? "pass" as const : "fail" as const,
        duration: result.duration || 0,
        error: result.error,
      };
    },
  };
}

export const pulseSocialAdapterCategories: TestCategory[] = pulseCategories.map(cat => {
  const mapping = CATEGORY_ROLE_MODULE_MAP[cat.id] || { role: "system" as TestRole, module: "pulse_social" as TestModule };
  return {
    id: `ps-${cat.id}`,
    name: `Pulse: ${cat.name}`,
    description: cat.description,
    role: mapping.role,
    module: mapping.module,
    tests: cat.tests.map(t => adaptTest(t, cat.id)),
  };
});

export function getPulseSocialAdapterTests(): TestCase[] {
  return pulseSocialAdapterCategories.flatMap(cat => cat.tests);
}

export function getPulseSocialAdapterTestCount(): number {
  return getPulseSocialAdapterTests().length;
}
