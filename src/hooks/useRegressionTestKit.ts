/**
 * Regression Test Kit - React Hook
 * 
 * Provides state management, execution control, and export functionality
 * for running the comprehensive regression test suite.
 */

import { useState, useCallback, useRef } from "react";
import {
  TestCase,
  TestCaseResult,
  TestLogEntry,
  TestFilters,
  TestRole,
  TestModule,
  TestSuiteRun,
  getAllTests,
  getAllTestCategories,
  filterTests,
  runTests,
  generateRunReport,
  exportResultsAsJson,
  exportResultsAsCsv,
  formatDuration,
  getTestCountsByRole,
  getTestCountsByModule,
  ROLE_DISPLAY_NAMES,
  MODULE_DISPLAY_NAMES,
} from "@/services/regressionTestKit";

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface RegressionTestKitState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
  duration: number;
  currentCategory: string | null;
  currentTest: string | null;
  results: TestCaseResult[];
  logs: TestLogEntry[];
  filters: Partial<TestFilters>;
  report: TestSuiteRun | null;
}

const initialState: RegressionTestKitState = {
  isRunning: false,
  isPaused: false,
  progress: 0,
  totalTests: 0,
  completedTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  pendingTests: 0,
  duration: 0,
  currentCategory: null,
  currentTest: null,
  results: [],
  logs: [],
  filters: {},
  report: null,
};

// ============================================================================
// HOOK
// ============================================================================

