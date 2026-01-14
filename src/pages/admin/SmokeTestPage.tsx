import * as React from "react";
import { Check, X, CircleDashed, RotateCcw, ExternalLink, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";

// Test status types
type TestStatus = "not_tested" | "pass" | "fail";

interface TestCase {
  id: string;
  operation: "create" | "read" | "update" | "deactivate" | "restore";
  label: string;
  status: TestStatus;
  testedAt?: string;
  notes?: string;
}

interface ModuleTestSuite {
  id: string;
  name: string;
  path: string;
  tests: TestCase[];
}

// Define all master data modules and their test cases
const createModuleTests = (): ModuleTestSuite[] => [
  {
    id: "countries",
    name: "Countries",
    path: "/admin/master-data/countries",
    tests: [
      { id: "countries-read", operation: "read", label: "View list", status: "not_tested" },
      { id: "countries-create", operation: "create", label: "Create new", status: "not_tested" },
      { id: "countries-update", operation: "update", label: "Edit existing", status: "not_tested" },
      { id: "countries-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
      { id: "countries-restore", operation: "restore", label: "Restore", status: "not_tested" },
    ],
  },
  {
    id: "industry-segments",
    name: "Industry Segments",
    path: "/admin/master-data/industry-segments",
    tests: [
      { id: "industry-read", operation: "read", label: "View list", status: "not_tested" },
      { id: "industry-create", operation: "create", label: "Create new", status: "not_tested" },
      { id: "industry-update", operation: "update", label: "Edit existing", status: "not_tested" },
      { id: "industry-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
      { id: "industry-restore", operation: "restore", label: "Restore", status: "not_tested" },
    ],
  },
  {
    id: "organization-types",
    name: "Organization Types",
    path: "/admin/master-data/organization-types",
    tests: [
      { id: "org-read", operation: "read", label: "View list", status: "not_tested" },
      { id: "org-create", operation: "create", label: "Create new", status: "not_tested" },
      { id: "org-update", operation: "update", label: "Edit existing", status: "not_tested" },
      { id: "org-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
      { id: "org-restore", operation: "restore", label: "Restore", status: "not_tested" },
    ],
  },
  {
    id: "participation-modes",
    name: "Participation Modes",
    path: "/admin/master-data/participation-modes",
    tests: [
      { id: "modes-read", operation: "read", label: "View list", status: "not_tested" },
      { id: "modes-create", operation: "create", label: "Create new", status: "not_tested" },
      { id: "modes-update", operation: "update", label: "Edit existing", status: "not_tested" },
      { id: "modes-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
      { id: "modes-restore", operation: "restore", label: "Restore", status: "not_tested" },
    ],
  },
  {
    id: "expertise-levels",
    name: "Expertise Levels",
    path: "/admin/master-data/expertise-levels",
    tests: [
      { id: "expertise-read", operation: "read", label: "View list", status: "not_tested" },
      { id: "expertise-create", operation: "create", label: "Create new", status: "not_tested" },
      { id: "expertise-update", operation: "update", label: "Edit existing", status: "not_tested" },
      { id: "expertise-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
      { id: "expertise-restore", operation: "restore", label: "Restore", status: "not_tested" },
    ],
  },
  {
    id: "academic-taxonomy",
    name: "Academic Taxonomy",
    path: "/admin/master-data/academic-taxonomy",
    tests: [
      { id: "academic-disciplines-read", operation: "read", label: "View Disciplines", status: "not_tested" },
      { id: "academic-disciplines-create", operation: "create", label: "Create Discipline", status: "not_tested" },
      { id: "academic-streams-read", operation: "read", label: "View Streams", status: "not_tested" },
      { id: "academic-streams-create", operation: "create", label: "Create Stream", status: "not_tested" },
      { id: "academic-subjects-read", operation: "read", label: "View Subjects", status: "not_tested" },
      { id: "academic-subjects-create", operation: "create", label: "Create Subject", status: "not_tested" },
    ],
  },
  {
    id: "proficiency-taxonomy",
    name: "Proficiency Taxonomy",
    path: "/admin/master-data/proficiency-taxonomy",
    tests: [
      { id: "proficiency-areas-read", operation: "read", label: "View Areas", status: "not_tested" },
      { id: "proficiency-areas-create", operation: "create", label: "Create Area", status: "not_tested" },
      { id: "proficiency-subdomains-read", operation: "read", label: "View Sub-domains", status: "not_tested" },
      { id: "proficiency-subdomains-create", operation: "create", label: "Create Sub-domain", status: "not_tested" },
      { id: "proficiency-specialities-read", operation: "read", label: "View Specialities", status: "not_tested" },
      { id: "proficiency-specialities-create", operation: "create", label: "Create Speciality", status: "not_tested" },
    ],
  },
  {
    id: "question-bank",
    name: "Question Bank",
    path: "/admin/questions",
    tests: [
      { id: "questions-read", operation: "read", label: "View questions", status: "not_tested" },
      { id: "questions-create", operation: "create", label: "Create question", status: "not_tested" },
      { id: "questions-update", operation: "update", label: "Edit question", status: "not_tested" },
      { id: "questions-deactivate", operation: "deactivate", label: "Deactivate", status: "not_tested" },
    ],
  },
  {
    id: "invitations",
    name: "Invitations",
    path: "/admin/invitations",
    tests: [
      { id: "invitations-read", operation: "read", label: "View invitations", status: "not_tested" },
      { id: "invitations-create", operation: "create", label: "Send invitation", status: "not_tested" },
    ],
  },
];

const STORAGE_KEY = "admin-smoke-test-results";

export default function SmokeTestPage() {
  const [modules, setModules] = React.useState<ModuleTestSuite[]>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return createModuleTests();
      }
    }
    return createModuleTests();
  });

  // Save to localStorage whenever modules change
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  }, [modules]);

  const updateTestStatus = (moduleId: string, testId: string, status: TestStatus) => {
    setModules((prev) =>
      prev.map((mod) =>
        mod.id === moduleId
          ? {
              ...mod,
              tests: mod.tests.map((test) =>
                test.id === testId
                  ? { ...test, status, testedAt: new Date().toISOString() }
                  : test
              ),
            }
          : mod
      )
    );
    
    const statusLabel = status === "pass" ? "Pass ✓" : status === "fail" ? "Fail ✗" : "Reset";
    toast.success(`Test marked as ${statusLabel}`);
  };

  const resetAllTests = () => {
    setModules(createModuleTests());
    toast.success("All test results cleared");
  };

  // Calculate statistics
  const allTests = modules.flatMap((m) => m.tests);
  const totalTests = allTests.length;
  const passedTests = allTests.filter((t) => t.status === "pass").length;
  const failedTests = allTests.filter((t) => t.status === "fail").length;
  const untestedTests = allTests.filter((t) => t.status === "not_tested").length;
  const progressPercent = totalTests > 0 ? ((passedTests + failedTests) / totalTests) * 100 : 0;

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "pass":
        return <Check className="h-4 w-4 text-green-600" />;
      case "fail":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getModuleStatus = (module: ModuleTestSuite) => {
    const passed = module.tests.filter((t) => t.status === "pass").length;
    const failed = module.tests.filter((t) => t.status === "fail").length;
    const total = module.tests.length;

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

  return (
    <AdminLayout
      title="Smoke Test Checklist"
      description="Manual test checklist for master data CRUD operations"
      breadcrumbs={[{ label: "Smoke Test" }]}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
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
            <div className="text-2xl font-bold text-muted-foreground">{untestedTests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Test Progress</CardTitle>
            <Button variant="outline" size="sm" onClick={resetAllTests}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {passedTests + failedTests} of {totalTests} tests completed ({Math.round(progressPercent)}%)
          </p>
        </CardContent>
      </Card>

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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={test.status === "pass" ? "default" : "outline"}
                                size="sm"
                                className={test.status === "pass" ? "bg-green-600 hover:bg-green-700" : ""}
                                onClick={() => updateTestStatus(module.id, test.id, "pass")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Pass</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={test.status === "fail" ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => updateTestStatus(module.id, test.id, "fail")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark as Fail</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateTestStatus(module.id, test.id, "not_tested")}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reset</TooltipContent>
                          </Tooltip>
                        </div>
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
