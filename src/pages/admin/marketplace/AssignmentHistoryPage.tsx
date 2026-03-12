/**
 * AssignmentHistoryPage — SCR-06 Assignment History
 * BRD Ref: BR-MP-ASSIGN-003–005, MOD-02
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, UserPlus, Users } from "lucide-react";
import { useSolutionRequests, useAllChallengeAssignments, computeTeamComposition, type ChallengeAssignmentRow, type TeamComposition } from "@/hooks/queries/useSolutionRequests";
import { useSlmRoleCodes, useChallengeRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import { ReassignmentModal } from "@/components/admin/marketplace/ReassignmentModal";
import { TeamCompletionBanner } from "@/components/admin/marketplace/TeamCompletionBanner";
import { AssignMemberModal } from "@/components/admin/marketplace/AssignMemberModal";
import { format } from "date-fns";

export default function AssignmentHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightChallengeId = searchParams.get("challenge");

  const { data: mpRoles } = useSlmPoolRoles();
  const { data: requests, isLoading: reqLoading } = useSolutionRequests(mpRoles ?? []);
  const { data: allAssignments, isLoading: assignLoading } = useAllChallengeAssignments();
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: availStatuses } = useAvailabilityStatuses();

  const [reassignTarget, setReassignTarget] = useState<{ assignment: ChallengeAssignmentRow; challengeTitle: string } | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ challengeId: string; challengeTitle: string; missingRoles: TeamComposition["missingRoles"] } | null>(null);

  const isLoading = reqLoading || assignLoading;

  // Group assignments by challenge_id
  const grouped = (allAssignments ?? []).reduce<Record<string, ChallengeAssignmentRow[]>>((acc, a) => {
    if (!acc[a.challenge_id]) acc[a.challenge_id] = [];
    acc[a.challenge_id].push(a);
    return acc;
  }, {});

  // Only show challenges that have assignments
  const challengesWithAssignments = (requests ?? []).filter((r) => grouped[r.id]?.length);

  const getRoleLabel = (code: string) => {
    const found = roleCodes?.find((r) => r.code === code);
    return found ? `${found.display_name} (${code})` : code;
  };

  const getAvailLabel = (status: string) => {
    const found = availStatuses?.find((s) => s.code === status);
    return found?.display_name ?? status;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/admin/marketplace/solution-requests")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Solution Requests
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          Assignment History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all challenge role assignments and team compositions.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : challengesWithAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No challenge assignments found yet. Assign teams from the Solution Requests queue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {challengesWithAssignments.map((challenge) => {
            const assignments = grouped[challenge.id] ?? [];
            const isHighlighted = highlightChallengeId === challenge.id;
            const team = computeTeamComposition(
              assignments.map((a) => ({ role_code: a.role_code, pool_member_id: a.pool_member_id })),
              mpRoles ?? []
            );

            return (
              <Card
                key={challenge.id}
                className={isHighlighted ? "ring-2 ring-primary" : ""}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{challenge.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{challenge.org_name}</p>
                    </div>
                    {assignments[0]?.assigned_at && (
                      <span className="text-xs text-muted-foreground">
                        Assigned {format(new Date(assignments[0].assigned_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    )}
                    {!team.isComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignTarget({ challengeId: challenge.id, challengeTitle: challenge.title, missingRoles: team.missingRoles })}
                      >
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        <span className="hidden lg:inline">Assign</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Team Completion Banner */}
                  <TeamCompletionBanner team={team} challengeId={challenge.id} challengeTitle={challenge.title} />

                  <div className="space-y-3">
                    {assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{a.member_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getRoleLabel(a.role_code)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.member_email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <AvailabilityBadge
                            status={a.availability_status}
                            label={getAvailLabel(a.availability_status)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary hover:text-primary/80"
                            onClick={() => setReassignTarget({ assignment: a, challengeTitle: challenge.title })}
                          >
                            Reassign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reassignment Modal */}
      {reassignTarget && (
        <ReassignmentModal
          assignment={reassignTarget.assignment}
          challengeTitle={reassignTarget.challengeTitle}
          open={!!reassignTarget}
          onOpenChange={(open) => { if (!open) setReassignTarget(null); }}
        />
      )}

      {/* Assign Member Modal */}
      {assignTarget && (
        <AssignMemberModal
          challengeId={assignTarget.challengeId}
          challengeTitle={assignTarget.challengeTitle}
          missingRoles={assignTarget.missingRoles}
          open={!!assignTarget}
          onOpenChange={(open) => { if (!open) setAssignTarget(null); }}
        />
      )}
    </div>
  );
}
