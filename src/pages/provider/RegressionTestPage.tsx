/**
 * Regression Test Page for Solution Providers
 * Comprehensive enrollment lifecycle testing UI
 */

import { AppLayout } from "@/components/layout/AppLayout";
import { useEnrollmentTestRunner } from "@/hooks/useEnrollmentTestRunner";
import { testCategories, getTotalTestCount } from "@/services/enrollmentTestRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Play, 
  Square, 
  RotateCcw, 
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

export default function RegressionTestPage() {
  const {
    isRunning,
    progress,
    totalTests,
    completedTests,
    passedTests,
    failedTests,
    skippedTests,
    results,
    logs,
    currentCategory,
    currentTest,
    runAllTests,
    runCategoryTests,
    cancelTests,
    reset,
    getTestStatus,
    exportResults,
  } = useEnrollmentTestRunner();

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const remainingTests = totalTests - completedTests;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regression Test Suite</h1>
          <p className="text-muted-foreground">
            Enrollment lifecycle validation tests
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tests</CardDescription>
              <CardTitle className="text-3xl">{getTotalTestCount()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Passed</CardDescription>
              <CardTitle className="text-3xl text-green-600">{passedTests}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-3xl text-red-600">{failedTests}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Skipped</CardDescription>
              <CardTitle className="text-3xl text-amber-600">{skippedTests}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Remaining</CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">{remainingTests}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Progress and Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {isRunning ? (
                      <>Running: {currentTest || currentCategory}</>
                    ) : completedTests > 0 ? (
                      <>Completed: {passRate}% pass rate</>
                    ) : (
                      "Ready to run tests"
                    )}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {!isRunning ? (
                  <>
                    <Button onClick={runAllTests} className="gap-2">
                      <Play className="h-4 w-4" />
                      Run All Tests
                    </Button>
                    <Button variant="outline" onClick={reset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    {results.length > 0 && (
                      <Button variant="outline" onClick={exportResults} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Results
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="destructive" onClick={cancelTests} className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop Tests
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Log */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Execution Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={logContainerRef}
                className="h-48 overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs"
              >
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "py-0.5",
                      log.includes("✓") && "text-green-600",
                      log.includes("✗") && "text-red-600",
                      log.includes("⊘") && "text-amber-600",
                      log.includes("===") && "font-semibold text-primary",
                      log.includes("---") && "text-muted-foreground",
                    )}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Test Categories</CardTitle>
            <CardDescription>
              Click a category to expand and see individual tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {testCategories.map((category) => {
                const categoryResults = results.filter(r => r.categoryId === category.id);
                const categoryPassed = categoryResults.filter(r => r.status === "pass").length;
                const categoryFailed = categoryResults.filter(r => r.status === "fail").length;
                const categorySkipped = categoryResults.filter(r => r.status === "skipped").length;
                const isCurrentCategory = currentCategory === category.name;

                return (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 w-full pr-4">
                        <div className="flex-1 text-left">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrentCategory && isRunning && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {categoryPassed > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {categoryPassed} passed
                            </Badge>
                          )}
                          {categoryFailed > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {categoryFailed} failed
                            </Badge>
                          )}
                          {categorySkipped > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {categorySkipped} skipped
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {category.tests.length} tests
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              runCategoryTests(category.id);
                            }}
                            disabled={isRunning}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Test Name</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[80px]">Time</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.tests.map((test) => {
                            const result = results.find(r => r.testId === test.id);
                            const status = getTestStatus(test.id);

                            return (
                              <TableRow key={test.id}>
                                <TableCell className="font-mono text-xs">
                                  {test.id}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{test.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {test.description}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <TestStatusBadge status={status} />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {result?.duration ? `${result.duration}ms` : "-"}
                                </TableCell>
                                <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                                  {result?.error || "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function TestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pass":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </Badge>
      );
    case "fail":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" />
          Fail
        </Badge>
      );
    case "skipped":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <SkipForward className="h-3 w-3" />
          Skipped
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}
