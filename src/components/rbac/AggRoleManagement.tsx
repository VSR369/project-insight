/**
 * SCR-10: AGG Role Assignment Form for Seeking Org Admin
 * BRD Ref: BR-AGG-001, MOD-05
 * Allows SOA to view Aggregator challenge roles (R4, R5_AGG, R6_AGG, R7_AGG)
 * Invite action is bubbled to parent via onInvite prop (single AssignRoleSheet in parent).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Shield } from "lucide-react";
import { useAggChallengeRoles } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import { RoleTable } from "@/components/rbac/roles/RoleTable";
import { useDeactivateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { RoleReadinessPanel } from "@/components/rbac/RoleReadinessPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AggRoleManagementProps {
  orgId: string;
  onInvite: (roleCode: string) => void;
}

export function AggRoleManagement({ orgId, onInvite }: AggRoleManagementProps) {
  const { data: aggRoles, isLoading: rolesLoading } = useAggChallengeRoles();
  const { data: assignments, isLoading: assignLoading } = useRoleAssignments(orgId);
  const deactivate = useDeactivateRoleAssignment();

  const isLoading = rolesLoading || assignLoading;

  const handleDeactivate = (assignmentId: string) => {
    deactivate.mutate({ id: assignmentId, orgId });
  };

  // Multi-role badge: count how many distinct AGG roles each user holds
  const userRoleCounts = (assignments ?? [])
    .filter((a) => a.status === "active" && aggRoles?.some((r) => r.code === a.role_code))
    .reduce<Record<string, number>>((acc, a) => {
      const key = a.user_email;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const multiRoleUsers = Object.entries(userRoleCounts)
    .filter(([, count]) => count > 1)
    .map(([email, count]) => ({ email, count }));

  return (
    <ErrorBoundary componentName="AggRoleManagement">
      <div className="space-y-5">
        {/* Readiness Panel for AGG model */}
        <RoleReadinessPanel
          orgId={orgId}
          model="agg"
          onNavigateToAssign={onInvite}
        />

        {/* Multi-role users info */}
        {multiRoleUsers.length > 0 && (
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">Multi-role members:</span>
                {multiRoleUsers.map((u) => (
                  <Badge key={u.email} variant="secondary" className="text-xs">
                    {u.email} · {u.count} roles
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AGG Challenge Roles Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Aggregator Challenge Roles
              </CardTitle>
              <Button
                size="sm"
                onClick={() => onInvite("")}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden lg:inline">Assign Role</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!isLoading && aggRoles && (
              <RoleTable
                roles={aggRoles}
                assignments={assignments ?? []}
                onInvite={onInvite}
                onDeactivate={handleDeactivate}
                isDeactivating={deactivate.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
