/**
 * SolutionRequestsPage — SCR-04 Solution Requests Queue + SCR-05 Assignment Panel
 * BRD Ref: BR-MP-ASSIGN-001–004, MOD-02
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, ArrowLeft, Clock, History } from "lucide-react";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { useSolutionRequests, useChallengeAssignments, computeTeamComposition } from "@/hooks/queries/useSolutionRequests";
import { TeamCompletionReminder } from "@/components/admin/marketplace/TeamCompletionReminder";
import { ChallengeAssignmentPanel } from "@/components/admin/marketplace/ChallengeAssignmentPanel";
import { useChallengeRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { format } from "date-fns";
import type { TeamComposition, SolutionRequestRow } from "@/hooks/queries/useSolutionRequests";

function getAssignmentStatus(team: TeamComposition) {
  if (team.isComplete) {
    return { label: "Assigned", variant: "default" as const, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200" };
  }
  if (team.total > 0) {
    return { label: "Partially Assigned", variant: "outline" as const, className: "border-amber-300 text-amber-700 dark:text-amber-400" };
  }
  return { label: "Pending Assignment", variant: "outline" as const, className: "border-blue-300 text-blue-700 dark:text-blue-400" };
}

function AssignmentPanelView({
  challenge,
  mpRoles,
  onBack,
}: {
  challenge: SolutionRequestRow;
  mpRoles: import("@/hooks/queries/useSlmRoleCodes").SlmRoleCode[];
  onBack: () => void;
}) {
  const { data: assignments } = useChallengeAssignments(challenge.id);
  const team = computeTeamComposition(
    (assignments ?? []).map((a) => ({ role_code: a.role_code, pool_member_id: a.pool_member_id })),
    mpRoles
  );

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Queue
      </button>
      <ChallengeAssignmentPanel
        challengeId={challenge.id}
        challengeTitle={challenge.title}
        orgName={challenge.org_name}
        mpRoles={mpRoles}
        assignments={assignments ?? []}
        team={team}
      />
    </div>
  );
}

export default function SolutionRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedChallenge, setSelectedChallenge] = useState<SolutionRequestRow | null>(null);
  const { data: mpRoles } = useChallengeRoleCodes("mp");
  const { data: requests, isLoading } = useSolutionRequests(mpRoles ?? []);

  // If a challenge is selected, show the Assignment Panel (SCR-05)
  if (selectedChallenge && mpRoles) {
    return (
      <div className="space-y-6">
        <AssignmentPanelView
          challenge={selectedChallenge}
          mpRoles={mpRoles}
          onBack={() => setSelectedChallenge(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Platform Admin &gt; Marketplace &gt; Solution Requests
          </nav>
          <h1 className="text-2xl font-bold text-foreground">Solution Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and assign challenge teams to incoming Marketplace solution requests.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/marketplace/assignment-history")}
          className="self-start"
        >
          <History className="h-4 w-4 mr-2" />
          View Assignment History
        </Button>
      </div>

      {/* Stale Incomplete Team Reminder */}
      {!isLoading && requests && (
        <TeamCompletionReminder requests={requests} />
      )}

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Marketplace Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase text-xs tracking-wider">Organisation Name</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider">Challenge Title</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider">Submitted At</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider">Actions</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : !requests?.length ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No Marketplace solution requests found.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                    const statusInfo = getAssignmentStatus(req.team);
                    return (
                      <TableRow
                        key={req.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedChallenge(req)}
                      >
                        <TableCell>
                          <span className="font-medium text-foreground">{req.org_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground">{req.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            {format(new Date(req.created_at), "dd MMM yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
