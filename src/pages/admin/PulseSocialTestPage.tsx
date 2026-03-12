/**
 * Industry Pulse Social Channel Test Dashboard
 * Comprehensive test suite UI for social networking features
 */

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Square,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import { usePulseSocialTestRunner } from "@/hooks/usePulseSocialTestRunner";
import { cn } from "@/lib/utils";

export default function PulseSocialTestPage() {
  const {
    state,
    testCategories,
    runAllTests,
    runCategoryTests,
    cancelTests,
    reset,
    getStats,
    exportResults,
  } = usePulseSocialTestRunner();

  const stats = useMemo(() => getStats(), [getStats, state.results, state.completedTests]);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "pass":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pass
          </Badge>
        );
      case "fail":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Fail
          </Badge>
        );
      case "skip":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Skip
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Activity className="w-3 h-3 mr-1 animate-pulse" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "skip":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Social Channel Test
            </h1>
            <p className="text-muted-foreground">
              Comprehensive test suite for Industry Pulse social features
            </p>
          </div>
          <div className="flex gap-2">
            {!state.isRunning ? (
              <>
                <Button onClick={runAllTests} className="gap-2">
                  <Play className="h-4 w-4" />
                  Run All Tests
                </Button>
                {state.completedTests > 0 && (
                  <>
                    <Button variant="outline" onClick={reset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button variant="outline" onClick={exportResults} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Button variant="destructive" onClick={cancelTests} className="gap-2">
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Tests</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {(state.isRunning || state.completedTests > 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {state.isRunning && state.currentTestName
                      ? `Running: ${state.currentTestName}`
                      : state.completedAt
                      ? "Test run completed"
                      : "Ready"}
                  </span>
                  <span className="text-muted-foreground">
                    {state.completedTests} / {state.totalTests}
                  </span>
                </div>
                <Progress value={state.progress} className="h-2" />
                {stats.duration > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    Total time: {(stats.duration / 1000).toFixed(2)}s
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Categories Accordion */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Categories</CardTitle>
                <CardDescription>
                  {testCategories.length} categories with{" "}
                  {testCategories.reduce((sum, cat) => sum + cat.tests.length, 0)} tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {testCategories.map((category) => {
                    const categoryResults = category.tests.map(
                      (t) => state.results.get(t.id)?.status
                    );
                    const passed = categoryResults.filter((r) => r === "pass").length;
                    const failed = categoryResults.filter((r) => r === "fail").length;
                    const skipped = categoryResults.filter((r) => r === "skip").length;

                    return (
                      <AccordionItem key={category.id} value={category.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{category.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {category.tests.length} tests
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {passed > 0 && (
                                <span className="text-xs text-green-600">{passed} ✓</span>
                              )}
                              {failed > 0 && (
                                <span className="text-xs text-red-600">{failed} ✗</span>
                              )}
                              {skipped > 0 && (
                                <span className="text-xs text-yellow-600">{skipped} ⊘</span>
                              )}
                              {!state.isRunning && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    runCategoryTests(category.id);
                                  }}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">ID</TableHead>
                                <TableHead>Test Name</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="w-20 text-right">Time</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.tests.map((test) => {
                                const result = state.results.get(test.id);
                                const isCurrentTest = state.currentTestId === test.id;

                                return (
                                  <TableRow
                                    key={test.id}
                                    className={cn(
                                      isCurrentTest && "bg-blue-50 dark:bg-blue-950/20"
                                    )}
                                  >
                                    <TableCell className="font-mono text-xs">
                                      {test.id}
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">{test.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {test.description}
                                        </div>
                                        {result?.error && (
                                          <div className="text-xs text-red-600 mt-1">
                                            {result.error}
                                          </div>
                                        )}
                                        {result?.details && (
                                          <div className="text-xs text-yellow-600 mt-1">
                                            {result.details}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(
                                        isCurrentTest ? "running" : result?.status
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                      {result?.duration ? `${result.duration}ms` : "-"}
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

          {/* Execution Log */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Execution Log</CardTitle>
                <CardDescription>{state.logs.length} entries</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  <div className="space-y-1 font-mono text-xs">
                    {state.logs.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">
                        Run tests to see execution log
                      </p>
                    ) : (
                      state.logs.map((log, i) => (
                        <div
                          key={i}
                          className={cn(
                            "py-1 border-b border-border/50",
                            getLogLevelStyle(log.level)
                          )}
                        >
                          <span className="text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>{" "}
                          {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