export function useRegressionTestKit() {
  const [state, setState] = useState<RegressionTestKitState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get all tests with filters applied
  const getFilteredTests = useCallback((): TestCase[] => {
    const allTests = getAllTests();
    if (Object.keys(state.filters).length === 0) {
      return allTests;
    }
    return filterTests(allTests, state.filters);
  }, [state.filters]);

  // Get test categories
  const getCategories = useCallback(() => {
    return getAllTestCategories();
  }, []);

  // Get counts by role
  const getRoleCounts = useCallback(() => {
    return getTestCountsByRole();
  }, []);

  // Get counts by module
  const getModuleCounts = useCallback(() => {
    return getTestCountsByModule();
  }, []);

  // Add a log entry
  const addLog = useCallback((entry: TestLogEntry) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, entry],
    }));
  }, []);

  // Start duration timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        duration: Date.now() - startTimeRef.current,
      }));
    }, 100);
  }, []);

  // Stop duration timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Run all tests (or filtered subset)
  const runAllTests = useCallback(async () => {
    const tests = getFilteredTests();
    if (tests.length === 0) {
      addLog({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "No tests to run with current filters",
      });
      return;
    }

    // Initialize state
    abortControllerRef.current = new AbortController();
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      progress: 0,
      totalTests: tests.length,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      pendingTests: tests.length,
      duration: 0,
      currentCategory: null,
      currentTest: null,
      results: [],
      report: null,
    }));

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      message: `=== Starting Regression Test Suite (${tests.length} tests) ===`,
    });

    startTimer();

    try {
      const results = await runTests(
        tests,
        {
          onTestStart: (test) => {
            setState(prev => ({
              ...prev,
              currentCategory: test.category,
              currentTest: `${test.id} - ${test.name}`,
            }));
          },
          onTestComplete: (test, result) => {
            setState(prev => {
              const completed = prev.completedTests + 1;
              const passed = prev.passedTests + (result.status === "pass" ? 1 : 0);
              const failed = prev.failedTests + (result.status === "fail" ? 1 : 0);
              const skipped = prev.skippedTests + (result.status === "skip" ? 1 : 0);
              
              return {
                ...prev,
                completedTests: completed,
                passedTests: passed,
                failedTests: failed,
                skippedTests: skipped,
                pendingTests: prev.totalTests - completed,
                progress: Math.round((completed / prev.totalTests) * 100),
                results: [...prev.results, result],
              };
            });
          },
          onLog: (entry) => {
            addLog(entry);
          },
        },
        abortControllerRef.current.signal
      );

      // Generate report
      const report = generateRunReport(results, startTimeRef.current);
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentCategory: null,
        currentTest: null,
        report,
      }));

      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        message: `=== Test Suite Complete: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped (${report.summary.duration}) ===`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog({
        timestamp: new Date().toISOString(),
        level: "fail",
        message: `Test suite aborted: ${message}`,
      });
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentCategory: null,
        currentTest: null,
      }));
    } finally {
      stopTimer();
    }
  }, [getFilteredTests, addLog, startTimer, stopTimer]);

  // Run tests for a specific category
  const runCategoryTests = useCallback(async (categoryId: string) => {
    const allTests = getFilteredTests();
    const categoryTests = allTests.filter(t => t.category === categoryId);
    
    if (categoryTests.length === 0) {
      addLog({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: `No tests found for category: ${categoryId}`,
      });
      return;
    }

    // Same logic as runAllTests but with category subset
    abortControllerRef.current = new AbortController();
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      progress: 0,
      totalTests: categoryTests.length,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      pendingTests: categoryTests.length,
      duration: 0,
      currentCategory: categoryId,
      currentTest: null,
      results: [],
      report: null,
    }));

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      message: `=== Running ${categoryId} (${categoryTests.length} tests) ===`,
    });

    startTimer();

    try {
      const results = await runTests(
        categoryTests,
        {
          onTestStart: (test) => {
            setState(prev => ({
              ...prev,
              currentTest: `${test.id} - ${test.name}`,
            }));
          },
          onTestComplete: (test, result) => {
            setState(prev => {
              const completed = prev.completedTests + 1;
              const passed = prev.passedTests + (result.status === "pass" ? 1 : 0);
              const failed = prev.failedTests + (result.status === "fail" ? 1 : 0);
              const skipped = prev.skippedTests + (result.status === "skip" ? 1 : 0);
              
              return {
                ...prev,
                completedTests: completed,
                passedTests: passed,
                failedTests: failed,
                skippedTests: skipped,
                pendingTests: prev.totalTests - completed,
                progress: Math.round((completed / prev.totalTests) * 100),
                results: [...prev.results, result],
              };
            });
          },
          onLog: (entry) => {
            addLog(entry);
          },
        },
        abortControllerRef.current.signal
      );

      const report = generateRunReport(results, startTimeRef.current);
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentTest: null,
        report,
      }));

      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        message: `=== ${categoryId} Complete: ${report.summary.passed} passed, ${report.summary.failed} failed ===`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog({
        timestamp: new Date().toISOString(),
        level: "fail",
        message: `Category run aborted: ${message}`,
      });
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentTest: null,
      }));
    } finally {
      stopTimer();
    }
  }, [getFilteredTests, addLog, startTimer, stopTimer]);

  // Stop running tests
  const stopTests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "Test run stopped by user",
      });
    }
    stopTimer();
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentCategory: null,
      currentTest: null,
    }));
  }, [addLog, stopTimer]);

  // Reset state
  const reset = useCallback(() => {
    stopTimer();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      ...initialState,
      totalTests: getFilteredTests().length,
      pendingTests: getFilteredTests().length,
    });
  }, [getFilteredTests, stopTimer]);

  // Update filters
  const setFilters = useCallback((filters: Partial<TestFilters>) => {
    setState(prev => ({
      ...prev,
      filters,
      totalTests: filterTests(getAllTests(), filters).length,
      pendingTests: filterTests(getAllTests(), filters).length,
    }));
  }, []);

  // Toggle role filter
  const toggleRoleFilter = useCallback((role: TestRole) => {
    setState(prev => {
      const currentRoles = prev.filters.roles || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      
      const newFilters = { ...prev.filters, roles: newRoles.length > 0 ? newRoles : undefined };
      const filteredTests = filterTests(getAllTests(), newFilters);
      
      return {
        ...prev,
        filters: newFilters,
        totalTests: filteredTests.length,
        pendingTests: filteredTests.length,
      };
    });
  }, []);

  // Toggle module filter
  const toggleModuleFilter = useCallback((module: TestModule) => {
    setState(prev => {
      const currentModules = prev.filters.modules || [];
      const newModules = currentModules.includes(module)
        ? currentModules.filter(m => m !== module)
        : [...currentModules, module];
      
      const newFilters = { ...prev.filters, modules: newModules.length > 0 ? newModules : undefined };
      const filteredTests = filterTests(getAllTests(), newFilters);
      
      return {
        ...prev,
        filters: newFilters,
        totalTests: filteredTests.length,
        pendingTests: filteredTests.length,
      };
    });
  }, []);

  // Export as JSON
  const exportJson = useCallback(() => {
    if (!state.report) {
      // Generate report from current results
      const report = generateRunReport(state.results, startTimeRef.current || Date.now());
      const json = exportResultsAsJson(report);
      downloadFile(json, `regression-test-${report.runId}.json`, "application/json");
    } else {
      const json = exportResultsAsJson(state.report);
      downloadFile(json, `regression-test-${state.report.runId}.json`, "application/json");
    }
  }, [state.report, state.results]);

  // Export as CSV
  const exportCsv = useCallback(() => {
    const csv = exportResultsAsCsv(state.results);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadFile(csv, `regression-test-${timestamp}.csv`, "text/csv");
  }, [state.results]);

  // Initialize test count on mount
  const initializeTestCount = useCallback(() => {
    const tests = getFilteredTests();
    setState(prev => ({
      ...prev,
      totalTests: tests.length,
      pendingTests: tests.length,
    }));
  }, [getFilteredTests]);

  return {
    // State
    ...state,
    
    // Computed
    categories: getCategories(),
    roleCounts: getRoleCounts(),
    moduleCounts: getModuleCounts(),
    filteredTests: getFilteredTests(),
    formattedDuration: formatDuration(state.duration),
    
    // Actions
    runAllTests,
    runCategoryTests,
    stopTests,
    reset,
    setFilters,
    toggleRoleFilter,
    toggleModuleFilter,
    exportJson,
    exportCsv,
    initializeTestCount,
    
    // Constants
    ROLE_DISPLAY_NAMES,
    MODULE_DISPLAY_NAMES,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
