/**
 * React Hook for Pulse Social Channel Test Runner
 * Manages test execution state, progress, and results
 */

import { useState, useCallback, useRef } from "react";
import {
  testCategories,
  getAllTests,
  getTestsByCategory,
  TestCase,
  TestResult,
  TestStatus,
} from "@/services/pulseSocialTestRunner";

export interface TestResultWithMeta extends TestResult {
  testId: string;
  testName: string;
  category: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TestRunnerState {
  isRunning: boolean;
  isCancelled: boolean;
  currentTestId: string | null;
  currentTestName: string | null;
  progress: number;
  totalTests: number;
  completedTests: number;
  results: Map<string, TestResultWithMeta>;
  logs: LogEntry[];
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "success" | "error" | "warning" | "skip";
  message: string;
  testId?: string;
}

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  duration: number;
}

const initialState: TestRunnerState = {
  isRunning: false,
  isCancelled: false,
  currentTestId: null,
  currentTestName: null,
  progress: 0,
  totalTests: 0,
  completedTests: 0,
  results: new Map(),
  logs: [],
  startedAt: null,
  completedAt: null,
};

export function usePulseSocialTestRunner() {
  const [state, setState] = useState<TestRunnerState>(initialState);
  const cancelledRef = useRef(false);

  const addLog = useCallback((level: LogEntry["level"], message: string, testId?: string) => {
    setState(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        { timestamp: new Date(), level, message, testId },
      ],
    }));
  }, []);

  const updateResult = useCallback((testId: string, result: TestResultWithMeta) => {
    setState(prev => {
      const newResults = new Map(prev.results);
      newResults.set(testId, result);
      return { ...prev, results: newResults };
    });
  }, []);

  const runSingleTest = useCallback(async (test: TestCase): Promise<TestResultWithMeta> => {
    const startedAt = new Date();
    
    setState(prev => ({
      ...prev,
      currentTestId: test.id,
      currentTestName: test.name,
    }));

    addLog("info", `Running: ${test.id} - ${test.name}`, test.id);

    const result = await test.run();
    const completedAt = new Date();

    const resultWithMeta: TestResultWithMeta = {
      ...result,
      testId: test.id,
      testName: test.name,
      category: test.category,
      startedAt,
      completedAt,
    };

    // Log based on result
    if (result.status === "pass") {
      addLog("success", `✓ PASS: ${test.id} - ${test.name} (${result.duration}ms)`, test.id);
    } else if (result.status === "skip") {
      addLog("skip", `⊘ SKIP: ${test.id} - ${test.name} - ${result.details || "Skipped"}`, test.id);
    } else {
      addLog("error", `✗ FAIL: ${test.id} - ${test.name} - ${result.error}`, test.id);
    }

    updateResult(test.id, resultWithMeta);

    setState(prev => ({
      ...prev,
      completedTests: prev.completedTests + 1,
      progress: ((prev.completedTests + 1) / prev.totalTests) * 100,
    }));

    return resultWithMeta;
  }, [addLog, updateResult]);

  const runTests = useCallback(async (tests: TestCase[]) => {
    if (state.isRunning) return;

    cancelledRef.current = false;
    
    setState({
      ...initialState,
      isRunning: true,
      totalTests: tests.length,
      startedAt: new Date(),
      logs: [],
      results: new Map(),
    });

    addLog("info", `Starting test run with ${tests.length} tests...`);

    for (const test of tests) {
      if (cancelledRef.current) {
        addLog("warning", "Test run cancelled by user");
        break;
      }

      await runSingleTest(test);
      
      // Small delay between tests for UI responsiveness
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const completedAt = new Date();
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      isCancelled: cancelledRef.current,
      currentTestId: null,
      currentTestName: null,
      completedAt,
    }));

    addLog("info", cancelledRef.current ? "Test run cancelled" : "Test run completed");
  }, [state.isRunning, addLog, runSingleTest]);

  const runAllTests = useCallback(() => {
    const allTests = getAllTests();
    runTests(allTests);
  }, [runTests]);

  const runCategoryTests = useCallback((categoryId: string) => {
    const tests = getTestsByCategory(categoryId);
    if (tests.length > 0) {
      runTests(tests);
    }
  }, [runTests]);

  const cancelTests = useCallback(() => {
    cancelledRef.current = true;
    setState(prev => ({ ...prev, isCancelled: true }));
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState(initialState);
  }, []);

  const getStats = useCallback((): TestStats => {
    const results = Array.from(state.results.values());
    const passed = results.filter(r => r.status === "pass").length;
    const failed = results.filter(r => r.status === "fail").length;
    const skipped = results.filter(r => r.status === "skip").length;
    const pending = state.totalTests - state.completedTests;
    
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      total: state.totalTests,
      passed,
      failed,
      skipped,
      pending,
      duration: totalDuration,
    };
  }, [state.results, state.totalTests, state.completedTests]);

  const exportResults = useCallback(() => {
    const stats = getStats();
    const results = Array.from(state.results.entries()).map(([id, result]) => ({
      id,
      ...result,
      startedAt: result.startedAt?.toISOString(),
      completedAt: result.completedAt?.toISOString(),
    }));

    const exportData = {
      exportedAt: new Date().toISOString(),
      startedAt: state.startedAt?.toISOString(),
      completedAt: state.completedAt?.toISOString(),
      stats,
      categories: testCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        tests: cat.tests.map(t => ({
          id: t.id,
          name: t.name,
          result: state.results.get(t.id),
        })),
      })),
      results,
      logs: state.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-social-test-results-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state, getStats]);

  return {
    state,
    testCategories,
    runAllTests,
    runCategoryTests,
    cancelTests,
    reset,
    getStats,
    exportResults,
  };
}
