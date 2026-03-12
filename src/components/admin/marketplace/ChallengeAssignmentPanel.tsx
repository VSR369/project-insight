/**
 * SCR-05: Challenge Assignment Panel — 4 visual role slots
 * BRD Ref: BR-MP-ASSIGN-001–004, MOD-02
 * Shows required MP roles as slot cards, fill/reassign from here
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import type { ChallengeAssignmentRow, TeamComposition } from "@/hooks/queries/useSolutionRequests";
import { AssignMemberModal } from "@/components/admin/marketplace/AssignMemberModal";
import { ReassignmentModal } from "@/components/admin/marketplace/ReassignmentModal";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import { AssignmentConfirmationScreen } from "@/components/admin/marketplace/AssignmentConfirmationScreen";

interface ChallengeAssignmentPanelProps {
  challengeId: string;
  challengeTitle: string;
  orgName: string;
  mpRoles: SlmRoleCode[];
  assignments: ChallengeAssignmentRow[];
  team: TeamComposition;
}

export function ChallengeAssignmentPanel({
  challengeId,
  challengeTitle,
  orgName,
  mpRoles,
  assignments,
  team,
}: ChallengeAssignmentPanelProps) {
  const [assignTarget, setAssignTarget] = useState<{ missingRoles: TeamComposition["missingRoles"] } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<ChallengeAssignmentRow | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { data: availStatuses } = useAvailabilityStatuses();

  const getAvailLabel = (status: string) =>
    availStatuses?.find((s) => s.code === status)?.display_name ?? status;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {team.isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                {challengeTitle}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{orgName}</p>
            </div>
            <Badge
              variant="outline"
              className={team.isComplete
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-amber-300 text-amber-700 dark:text-amber-400"
              }
            >
              {team.isComplete ? "Team Complete" : `${team.missingRoles.length} role(s) missing`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {mpRoles.map((role) => {
              const roleAssignments = assignments.filter((a) => a.role_code === role.code);
              const required = role.min_required;
              const filled = roleAssignments.length;
              const isFilled = filled >= required;

              return (
                <div
                  key={role.code}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isFilled
                      ? "border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-950/20"
                      : "border-dashed border-muted-foreground/30 bg-muted/20"
                  }`}
                >
                  {/* Role header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{role.display_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{role.code}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${isFilled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}
                    >
                      {filled}/{required}
                    </Badge>
                  </div>

                  {/* Assigned members */}
                  {roleAssignments.length > 0 ? (
                    <div className="space-y-2">
                      {roleAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{a.member_name}</p>
                            <AvailabilityBadge
                              status={a.availability_status}
                              label={getAvailLabel(a.availability_status)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title="Reassign"
                            onClick={() => setReassignTarget(a)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center">
                      <UserMinus className="h-5 w-5 text-muted-foreground/50 mb-1" />
                      <p className="text-[10px] text-muted-foreground">Unassigned</p>
                    </div>
                  )}

                  {/* Fill slot button */}
                  {!isFilled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() =>
                        setAssignTarget({
                          missingRoles: [{ role: role.code, displayName: role.display_name, required, assigned: filled }],
                        })
                      }
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Assign {role.display_name}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assign Member Modal */}
      {assignTarget && (
        <AssignMemberModal
          challengeId={challengeId}
          challengeTitle={challengeTitle}
          orgId={assignments[0]?.domain_scope ? undefined : undefined}
          missingRoles={assignTarget.missingRoles}
          open={!!assignTarget}
          onOpenChange={(open) => { if (!open) setAssignTarget(null); }}
        />
      )}

      {/* Reassignment Modal */}
      {reassignTarget && (
        <ReassignmentModal
          assignment={reassignTarget}
          challengeTitle={challengeTitle}
          open={!!reassignTarget}
          onOpenChange={(open) => { if (!open) setReassignTarget(null); }}
        />
      )}
    </>
  );
}
