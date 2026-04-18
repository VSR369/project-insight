/**
 * Diagnostics types — surfaces for the AI Review smoke-test runner.
 * Categories map to docs/qa/ai-curator-production-test-plan.md.
 */

export type SmokeTestCategory =
  | 'A' // Wave structure
  | 'B' // Pass 1
  | 'C' // Pass 2
  | 'D' // Harmonization
  | 'E' // Errors
  | 'F' // Diagnostics
  | 'G' // Accept All
  | 'H' // Timing
  | 'I' // Edge cases
  | 'J'; // Regressions

export type SmokeTestVerdict = 'GO' | 'NO_GO' | 'WARN';

export interface SmokeTestResult {
  category: SmokeTestCategory;
  scenarioId: string;
  scenarioLabel: string;
  passed: boolean;
  durationMs: number;
  evidence?: string;
  correlationId?: string;
}

export interface SmokeTestReport {
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  goNoGo: SmokeTestVerdict;
  fixtureChallengeId: string;
  results: SmokeTestResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}
