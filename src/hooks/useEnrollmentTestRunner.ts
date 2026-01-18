/**
 * React hook for managing enrollment lifecycle test execution
 */

import { useState, useCallback, useRef } from "react";
import { 
  testCategories, 
  TestCase, 
  TestCategory,
  getTotalTestCount,
  TestResult,
  TestStatus 
} from "@/services/enrollmentTestRunner";

export interface TestResultEntry {
  testId: string;
  categoryId: string;
  status: "pass" | "fail" | "skipped";
  duration: number;
  error?: string;
}

export interface RunnerState {
  isRunning: boolean;
  isCancelled: boolean;
  currentCategory: string | null;
  currentTest: string | null;
  progress: number;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  results: TestResultEntry[];
  logs: string[];
}

const initialState: RunnerState = {
  isRunning: false,
  isCancelled: false,
  currentCategory: null,
  currentTest: null,
  progress: 0,
  totalTests: 0,
  completedTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  results: [],
  logs: [],
};

export function useEnrollmentTestRunner() {
  const [state, setState] = useState<RunnerState>(initialState);
  const cancelledRef = useRef(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${message}`],
    }));
  }, []);

  const runCategoryTests = useCallback(
    async (categoryId: string): Promise<TestResultEntry[]> => {
      const category = testCategories.find((c) => c.id === categoryId);
      if (!category) {
        throw new Error(`Category ${categoryId} not found`);
      }

      const results: TestResultEntry[] = [];
      
      setState((prev) => ({
        ...prev,
        isRunning: true,
        isCancelled: false,
        currentCategory: category.name,
        totalTests: category.tests.length,
        completedTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        progress: 0,
        results: [],
        logs: [],
      }));
      cancelledRef.current = false;

      addLog(`=== Starting ${category.name} Tests ===`);

      for (const test of category.tests) {
        if (cancelledRef.current) {
          addLog("Tests cancelled by user");
          break;
        }

        setState((prev) => ({
          ...prev,
          currentTest: test.name,
        }));

        addLog(`Running: ${test.id} - ${test.name}`);

        const result = await test.run();
        const entry: TestResultEntry = {
          testId: test.id,
          categoryId,
          status: result.status,
          duration: result.duration,
          error: result.error,
        };
        results.push(entry);

        setState((prev) => ({
          ...prev,
          results: [...prev.results, entry],
          completedTests: prev.completedTests + 1,
          passedTests: prev.passedTests + (result.status === "pass" ? 1 : 0),
          failedTests: prev.failedTests + (result.status === "fail" ? 1 : 0),
          skippedTests: prev.skippedTests + (result.status === "skipped" ? 1 : 0),
          progress: ((prev.completedTests + 1) / category.tests.length) * 100,
        }));

        if (result.status === "pass") {
          addLog(`✓ ${test.id} passed (${result.duration}ms)`);
        } else if (result.status === "skipped") {
          addLog(`⊘ ${test.id} skipped: ${result.error}`);
        } else {
          addLog(`✗ ${test.id} failed: ${result.error}`);
        }
      }

      const passed = results.filter((r) => r.status === "pass").length;
      const failed = results.filter((r) => r.status === "fail").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      addLog(`=== ${category.name} Complete: ${passed} passed, ${failed} failed, ${skipped} skipped ===`);

      setState((prev) => ({
        ...prev,
        isRunning: false,
        currentCategory: null,
        currentTest: null,
      }));

      return results;
    },
    [addLog]
  );

  const runAllTests = useCallback(async (): Promise<TestResultEntry[]> => {
    const allResults: TestResultEntry[] = [];
    const totalCount = getTotalTestCount();

    setState({
      isRunning: true,
      isCancelled: false,
      currentCategory: null,
      currentTest: null,
      progress: 0,
      totalTests: totalCount,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      results: [],
      logs: [],
    });
    cancelledRef.current = false;

    addLog("=== Starting All Enrollment Lifecycle Tests ===");
    addLog(`Total categories: ${testCategories.length}, Total tests: ${totalCount}`);

    let completedSoFar = 0;

    for (const category of testCategories) {
      if (cancelledRef.current) {
        addLog("Tests cancelled by user");
        break;
      }

      setState((prev) => ({
        ...prev,
        currentCategory: category.name,
      }));

      addLog(`\n--- ${category.name} ---`);

      for (const test of category.tests) {
        if (cancelledRef.current) {
          addLog("Tests cancelled by user");
          break;
        }

        setState((prev) => ({
          ...prev,
          currentTest: test.name,
        }));

        addLog(`Running: ${test.id} - ${test.name}`);

        const result = await test.run();
        const entry: TestResultEntry = {
          testId: test.id,
          categoryId: category.id,
          status: result.status,
          duration: result.duration,
          error: result.error,
        };
        allResults.push(entry);
        completedSoFar++;

        setState((prev) => ({
          ...prev,
          results: [...prev.results, entry],
          completedTests: completedSoFar,
          passedTests: prev.passedTests + (result.status === "pass" ? 1 : 0),
          failedTests: prev.failedTests + (result.status === "fail" ? 1 : 0),
          skippedTests: prev.skippedTests + (result.status === "skipped" ? 1 : 0),
          progress: (completedSoFar / totalCount) * 100,
        }));

        if (result.status === "pass") {
          addLog(`✓ ${test.id} passed (${result.duration}ms)`);
        } else if (result.status === "skipped") {
          addLog(`⊘ ${test.id} skipped: ${result.error}`);
        } else {
          addLog(`✗ ${test.id} failed: ${result.error}`);
        }
      }
    }

    const passed = allResults.filter((r) => r.status === "pass").length;
    const failed = allResults.filter((r) => r.status === "fail").length;
    const skipped = allResults.filter((r) => r.status === "skipped").length;

    addLog(`\n=== All Tests Complete ===`);
    addLog(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}, Total: ${allResults.length}`);

    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentCategory: null,
      currentTest: null,
    }));

    return allResults;
  }, [addLog]);

  const cancelTests = useCallback(() => {
    cancelledRef.current = true;
    setState((prev) => ({
      ...prev,
      isCancelled: true,
    }));
    addLog("Cancellation requested...");
  }, [addLog]);

  const reset = useCallback(() => {
    setState(initialState);
    cancelledRef.current = false;
  }, []);

  // Get test status for a specific test
  const getTestStatus = useCallback(
    (testId: string): TestStatus => {
      if (state.currentTest && state.results.find(r => r.testId === testId) === undefined) {
        // Check if this is the currently running test
        const allTests = testCategories.flatMap(c => c.tests);
        const currentTest = allTests.find(t => t.name === state.currentTest);
        if (currentTest?.id === testId) {
          return "running";
        }
      }
      
      const result = state.results.find((r) => r.testId === testId);
      if (result) {
        return result.status;
      }
      return "not_tested";
    },
    [state.results, state.currentTest]
  );

  // Export results as JSON
  const exportResults = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: state.totalTests,
        passed: state.passedTests,
        failed: state.failedTests,
        skipped: state.skippedTests,
        passRate: state.totalTests > 0 
          ? Math.round((state.passedTests / state.totalTests) * 100) 
          : 0,
      },
      results: state.results,
      logs: state.logs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enrollment-test-results-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  return {
    ...state,
    categories: testCategories,
    runAllTests,
    runCategoryTests,
    cancelTests,
    reset,
    getTestStatus,
    exportResults,
  };
}
