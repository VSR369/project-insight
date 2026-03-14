/**
 * RoleReadinessTable — Full-page table view for Role Readiness Status
 * Matches reference design: banner + table (ROLE NAME | CODE | STATUS | USER ASSIGNED) + warning bar
 * Used on /org/role-readiness page only. Dashboard widget uses RoleReadinessPanel.
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, UserPlus } from "lucide-react";
import { RoleAssignmentStatusBadge } from "@/components/rbac/roles/RoleAssignmentStatusBadge";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import { useRoleReadiness } from "@/hooks/queries/useRoleReadiness";
import { InitialsAvatar } from "@/components/admin/platform-admins/InitialsAvatar";

interface RoleReadinessTableProps {
  orgId: string;
  model: string;
}

export function RoleReadinessTable({ orgId, model }: RoleReadinessTableProps) {
  const { data: readinessData, isLoading: readinessLoading } = useRoleReadiness(orgId, model);
  const { data: allRoleCodes, isLoading: rolesLoading } = useSlmRoleCodes();
  const { data: assignments, isLoading: assignmentsLoading } = useRoleAssignments(orgId);

  const isLoading = readinessLoading || rolesLoading || assignmentsLoading;
  const readiness = readinessData?.[0] ?? null;
  const isReady = readiness?.overall_status === "ready";
  const filled = readiness?.total_filled ?? 0;
  const total = readiness?.total_required ?? 0;
  const missingCodes = readiness?.missing_roles ?? [];

  // Filter roles for this model (core + model-specific)
  const modelRoles = (allRoleCodes ?? []).filter(
    (r) => r.model_applicability === model || r.model_applicability === "both"
  );

  // Build per-role details with ALL assigned users
  const roleRows = modelRoles.map((role) => {
    const roleAssignments = (assignments ?? []).filter(
      (a) => a.role_code === role.code
    );
    const isMissingPerCache = missingCodes.includes(role.code);

    return {
      code: role.code,
      displayName: role.display_name,
      isMissingPerCache,
      assignments: roleAssignments,
    };
  });

  const missingRoleNames = roleRows
    .filter((r) => r.isMissingPerCache)
    .map((r) => `${r.displayName} (${r.code})`);
  const missingCount = missingCodes.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <Card
        className={
          isReady
            ? "border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-950/20"
            : "border-destructive/30 bg-destructive/5 border-dashed"
        }
      >
        <CardContent className="flex items-center gap-3 py-4 px-5">
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isReady ? "All Roles Filled" : "Roles Missing"}
            </p>
            <p className="text-xs text-muted-foreground">
              {filled} of {total} roles filled.
              {!isReady && " Challenge submission is blocked."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role Table */}
      <Card>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Role Name
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Code
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  User Assigned
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    No roles found for this engagement model.
                  </TableCell>
                </TableRow>
              )}
              {roleRows.map((row) => (
                <TableRow
                  key={row.code}
                  className={
                    row.isMissingPerCache
                      ? "bg-destructive/[0.04] dark:bg-destructive/[0.08]"
                      : ""
                  }
                >
                  <TableCell className="text-sm font-medium text-foreground">
                    {row.displayName}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {row.code}
                  </TableCell>
                  <TableCell>
                    {row.assignments.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {row.assignments.map((a) => (
                          <RoleAssignmentStatusBadge key={a.id} statusCode={a.status} />
                        ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                        <XCircle className="h-4 w-4" />
                        Missing
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.assignments.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {row.assignments.map((a) => (
                          <div key={a.id} className="flex items-center gap-2">
                            <InitialsAvatar name={a.user_name ?? a.user_email} size="sm" />
                            <span className="text-sm text-foreground">{a.user_name ?? a.user_email}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/org/role-management?assign=${row.code}`}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Assign
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Bottom Warning Bar */}
      {!isReady && missingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {missingCount} of {total} roles are missing. Challenge submission is blocked.
          </p>
        </div>
      )}
    </div>
  );
}
