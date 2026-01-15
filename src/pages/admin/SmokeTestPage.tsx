import * as React from "react";
import { Check, X, CircleDashed, RotateCcw, ExternalLink, ClipboardCheck, Play, Square, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSmokeTestRunner } from "@/hooks/useSmokeTestRunner";
import { TestStatus, ModuleTestSuite } from "@/services/smokeTestRunner";

export default function SmokeTestPage() {
  const {
    isRunning,
    currentModule,
    currentTest,
    progress,
    totalTests,
    completedTests,
    logs,
    results,
    runAllTests,
    runModuleTests,
    cancelTests,
    reset,
    getModulesWithResults,
  } = useSmokeTestRunner();

  const modules = getModulesWithResults();

  // Calculate statistics
  const passedTests = results.filter((r) => r.status === "pass").length;
  const failedTests = results.filter((r) => r.status === "fail").length;
  const untestedTests = totalTests - completedTests;

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "pass":
        return <Check className="h-4 w-4 text-green-600" />;
      case "fail":
        return <X className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getModuleStatus = (module: ModuleTestSuite) => {
    const passed = module.tests.filter((t) => t.status === "pass").length;
    const failed = module.tests.filter((t) => t.status === "fail").length;
    const running = module.tests.filter((t) => t.status === "running").length;
    const total = module.tests.length;

    if (running > 0) return "running";
    if (failed > 0) return "fail";
    if (passed === total) return "pass";
    if (passed > 0) return "partial";
    return "not_tested";
  };

  const getModuleStatusBadge = (module: ModuleTestSuite) => {
    const status = getModuleStatus(module);
    const passed = module.tests.filter((t) => t.status === "pass").length;
    const total = module.tests.length;

    switch (status) {
      case "running":
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "pass":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">All Passed</Badge>;
      case "fail":
        return <Badge variant="destructive">Has Failures</Badge>;
      case "partial":
        return <Badge variant="secondary">{passed}/{total} Passed</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const handleRunAll = async () => {
    await runAllTests();
  };

  const handleRunModule = async (moduleId: string) => {
    await runModuleTests(moduleId);
  };

  return (
    <AdminLayout
      title="Automated Smoke Test"
      description="Automated CRUD test suite for master data modules"
      breadcrumbs={[{ label: "Smoke Test" }]}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests || modules.reduce((acc, m) => acc + m.tests.length, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {totalTests > 0 ? untestedTests : modules.reduce((acc, m) => acc + m.tests.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Test Progress</CardTitle>
              {isRunning && currentModule && (
                <CardDescription className="mt-1">
                  Running: {currentModule} → {currentTest}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button variant="destructive" size="sm" onClick={cancelTests}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <>
                  <Button variant="default" size="sm" onClick={handleRunAll}>
                    <Play className="h-4 w-4 mr-2" />
                    Run All Tests
                  </Button>
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedTests} of {totalTests || modules.reduce((acc, m) => acc + m.tests.length, 0)} tests completed ({Math.round(progress)}%)
          </p>
        </CardContent>
      </Card>

      {/* Execution Log */}
      {logs.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Execution Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40 w-full rounded-md border bg-muted/30 p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.includes("✓")
                        ? "text-green-600"
                        : log.includes("✗")
                        ? "text-destructive"
                        : log.includes("===")
                        ? "font-bold text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {log}
                  </div>
                ))}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Test Modules */}
      <div className="space-y-6">
        {modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <CardDescription>{module.tests.length} test cases</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getModuleStatusBadge(module)}
                  {!isRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunModule(module.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to={module.path}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead>Test Case</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {module.tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>{getStatusIcon(test.status)}</TableCell>
                      <TableCell className="font-medium">{test.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {test.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {test.duration ? `${test.duration}ms` : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {test.error && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-destructive text-sm truncate block cursor-help">
                                {test.error}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-md">
                              <p className="text-sm">{test.error}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
