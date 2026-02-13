/**
 * Regression Test Kit Page
 * 
 * Comprehensive regression testing UI with:
 * - Summary cards for test counts
 * - Progress bar with current test display
 * - Filtering by role and module
 * - Category accordion with per-category run
 * - Execution log with color-coded entries
 * - Export to JSON/CSV
 */

import { useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Clock,
  MinusCircle,
  Loader2,
} from "lucide-react";
import { useRegressionTestKit } from "@/hooks/useRegressionTestKit";
import { TestRole, TestStatus } from "@/services/regressionTestKit/types";
import { cn } from "@/lib/utils";

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }: { status: TestStatus }) {
  const config: Record<TestStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
    pending: { icon: Clock, label: "Pending", className: "bg-muted text-muted-foreground" },
    running: { icon: Loader2, label: "Running", className: "bg-primary/20 text-primary" },
    pass: { icon: CheckCircle2, label: "Pass", className: "bg-chart-2/20 text-chart-2" },
    fail: { icon: XCircle, label: "Fail", className: "bg-destructive/20 text-destructive" },
    skip: { icon: MinusCircle, label: "Skip", className: "bg-chart-4/20 text-chart-4" },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {label}
    </Badge>
  );
}

// ============================================================================
// LOG ENTRY COMPONENT
// ============================================================================

function LogEntry({ entry }: { entry: { timestamp: string; level: string; message: string } }) {
  const levelColors: Record<string, string> = {
    info: "text-muted-foreground",
    pass: "text-chart-2",
    fail: "text-destructive",
    skip: "text-chart-4",
    warn: "text-chart-4",
  };

  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div className={cn("font-mono text-xs", levelColors[entry.level] || "text-foreground")}>
      <span className="text-muted-foreground">[{time}]</span> {entry.message}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RegressionTestKitPage() {
  const {
    // State
    isRunning,
    progress,
    totalTests,
    completedTests,
    passedTests,
    failedTests,
    skippedTests,
    pendingTests,
    currentTest,
    results,
    logs,
    filters,
    formattedDuration,
    
    // Computed
    categories,
    roleCounts,
    
    // Actions
    runAllTests,
    runCategoryTests,
    stopTests,
    reset,
    toggleRoleFilter,
    exportJson,
    exportCsv,
    initializeTestCount,
    
    // Constants
    ROLE_DISPLAY_NAMES,
  } = useRegressionTestKit();

  // Initialize test count on mount
  useEffect(() => {
    initializeTestCount();
  }, [initializeTestCount]);

  // Get results for a specific category
  const getResultsForCategory = (categoryId: string) => {
    return results.filter(r => r.category === categoryId);
  };

  // Get category status
  const getCategoryStatus = (categoryId: string): "not_started" | "running" | "complete" | "partial" => {
    const categoryResults = getResultsForCategory(categoryId);
    if (categoryResults.length === 0) return "not_started";
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return "not_started";
    
    if (categoryResults.length < category.tests.length) {
      return isRunning ? "running" : "partial";
    }
    return "complete";
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regression Test Kit</h1>
          <p className="text-muted-foreground">
            Comprehensive baseline verification for all system features
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTests}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-chart-2">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">{passedTests}</div>
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
              <CardTitle className="text-sm font-medium text-chart-4">Skipped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-4">{skippedTests}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTests}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formattedDuration || "--"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning || totalTests === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Run All
          </Button>
          
          <Button
            variant="destructive"
            onClick={stopTests}
            disabled={!isRunning}
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
          
          <Button
            variant="outline"
            onClick={reset}
            disabled={isRunning}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={results.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportJson}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCsv}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Bar */}
        {(isRunning || completedTests > 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress}% complete</span>
                  <span>{completedTests} / {totalTests}</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentTest && (
                  <p className="text-sm text-muted-foreground truncate">
                    Running: {currentTest}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(roleCounts) as TestRole[]).map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!filters.roles || filters.roles.includes(role)}
                    onCheckedChange={() => toggleRoleFilter(role)}
                    disabled={isRunning}
                  />
                  <span className="text-sm">
                    {ROLE_DISPLAY_NAMES[role]} ({roleCounts[role]})
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {categories.map((category) => {
                const categoryResults = getResultsForCategory(category.id);
                const categoryStatus = getCategoryStatus(category.id);
                const passed = categoryResults.filter(r => r.status === "pass").length;
                const failed = categoryResults.filter(r => r.status === "fail").length;
                
                return (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="secondary" className="font-normal">
                            {category.tests.length} tests
                          </Badge>
                          {categoryStatus === "complete" && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                failed > 0 
                                  ? "bg-destructive/20 text-destructive" 
                                  : "bg-chart-2/20 text-chart-2"
                              )}
                            >
                              {passed}/{category.tests.length} passed
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            runCategoryTests(category.id);
                          }}
                          disabled={isRunning}
                          className="h-7"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4">
                        <div className="relative overflow-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="w-20">Time</TableHead>
                                <TableHead>Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.tests.map((test) => {
                                const result = results.find(r => r.id === test.id);
                                return (
                                  <TableRow key={test.id}>
                                    <TableCell className="font-mono text-xs">{test.id}</TableCell>
                                    <TableCell className="text-sm">{test.name}</TableCell>
                                    <TableCell>
                                      <StatusBadge status={result?.status || "pending"} />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {result?.duration ? `${result.duration}ms` : "-"}
                                    </TableCell>
                                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                                      {result?.error || "-"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Execution Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px] p-4">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No logs yet. Run tests to see execution logs.
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((entry, index) => (
                    <LogEntry key={index} entry={entry} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
