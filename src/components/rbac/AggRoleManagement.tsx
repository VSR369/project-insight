/**
 * SCR-10: AGG Role Assignment Form for Seeking Org Admin
 * BRD Ref: BR-AGG-001, MOD-05
 * Simplified to match Core Roles tab layout — just RoleTable + multi-role info.
 * RoleReadinessPanel lives at dashboard top widget + dedicated Role Readiness page.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useAggChallengeRoles } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import { RoleTable } from "@/components/rbac/roles/RoleTable";
import { useDeactivateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
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
      <div className="space-y-4">
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

        {/* AGG Challenge Roles — same layout as Core Roles tab */}
        {!isLoading && aggRoles && (
          <RoleTable
            roles={aggRoles}
            assignments={assignments ?? []}
            onInvite={onInvite}
            onDeactivate={handleDeactivate}
            isDeactivating={deactivate.isPending}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
