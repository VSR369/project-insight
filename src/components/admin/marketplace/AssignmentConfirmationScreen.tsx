/**
 * SCR-06: Assignment Confirmation Screen
 * BRD Ref: BR-ASSIGN-004, MOD-02
 * Shown after successful challenge role assignment — team summary
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Mail, Users } from "lucide-react";
import { RoleBadge } from "@/components/admin/marketplace/RoleBadge";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import type { ChallengeAssignmentRow } from "@/hooks/queries/useSolutionRequests";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";

interface AssignmentConfirmationScreenProps {
  challengeTitle: string;
  orgName: string;
  assignments: ChallengeAssignmentRow[];
  mpRoles: SlmRoleCode[];
  onBack: () => void;
  onSendNotification?: () => void;
}

export function AssignmentConfirmationScreen({
  challengeTitle,
  orgName,
  assignments,
  mpRoles,
  onBack,
  onSendNotification,
}: AssignmentConfirmationScreenProps) {
  const { data: availStatuses } = useAvailabilityStatuses();

  const getAvailLabel = (status: string) =>
    availStatuses?.find((s) => s.code === status)?.display_name ?? status;

  const allFilled = mpRoles.every((role) => {
    const count = assignments.filter((a) => a.role_code === role.code).length;
    return count >= role.min_required;
  });

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">
          {allFilled ? "Team Assignment Complete" : "Assignment Updated"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {challengeTitle} — {orgName}
        </p>
      </div>

      {/* Team Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Assigned Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mpRoles.map((role) => {
              const roleAssignments = assignments.filter((a) => a.role_code === role.code);
              const isFilled = roleAssignments.length >= role.min_required;

              return (
                <div key={role.code} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <RoleBadge code={role.code} label={role.display_name} />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${isFilled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}
                    >
                      {roleAssignments.length}/{role.min_required}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {roleAssignments.length > 0 ? (
                      roleAssignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 bg-background rounded px-2 py-1 border text-xs">
                          <span className="font-medium">{a.member_name}</span>
                          <AvailabilityBadge status={a.availability_status} label={getAvailLabel(a.availability_status)} />
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Badge */}
      <div className="flex justify-center">
        <Badge
          className={`text-sm px-4 py-1.5 ${
            allFilled
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {allFilled ? "✓ All roles filled — challenge can proceed" : "⚠ Some roles still missing"}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex flex-col lg:flex-row justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Solution Requests
        </Button>
        {allFilled && onSendNotification && (
          <Button onClick={onSendNotification}>
            <Mail className="h-4 w-4 mr-1.5" />
            Notify Team
          </Button>
        )}
      </div>
    </div>
  );
}
