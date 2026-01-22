import * as React from "react";
import { Check, X, CircleDashed, RotateCcw, ExternalLink, ClipboardCheck, Play, Square, Loader2, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";

export default function SmokeTestPage() {
  // All hooks must be called first, before any conditional logic
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [seedResult, setSeedResult] = React.useState<any>(null);
  
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

  // Derived data (not a hook, but must come after all hooks)
  const modules = getModulesWithResults();

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-provider-test-data");
      if (error) throw error;
      setSeedResult(data);
      if (data?.success) {
        toast.success(`Test data seeded: ${data.summary.enrollments.count} enrollments, ${data.summary.proofPoints.total} proof points`);
      } else {
        toast.error(data?.error || "Seeding failed");
      }
    } catch (err: any) {
      toast.error(`Seed failed: ${err.message}`);
      setSeedResult({ success: false, error: err.message });
    } finally {
      setIsSeeding(false);
    }
  };

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
      {/* Test Data Seeder Card */}
      <Card className="mb-6 border-dashed">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Test Data Seeder
              </CardTitle>
              <CardDescription>
                Seed comprehensive test data for provider@test.local (4 enrollments, proof points, assessments, interviews)
              </CardDescription>
            </div>
            <Button 
              onClick={handleSeedTestData} 
              disabled={isSeeding}
              variant="outline"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Seed Test Data
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {seedResult && (
          <CardContent>
            <div className={`rounded-md p-3 ${seedResult.success ? 'bg-green-50 border border-green-200' : 'bg-destructive/10 border border-destructive/20'}`}>
              {seedResult.success ? (
                <div className="space-y-2">
                  <p className="font-medium text-green-800">✓ Test data seeded successfully</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-green-700">
                    <div>Enrollments: <strong>{seedResult.summary.enrollments.count}</strong></div>
                    <div>Proof Points: <strong>{seedResult.summary.proofPoints.total}</strong></div>
                    <div>Assessments: <strong>{seedResult.summary.assessments.count}</strong></div>
                    <div>Bookings: <strong>{seedResult.summary.bookings.count}</strong></div>
                  </div>
                  {seedResult.summary.enrollments.industries?.length > 0 && (
                    <p className="text-xs text-green-600">Industries: {seedResult.summary.enrollments.industries.join(", ")}</p>
                  )}
                </div>
              ) : (
                <p className="text-destructive">❌ {seedResult.error}</p>
              )}
            </div>
            {seedResult.phases && (
              <ScrollArea className="h-32 mt-3 rounded-md border bg-muted/30 p-2">
                <pre className="text-xs font-mono">
                  {seedResult.phases.map((phase: string, i: number) => (
                    <div key={i} className={phase.includes("✓") ? "text-green-600" : phase.includes("❌") ? "text-destructive" : "text-muted-foreground"}>
                      {phase}
                    </div>
                  ))}
                </pre>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>

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
