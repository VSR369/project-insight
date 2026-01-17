/**
 * Lifecycle Rules Reference Page
 * Read-only display of all lifecycle thresholds, locks, and cascade rules
 */

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lock, 
  Unlock, 
  ArrowRight, 
  AlertTriangle, 
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { LIFECYCLE_RANKS, LOCK_THRESHOLDS } from "@/services/lifecycleService";

export default function LifecycleRulesPage() {
  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lifecycle Rules Reference</h1>
          <p className="text-muted-foreground">
            Understanding enrollment lifecycle, lock thresholds, and cascade rules
          </p>
        </div>

        <Tabs defaultValue="ranks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranks">Lifecycle Ranks</TabsTrigger>
            <TabsTrigger value="locks">Lock Thresholds</TabsTrigger>
            <TabsTrigger value="cascade">Cascade Rules</TabsTrigger>
            <TabsTrigger value="deletion">Deletion Rules</TabsTrigger>
          </TabsList>

          {/* Lifecycle Ranks */}
          <TabsContent value="ranks">
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Status Ranks</CardTitle>
                <CardDescription>
                  Each lifecycle status has a numerical rank that determines what actions are allowed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(LIFECYCLE_RANKS)
                      .sort(([, a], [, b]) => a - b)
                      .map(([status, rank]) => (
                        <TableRow key={status}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {status.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getStatusDescription(status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStageVariant(rank)}>
                              {getStageName(rank)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lock Thresholds */}
          <TabsContent value="locks">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lock Thresholds</CardTitle>
                  <CardDescription>
                    These thresholds determine when fields become read-only
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Fields Affected</TableHead>
                        <TableHead>Trigger Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Configuration Lock</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">≥ {LOCK_THRESHOLDS.CONFIGURATION}</Badge>
                        </TableCell>
                        <TableCell>
                          Industry, Mode, Organization, Expertise Level, Proficiency Areas
                        </TableCell>
                        <TableCell>assessment_in_progress</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Content Lock</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">≥ {LOCK_THRESHOLDS.CONTENT}</Badge>
                        </TableCell>
                        <TableCell>
                          Proof Points, Specialities, Supporting Documents
                        </TableCell>
                        <TableCell>assessment_in_progress</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Everything Lock</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">≥ {LOCK_THRESHOLDS.EVERYTHING}</Badge>
                        </TableCell>
                        <TableCell>
                          All fields including registration data
                        </TableCell>
                        <TableCell>verified / certified</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Field Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Badge variant="secondary">Registration</Badge>
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• First Name</li>
                        <li>• Last Name</li>
                        <li>• Country</li>
                        <li>• Is Student</li>
                        <li>• Student Profile</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Badge variant="secondary">Configuration</Badge>
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Industry Segment</li>
                        <li>• Participation Mode</li>
                        <li>• Organization Info</li>
                        <li>• Expertise Level</li>
                        <li>• Proficiency Areas</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Badge variant="secondary">Content</Badge>
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Proof Points</li>
                        <li>• Specialities</li>
                        <li>• Supporting Files</li>
                        <li>• Supporting Links</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cascade Rules */}
          <TabsContent value="cascade">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cascade Impact Rules</CardTitle>
                  <CardDescription>
                    Changing certain fields may trigger data resets to maintain consistency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Change</TableHead>
                        <TableHead>Impact Type</TableHead>
                        <TableHead>Data Affected</TableHead>
                        <TableHead>Warning Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          Industry Segment Change
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">Hard Reset</Badge>
                        </TableCell>
                        <TableCell>
                          <ul className="text-sm space-y-1">
                            <li>• Clears Expertise Level</li>
                            <li>• Deletes Proficiency Areas</li>
                            <li>• Deletes Specialty Proof Points</li>
                            <li>• Keeps General Proof Points</li>
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Destructive
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          Expertise Level Change
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Soft Reset</Badge>
                        </TableCell>
                        <TableCell>
                          <ul className="text-sm space-y-1">
                            <li>• Deletes Specialty Proof Points</li>
                            <li>• Keeps Proficiency Areas</li>
                            <li>• Keeps General Proof Points</li>
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Warning
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          Participation Mode Change
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Conditional</Badge>
                        </TableCell>
                        <TableCell>
                          <ul className="text-sm space-y-1">
                            <li>• Individual → Org: Adds org step</li>
                            <li>• Org → Individual: Clears org data</li>
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Info className="h-3 w-3 mr-1" />
                            Info
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cascade Blocking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Changes Blocked After Assessment</p>
                      <p className="text-sm text-muted-foreground">
                        Once lifecycle rank reaches 100 (assessment_in_progress), all configuration 
                        fields are locked. Changes that would trigger cascades are prevented to 
                        maintain data integrity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deletion Rules */}
          <TabsContent value="deletion">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Deletion Rules</CardTitle>
                <CardDescription>
                  Rules that determine when an industry enrollment can be deleted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Can Delete?</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Primary Enrollment</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          is_primary = true
                        </code>
                      </TableCell>
                      <TableCell>
                        <XCircle className="h-5 w-5 text-red-500" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Must transfer primary to another enrollment first
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Only Enrollment</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          enrollment_count = 1
                        </code>
                      </TableCell>
                      <TableCell>
                        <XCircle className="h-5 w-5 text-red-500" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Provider must have at least one industry enrollment
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Assessment Started</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          lifecycle_rank ≥ 100
                        </code>
                      </TableCell>
                      <TableCell>
                        <XCircle className="h-5 w-5 text-red-500" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Cannot delete after assessment has begun
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pending Approval</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          org_approval_status = 'pending'
                        </code>
                      </TableCell>
                      <TableCell>
                        <XCircle className="h-5 w-5 text-red-500" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Must withdraw or receive approval decision first
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Valid Deletion</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          None of above
                        </code>
                      </TableCell>
                      <TableCell>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Cascades to delete all related data
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Cascade Deletion Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Proof Points (where enrollment_id matches)
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Provider Proficiency Areas (where enrollment_id matches)
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Provider Specialities (where enrollment_id matches)
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Assessment Attempts (where enrollment_id matches)
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    invited: "User has been invited but not yet registered",
    registered: "User has completed registration",
    enrolled: "User has created an industry enrollment",
    mode_selected: "User has selected participation mode",
    org_info_pending: "Organization info submitted, awaiting approval",
    org_validated: "Organization has been validated",
    expertise_selected: "User has selected expertise level",
    proof_points_started: "User has started adding proof points",
    proof_points_min_met: "Minimum proof points requirement met",
    assessment_in_progress: "User is taking the assessment",
    assessment_passed: "User has passed the assessment",
    panel_scheduled: "Interview panel has been scheduled",
    panel_completed: "Interview panel has been completed",
    verified: "User has been verified",
    certified: "User has been certified",
    not_verified: "Verification was not successful",
    active: "User is active on the platform",
    suspended: "User account is suspended",
    inactive: "User account is inactive",
  };
  return descriptions[status] || "No description available";
}

function getStageName(rank: number): string {
  if (rank < 30) return "Registration";
  if (rank < 70) return "Configuration";
  if (rank < 100) return "Profile Building";
  if (rank < 130) return "Assessment";
  if (rank < 150) return "Verification";
  return "Completed";
}

function getStageVariant(rank: number): "default" | "secondary" | "outline" | "destructive" {
  if (rank < 30) return "secondary";
  if (rank < 70) return "default";
  if (rank < 100) return "outline";
  if (rank < 150) return "default";
  return "secondary";
}
