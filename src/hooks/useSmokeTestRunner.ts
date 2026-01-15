import { useState, useCallback, useRef } from "react";
import { moduleTestConfigs, TestResult, TestStatus, ModuleTestSuite, TestCase } from "@/services/smokeTestRunner";

export interface AutomatedTestResult {
  moduleId: string;
  testId: string;
  status: "pass" | "fail";
  duration: number;
  error?: string;
}

export interface RunnerState {
  isRunning: boolean;
  isCancelled: boolean;
  currentModule: string | null;
  currentTest: string | null;
  progress: number;
  totalTests: number;
  completedTests: number;
  results: AutomatedTestResult[];
  logs: string[];
}

const initialState: RunnerState = {
  isRunning: false,
  isCancelled: false,
  currentModule: null,
  currentTest: null,
  progress: 0,
  totalTests: 0,
  completedTests: 0,
  results: [],
  logs: [],
};

export function useSmokeTestRunner() {
  const [state, setState] = useState<RunnerState>(initialState);
  const cancelledRef = useRef(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${message}`],
    }));
  }, []);

  const updateTestResult = useCallback((moduleId: string, testId: string, result: TestResult) => {
    setState((prev) => ({
      ...prev,
      results: [
        ...prev.results,
        {
          moduleId,
          testId,
          status: result.status,
          duration: result.duration,
          error: result.error,
        },
      ],
      completedTests: prev.completedTests + 1,
      progress: ((prev.completedTests + 1) / prev.totalTests) * 100,
    }));
  }, []);

  const runModuleTests = useCallback(
    async (moduleId: string): Promise<AutomatedTestResult[]> => {
      const moduleConfig = moduleTestConfigs.find((m) => m.id === moduleId);
      if (!moduleConfig) {
        throw new Error(`Module ${moduleId} not found`);
      }

      const results: AutomatedTestResult[] = [];
      
      setState((prev) => ({
        ...prev,
        isRunning: true,
        currentModule: moduleConfig.name,
        totalTests: moduleConfig.tests.length,
        completedTests: 0,
        progress: 0,
        results: [],
        logs: [],
      }));
      cancelledRef.current = false;

      addLog(`Starting tests for ${moduleConfig.name}...`);

      try {
        for (const test of moduleConfig.tests) {
          if (cancelledRef.current) {
            addLog("Tests cancelled by user");
            break;
          }

          setState((prev) => ({
            ...prev,
            currentTest: test.label,
          }));

          addLog(`Running: ${test.label}`);

          const result = await test.run();
          results.push({
            moduleId,
            testId: test.id,
            status: result.status,
            duration: result.duration,
            error: result.error,
          });

          updateTestResult(moduleId, test.id, result);

          if (result.status === "pass") {
            addLog(`✓ ${test.label} passed (${result.duration}ms)`);
          } else {
            addLog(`✗ ${test.label} failed: ${result.error}`);
          }
        }

        // Cleanup
        addLog("Cleaning up test data...");
        await moduleConfig.cleanup();
        addLog("Cleanup complete");
      } catch (error: any) {
        addLog(`Error during tests: ${error.message}`);
      }

      setState((prev) => ({
        ...prev,
        isRunning: false,
        currentModule: null,
        currentTest: null,
      }));

      return results;
    },
    [addLog, updateTestResult]
  );

  const runAllTests = useCallback(async (): Promise<AutomatedTestResult[]> => {
    const allResults: AutomatedTestResult[] = [];
    const totalTestCount = moduleTestConfigs.reduce((acc, m) => acc + m.tests.length, 0);

    setState({
      isRunning: true,
      isCancelled: false,
      currentModule: null,
      currentTest: null,
      progress: 0,
      totalTests: totalTestCount,
      completedTests: 0,
      results: [],
      logs: [],
    });
    cancelledRef.current = false;

    addLog("=== Starting Automated Smoke Tests ===");
    addLog(`Total modules: ${moduleTestConfigs.length}, Total tests: ${totalTestCount}`);

    for (const moduleConfig of moduleTestConfigs) {
      if (cancelledRef.current) {
        addLog("Tests cancelled by user");
        break;
      }

      setState((prev) => ({
        ...prev,
        currentModule: moduleConfig.name,
      }));

      addLog(`\n--- ${moduleConfig.name} ---`);

      try {
        for (const test of moduleConfig.tests) {
          if (cancelledRef.current) {
            addLog("Tests cancelled by user");
            break;
          }

          setState((prev) => ({
            ...prev,
            currentTest: test.label,
          }));

          addLog(`Running: ${test.label}`);

          const result = await test.run();
          const testResult: AutomatedTestResult = {
            moduleId: moduleConfig.id,
            testId: test.id,
            status: result.status,
            duration: result.duration,
            error: result.error,
          };
          allResults.push(testResult);

          setState((prev) => ({
            ...prev,
            results: [...prev.results, testResult],
            completedTests: prev.completedTests + 1,
            progress: ((prev.completedTests + 1) / totalTestCount) * 100,
          }));

          if (result.status === "pass") {
            addLog(`✓ ${test.label} passed (${result.duration}ms)`);
          } else {
            addLog(`✗ ${test.label} failed: ${result.error}`);
          }
        }

        // Cleanup after each module
        addLog("Cleaning up...");
        await moduleConfig.cleanup();
      } catch (error: any) {
        addLog(`Error in ${moduleConfig.name}: ${error.message}`);
      }
    }

    const passedCount = allResults.filter((r) => r.status === "pass").length;
    const failedCount = allResults.filter((r) => r.status === "fail").length;

    addLog(`\n=== Test Run Complete ===`);
    addLog(`Passed: ${passedCount}, Failed: ${failedCount}, Total: ${allResults.length}`);

    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentModule: null,
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

  // Convert results to ModuleTestSuite format for UI
  const getModulesWithResults = useCallback((): ModuleTestSuite[] => {
    return moduleTestConfigs.map((config) => ({
      id: config.id,
      name: config.name,
      path: config.path,
      tests: config.tests.map((test): TestCase => {
        const result = state.results.find(
          (r) => r.moduleId === config.id && r.testId === test.id
        );
        
        let status: TestStatus = "not_tested";
        if (state.currentModule === config.name && state.currentTest === test.label) {
          status = "running";
        } else if (result) {
          status = result.status;
        }

        return {
          id: test.id,
          operation: test.operation as TestCase["operation"],
          label: test.label,
          status,
          duration: result?.duration,
          error: result?.error,
          testedAt: result ? new Date().toISOString() : undefined,
        };
      }),
    }));
  }, [state.results, state.currentModule, state.currentTest]);

  return {
    ...state,
    runAllTests,
    runModuleTests,
    cancelTests,
    reset,
    getModulesWithResults,
  };
}
